/**
 * AI content generation utilities.
 *
 * Provides `generateArticleHtml(q, locale)` which produces sanitized, HTML-only
 * article content using Google Gemini (with smart retries/backoff/fallbacks) or OpenAI.
 * Results are cached in an LRU (`contentCache`) keyed by locale+query, with basic
 * relevance checking to avoid drift. Metrics record invocations, cache hits, and duration.
 */
import { contentCache } from '@/lib/cache';
import { metrics } from '@/lib/metrics';
import { fetchWithTimeoutAndRetry } from '@/lib/retry';
import { setGeminiStatus, getGeminiBackoffUntil, setGeminiBackoffUntil } from '@/lib/geminiStatus';
import crypto from 'node:crypto';

export type Generated = {
    html: string;
    metaTitle?: string;
    metaDescription?: string;
};

function cacheKey(q: string, locale: string) {
    return crypto.createHash('sha256').update(`${locale}|${q}`).digest('hex');
}

function timeoutSignal(ms: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
}

function isRelevant(q: string, html: string): boolean {
    try {
        const text = (html || '').toLowerCase();
        const tokens = q
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((t) => t.length >= 4); // require meaningful tokens
        const h1Match = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const h1Text = h1Match ? h1Match[1].toLowerCase() : '';
        const hasTokenOverall = tokens.some((t) => text.includes(t));
        const hasTokenInH1 = tokens.some((t) => h1Text.includes(t));
        const driftSignals = ['web developer', 'web development', 'career path', 'salary'];
        const hasDrift = driftSignals.some((s) => text.includes(s)) && !tokens.some((t) => t.includes('developer'));
        return (hasTokenOverall || hasTokenInH1) && !hasDrift;
    } catch {
        return true;
    }
}

function deriveMetaFromHtml(html: string, q: string, locale: string): { title: string; description: string } {
    const fallbackTitle = `${q} — Article`;
    const fallbackDesc = `Generated content for ${q} in ${locale}.`;
    try {
        const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.trim();
        const p = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]?.trim();
        const title = h1 && h1.length > 3 ? h1 : fallbackTitle;
        const description = p && p.length > 20 ? p.replace(/<[^>]+>/g, '').slice(0, 160) : fallbackDesc;
        return { title, description };
    } catch {
        return { title: fallbackTitle, description: fallbackDesc };
    }
}

async function strictRegenerate(q: string, locale: string): Promise<Generated | null> {
    try {
        const googleKey = process.env.GOOGLE_API_KEY;
        const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
        const openaiKey = process.env.OPENAI_API_KEY;
        const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

        const strictPrompt = `You MUST generate an article ONLY about "${q}" in locale "${locale}". Respond strictly with valid HTML starting with <article>. Do not include any explanations, prefaces, or code fences. Include headings (h1-h3) and natural related search terms for "${q}".`;

        const sanitize = (s: string) => {
            let t = (s || '').trim();
            t = t.replace(/^```[a-zA-Z]*\s*/i, '');
            t = t.replace(/```\s*$/i, '');
            t = t.replace(/```[a-zA-Z]*\s*/g, '');
            t = t.replace(/```/g, '');
            t = t.replace(/^Absolutely![^<]*<\s*/i, '<');
            t = t.replace(/^Sure\s*,?[^<]*<\s*/i, '<');
            const m = t.match(/<article[\s\S]*?<\/article>/i);
            if (m) return m[0];
            const h = t.indexOf('<h1');
            if (h >= 0) t = t.slice(h);
            return t;
        };

        if (googleKey) {
            const version = geminiModel.startsWith('gemini-2') ? 'v1beta' : 'v1';
            const endpoint = `https://generativelanguage.googleapis.com/${version}/models/${geminiModel}:generateContent?key=${googleKey}`;
            const resp = await fetchWithTimeoutAndRetry(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: strictPrompt }] }] }),
                timeoutMs: 3000,
            });
            const json = await resp.json();
            const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            const cleaned = sanitize(text);
            const html = cleaned && cleaned.length > 0 ? (cleaned.startsWith('<article') ? cleaned : `<article>${cleaned}</article>`) : '';
            if (html) {
                return {
                    html,
                    metaTitle: `${q} — Article`,
                    metaDescription: `Generated content for ${q} in ${locale}.`,
                };
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
                        { role: 'system', content: 'Return only valid HTML starting with <article>.' },
                        { role: 'user', content: strictPrompt },
                    ],
                    temperature: 0.3,
                }),
                timeoutMs: 3000,
            });
            const data = await resp.json();
            const text: string = data?.choices?.[0]?.message?.content ?? '';
            const cleaned = sanitize(text);
            const html = cleaned && cleaned.length > 0 ? (cleaned.startsWith('<article') ? cleaned : `<article>${cleaned}</article>`) : '';
            if (html) {
                return {
                    html,
                    metaTitle: `${q} — Article`,
                    metaDescription: `Generated content for ${q} in ${locale}.`,
                };
            }
        }
    } catch { }
    return null;
}

export async function generateArticleHtml(q: string, locale: string): Promise<Generated> {
    console.log('[AI] generateArticleHtml start', { q, locale });
    const t0 = Date.now();
    metrics.inc('ai.generate.invocations');
    const key = cacheKey(q, locale);
    const cached = contentCache.get(key);
    if (cached) {
        // Validate cached content relevance; evict if off-topic
        if (!isRelevant(q, cached.html)) {
            console.warn('[AI] cache evicted due to irrelevance', { key, q, locale });
            contentCache.delete(key);
        } else {
            console.log('[AI] cache hit (relevant)', { key });
            metrics.inc('ai.cache.hits');
            metrics.timing('ai.generate.ms', Date.now() - t0);
            if (!cached.metaTitle || !cached.metaDescription) {
                const meta = deriveMetaFromHtml(cached.html, q, locale);
                cached.metaTitle = cached.metaTitle || meta.title;
                cached.metaDescription = cached.metaDescription || meta.description;
            }
            return cached;
        }
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const googleKey = process.env.GOOGLE_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const geminiTimeout = Number(process.env.GEMINI_TIMEOUT_MS ?? '60000');

    let result: Generated;
    if (!openaiKey && !googleKey) {
        result = {
            html: `<article><h1>${q}</h1><p>Locale: ${locale}</p><p>AI key missing, showing placeholder content.</p></article>`,
            metaTitle: undefined,
            metaDescription: undefined,
        };
    } else if (googleKey) {
        // If global backoff is active, prefer OpenAI if available, else fallback placeholder
        const now = Date.now();
        const until = getGeminiBackoffUntil();
        if (until && now < until) {
            const remaining = Math.ceil((until - now) / 1000);
            setGeminiStatus({ ok: false, statusCode: 429, message: `Gemini backoff active (${remaining}s)`, retrySeconds: remaining });
            if (openaiKey) {
                try {
                    const prompt = `Write an SEO-optimized article (1000 words) in ${locale} about "${q}". Include headings, meta title and meta description. Avoid harmful or copyrighted content. Natural related search terms.`;
                    const resp = await fetchWithTimeoutAndRetry('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${openaiKey}`,
                        },
                        body: JSON.stringify({
                            model: openaiModel,
                            messages: [
                                { role: 'system', content: 'You are a helpful content generator.' },
                                { role: 'user', content: prompt },
                            ],
                            temperature: 0.7,
                        }),
                        timeoutMs: 2500,
                    });
                    const json = (await resp.json()) as any;
                    const text = (json?.choices?.[0]?.message?.content ?? '').trim();
                    const safeText = text && text.length > 0 ? text : `<h1>${q}</h1><p>Locale: ${locale}</p><p>Generated content unavailable; showing placeholder.</p>`;
                    result = {
                        html: `<article>${safeText.replace(/\n/g, '\n')}</article>`,
                        metaTitle: undefined,
                        metaDescription: undefined,
                    };
                    contentCache.set(key, result);
                    return result;
                } catch { }
            }
            result = {
                html: `<article><h1>${q}</h1><p>Locale: ${locale}</p><p>Gemini rate limit; showing placeholder.</p></article>`,
                metaTitle: undefined,
                metaDescription: undefined,
            };
            contentCache.set(key, result);
            return result;
        }
        const prompt = `You are a content generator. Respond ONLY with valid HTML for an article about "${q}" in locale "${locale}". Do not include explanations, prefaces, or code fences. Output must start with <article> and contain headings (h1-h3), and include natural related search terms. Avoid harmful or copyrighted content.`;

        const parseRetrySeconds = (body: any): number | undefined => {
            try {
                const details = body?.error?.details;
                if (Array.isArray(details)) {
                    for (const d of details) {
                        if (d?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
                            const raw = d?.retryDelay as string | undefined; // e.g., "44s"
                            if (raw && /s$/.test(raw)) {
                                const secs = parseInt(raw.replace(/s$/, ''), 10);
                                if (!Number.isNaN(secs)) return secs;
                            }
                        }
                    }
                }
            } catch { }
            return undefined;
        };

        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

        const tryModel = async (model: string) => {
            const version = model.startsWith('gemini-2') ? 'v1beta' : 'v1';
            const endpoint = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${googleKey}`;
            let attempt = 0;
            const maxAttempts = 3;
            while (attempt < maxAttempts) {
                attempt++;
                const controller = new AbortController();
                const attemptTimeout = Math.max(1000, Math.floor(geminiTimeout * (1 + 0.5 * (attempt - 1))));
                const timer = setTimeout(() => controller.abort(), attemptTimeout);
                try {
                    const resp = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [
                                {
                                    role: 'user',
                                    parts: [{ text: prompt }],
                                },
                            ],
                        }),
                        signal: controller.signal,
                    });
                    if (!resp.ok) {
                        const text = await resp.text().catch(() => '');
                        let parsed: any = undefined;
                        try { parsed = JSON.parse(text); } catch { }
                        const retrySec = parsed ? parseRetrySeconds(parsed) : undefined;
                        setGeminiStatus({ ok: false, model, version, statusCode: resp.status, message: parsed?.error?.message ?? text, retrySeconds: retrySec });
                        if (resp.status === 429) {
                            // Set global backoff (use suggested or default 60s), but cap at 5 minutes
                            const waitSeconds = Math.min(Math.max(retrySec ?? 60, 1), 300);
                            setGeminiBackoffUntil(Date.now() + waitSeconds * 1000);
                        }
                        if (resp.status === 429 && retrySec && attempt < maxAttempts) {
                            // Honor suggested backoff; cap at 15s to avoid overly long waits.
                            const waitMs = Math.min(retrySec, 15) * 1000;
                            await sleep(waitMs);
                            continue;
                        }
                        const err: any = new Error(`HTTP ${resp.status}`);
                        err.status = resp.status;
                        throw err;
                    }
                    const json = (await resp.json()) as any;
                    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                    const sanitize = (s: string) => {
                        let t = (s || '').trim();
                        // Strip leading/trailing code fences like ```html ... ```
                        t = t.replace(/^```[a-zA-Z]*\s*/i, '');
                        t = t.replace(/```\s*$/i, '');
                        // Remove any remaining triple backticks
                        t = t.replace(/```[a-zA-Z]*\s*/g, '');
                        t = t.replace(/```/g, '');
                        // Remove common chatty prefaces
                        t = t.replace(/^Absolutely![^<]*<\s*/i, '<');
                        t = t.replace(/^Sure\s*,?[^<]*<\s*/i, '<');
                        // Extract inside <article> ... </article> if present
                        const m = t.match(/<article[\s\S]*?<\/article>/i);
                        if (m) return m[0];
                        // If starts after first heading, keep from first <h1>
                        const h = t.indexOf('<h1');
                        if (h >= 0) t = t.slice(h);
                        return t;
                    };
                    const cleaned = sanitize(text);
                    const safeText = cleaned && cleaned.length > 0 ? cleaned : `<h1>${q}</h1><p>Locale: ${locale}</p><p>Generated content unavailable; showing placeholder.</p>`;
                    setGeminiStatus({ ok: true, model, version, statusCode: 200 });
                    console.log('[AI] Gemini success', { model, version });
                    return {
                        html: safeText.startsWith('<article') ? safeText : `<article>${safeText}</article>`,
                        metaTitle: undefined,
                        metaDescription: undefined,
                    } as Generated;
                } catch (err: any) {
                    const msg = String(err?.message ?? '');
                    const aborted = err?.name === 'AbortError' || msg.includes('aborted');
                    if (aborted) {
                        setGeminiStatus({ ok: false, model, version, statusCode: 0, message: `Aborted after ${attemptTimeout}ms`, retrySeconds: undefined });
                    }
                    throw err;
                } finally {
                    clearTimeout(timer);
                }
            }
            // If we exit loop without success, throw
            const err: any = new Error('Gemini retries exhausted');
            err.status = 429;
            throw err;
        };
        try {
            result = await tryModel(geminiModel);
        } catch (err: any) {
            console.error('Gemini primary model failed', { model: geminiModel, err: String(err?.message ?? err) });
            const fallbacks = [
                'gemini-2.5-pro',
                'gemini-2.5-flash-lite',
                'gemini-2.0-flash',
                'gemini-2.0-flash-001',
                'gemini-2.0-flash-lite',
                'gemini-2.0-flash-lite-001',
                'gemini-1.5-flash',
                'gemini-1.5-flash-latest',
                'gemini-1.5-pro',
                'gemini-pro',
            ];
            let succeeded: Generated | null = null;
            for (const m of fallbacks) {
                try {
                    succeeded = await tryModel(m);
                    console.warn('Gemini fallback succeeded', { model: m });
                    break;
                } catch (e3: any) {
                    console.error('Gemini fallback model failed', { model: m, err: String(e3?.message ?? e3) });
                }
            }
            result = succeeded ?? {
                html: `<article><h1>${q}</h1><p>Locale: ${locale}</p><p>Gemini error; showing placeholder.</p></article>`,
                metaTitle: undefined,
                metaDescription: undefined,
            };
        }
    } else {
        try {
            const prompt = `You are a content generator. Respond ONLY with valid HTML for an article about "${q}" in locale "${locale}". Do not include explanations, prefaces, or code fences. Output must start with <article> and contain headings (h1-h3), and include natural related search terms. Avoid harmful or copyrighted content.`;
            const resp = await fetchWithTimeoutAndRetry('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${openaiKey}`,
                },
                body: JSON.stringify({
                    model: openaiModel,
                    messages: [
                        { role: 'system', content: 'You are a helpful content generator.' },
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.7,
                }),
                timeoutMs: 2500,
            });
            const json = (await resp.json()) as any;
            const text = (json?.choices?.[0]?.message?.content ?? '').trim();
            const sanitize = (s: string) => {
                let t = (s || '').trim();
                t = t.replace(/^```[a-zA-Z]*\s*/i, '');
                t = t.replace(/```\s*$/i, '');
                t = t.replace(/```[a-zA-Z]*\s*/g, '');
                t = t.replace(/```/g, '');
                t = t.replace(/^Absolutely![^<]*<\s*/i, '<');
                t = t.replace(/^Sure\s*,?[^<]*<\s*/i, '<');
                const m = t.match(/<article[\s\S]*?<\/article>/i);
                if (m) return m[0];
                const h = t.indexOf('<h1');
                if (h >= 0) t = t.slice(h);
                return t;
            };
            const cleaned = sanitize(text);
            const safeText = cleaned && cleaned.length > 0 ? cleaned : `<h1>${q}</h1><p>Locale: ${locale}</p><p>Generated content unavailable; showing placeholder.</p>`;
            result = {
                html: safeText.startsWith('<article') ? safeText : `<article>${safeText}</article>`,
                metaTitle: undefined,
                metaDescription: undefined,
            };
        } catch (e) {
            result = {
                html: `<article><h1>${q}</h1><p>Locale: ${locale}</p><p>Content service error; showing placeholder.</p></article>`,
                metaTitle: undefined,
                metaDescription: undefined,
            };
        }
    }

    // If content appears off-topic, try one-time strict regeneration; else fallback to placeholder
    if (!isRelevant(q, result.html)) {
        console.warn('[AI] off-topic detected; attempting strict retry', { q, locale });
        const strict = await strictRegenerate(q, locale);
        if (strict && isRelevant(q, strict.html)) {
            console.log('[AI] strict retry succeeded', { q, locale });
            result = strict;
        } else {
            console.warn('[AI] strict retry failed; using placeholder', { q, locale });
            result = {
                html: `<article><h1>${q}</h1><p>Generated content unavailable or off-topic; showing placeholder targeted to your query.</p></article>`,
                metaTitle: undefined,
                metaDescription: undefined,
            };
        }
    }
    // Derive meta title/description if missing
    if (!result.metaTitle || !result.metaDescription) {
        const meta = deriveMetaFromHtml(result.html, q, locale);
        result.metaTitle = result.metaTitle || meta.title;
        result.metaDescription = result.metaDescription || meta.description;
    }
    contentCache.set(key, result);
    metrics.timing('ai.generate.ms', Date.now() - t0);
    return result;
}

/**
 * Peek at cached generated article without triggering a new generation.
 */
export function peekArticleCache(q: string, locale: string): Generated | undefined {
    const key = cacheKey(q, locale);
    const cached = contentCache.get(key);
    return cached;
}
