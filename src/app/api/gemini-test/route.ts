import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const model = url.searchParams.get('model') || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const version = url.searchParams.get('version') || 'v1beta';
    const key = process.env.GOOGLE_API_KEY;
    const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS ?? '5000');

    if (!key) {
        return NextResponse.json({ ok: false, error: 'GOOGLE_API_KEY missing' }, { status: 400 });
    }

    const endpoint = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`;
    const prompt = 'Say hello in HTML.';

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
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
        const text = await resp.text();
        return NextResponse.json({ ok: resp.ok, status: resp.status, body: text, model, endpoint });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: String(e?.message ?? e), model, endpoint }, { status: 500 });
    } finally {
        clearTimeout(t);
    }
}
