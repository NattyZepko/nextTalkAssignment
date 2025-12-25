import { NextResponse } from 'next/server';
import { getGeminiStatus, getGeminiBackoffUntil } from '@/lib/geminiStatus';

export async function GET() {
    const s = getGeminiStatus();
    const until = getGeminiBackoffUntil();
    return NextResponse.json({ status: s ?? null, backoffUntilTs: until ?? null });
}
