/**
 * SERP ideas generation with caching.
 *
 * `generateSerpIdeas(q, locale)` returns up to 6 relevant article ideas using
 * Gemini or OpenAI. Successful results and sensible defaults are cached in an
 * LRU (`ideasCache`) with a short TTL to reduce repeated API calls. Metrics
 * track invocations, cache hits, and generation time.
 */
import { fetchWithTimeoutAndRetry } from '@/lib/retry';
import { ideasCache } from '@/lib/cache';
import { metrics } from '@/lib/metrics';
import { prisma } from '@/lib/db';

export type IdeaItem = {
    title: string;
    q: string; // keyword-style query
    desc: string; // short description
};

function sanitizeJson<T>(text: string, fallback: T): T {
    try {
        const stripped = text
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();
        const parsed = JSON.parse(stripped);
        return parsed as T;
    } catch {
        return fallback;
    }
}

export async function generateSerpIdeas(q: string, locale: string): Promise<IdeaItem[]> {
    const t0 = Date.now();
    metrics.inc('ideas.generate.invocations');
    const key = `${locale}:${q.toLowerCase()}`;
    const cached = ideasCache.get(key);
    if (cached && Array.isArray(cached) && cached.length) {
        metrics.inc('ideas.cache.hits');
        metrics.timing('ideas.generate.ms', Date.now() - t0);
        return cached;
    }
    // Try DB for deterministic suggestions on cache miss
    try {
        const row = await prisma.serpIdeas.findUnique({ where: { cacheKey: key } });
        if (row) {
            const parsed: IdeaItem[] = JSON.parse(row.items || '[]');
            if (Array.isArray(parsed) && parsed.length) {
                ideasCache.set(key, parsed);
                metrics.timing('ideas.generate.ms', Date.now() - t0);
                return parsed;
            }
        }
    } catch (e) {
        console.error('[ideas] DB read failed; falling back to generation', e);
    }
    const googleKey = process.env.GOOGLE_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const openaiKey = process.env.OPENAI_API_KEY;
    const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const defaultIdeas: IdeaItem[] = [
        { title: `What is ${q}?`, q: `${q} overview`, desc: `Understand the basics and key facts about ${q}.` },
        { title: `${q} tips & tricks`, q: `${q} tips`, desc: `A quick set of practical tips for ${q}.` },
        { title: `Best ${q} resources`, q: `${q} resources`, desc: `Curated links and resources to go deeper on ${q}.` },
        { title: `Common ${q} mistakes`, q: `${q} mistakes`, desc: `Pitfalls to avoid when dealing with ${q}.` },
        { title: `${q} FAQs`, q: `${q} FAQ`, desc: `Frequently asked questions with concise answers.` },
        { title: `Latest ${q} updates`, q: `${q} news`, desc: `Recent developments and news related to ${q}.` },
    ];

    const prompt = `You are a helpful assistant. Given the query "${q}" and locale "${locale}", output a JSON array of 6 relevant article ideas. Each item must be an object: {"title": string, "query": string, "description": string}. The ideas must be highly relevant to the query. Avoid career/salary unless obviously applicable. Return ONLY JSON.`;

    try {
        if (googleKey) {
            const version = geminiModel.startsWith('gemini-2') ? 'v1beta' : 'v1';
            const endpoint = `https://generativelanguage.googleapis.com/${version}/models/${geminiModel}:generateContent?key=${googleKey}`;
            const resp = await fetchWithTimeoutAndRetry(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                }),
                timeoutMs: 4000,
            });
            const json = await resp.json();
            const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            const arr = sanitizeJson<Array<{ title: string; query: string; description: string }>>(text, []);
            if (Array.isArray(arr) && arr.length) {
                const ideas = arr.slice(0, 6).map((it) => ({ title: it.title, q: it.query, desc: it.description }));
                ideasCache.set(key, ideas);
                try {
                    await prisma.serpIdeas.upsert({
                        where: { cacheKey: key },
                        update: { q, locale, items: JSON.stringify(ideas) },
                        create: { q, locale, items: JSON.stringify(ideas), cacheKey: key },
                    });
                } catch (e) {
                    console.error('[ideas] DB write failed (Gemini path)', e);
                }
                metrics.timing('ideas.generate.ms', Date.now() - t0);
                return ideas;
            }
        }
        if (openaiKey) {
            const resp = await fetchWithTimeoutAndRetry('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${openaiKey}`,
                },
                body: JSON.stringify({
                    model: openaiModel,
                    messages: [
                        { role: 'system', content: 'You output strictly JSON when asked.' },
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.4,
                }),
                timeoutMs: 4000,
            });
            const data = await resp.json();
            const text: string = data?.choices?.[0]?.message?.content ?? '';
            const arr = sanitizeJson<Array<{ title: string; query: string; description: string }>>(text, []);
            if (Array.isArray(arr) && arr.length) {
                const ideas = arr.slice(0, 6).map((it) => ({ title: it.title, q: it.query, desc: it.description }));
                ideasCache.set(key, ideas);
                try {
                    await prisma.serpIdeas.upsert({
                        where: { cacheKey: key },
                        update: { q, locale, items: JSON.stringify(ideas) },
                        create: { q, locale, items: JSON.stringify(ideas), cacheKey: key },
                    });
                } catch (e) {
                    console.error('[ideas] DB write failed (OpenAI path)', e);
                }
                metrics.timing('ideas.generate.ms', Date.now() - t0);
                return ideas;
            }
        }
    } catch { }
    metrics.timing('ideas.generate.ms', Date.now() - t0);
    ideasCache.set(key, defaultIdeas);
    try {
        await prisma.serpIdeas.upsert({
            where: { cacheKey: key },
            update: { q, locale, items: JSON.stringify(defaultIdeas) },
            create: { q, locale, items: JSON.stringify(defaultIdeas), cacheKey: key },
        });
    } catch (e) {
        console.error('[ideas] DB write failed (default path)', e);
    }
    return defaultIdeas;
}
