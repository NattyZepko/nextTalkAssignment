import { NextResponse } from 'next/server';

export async function GET() {
    const key = process.env.GOOGLE_API_KEY;
    const version = process.env.GEMINI_LIST_VERSION || 'v1beta';
    if (!key) {
        return NextResponse.json({ ok: false, error: 'GOOGLE_API_KEY missing' }, { status: 400 });
    }
    const endpoint = `https://generativelanguage.googleapis.com/${version}/models?key=${key}`;
    try {
        const resp = await fetch(endpoint, { method: 'GET' });
        const json = await resp.json();
        return NextResponse.json({ ok: resp.ok, status: resp.status, models: json }, { status: resp.status });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
    }
}
