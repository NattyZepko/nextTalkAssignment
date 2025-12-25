import { NextRequest, NextResponse } from 'next/server';
import { generateSerpIdeas } from '@/lib/ideas';
import { DEFAULTS } from '@/lib/validation';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || DEFAULTS.q;
    const locale = searchParams.get('locale') || DEFAULTS.locale;
    const mon = searchParams.get('mon') || DEFAULTS.mon;
    const rac = searchParams.get('rac') || DEFAULTS.rac;
    try {
        const ideas = await generateSerpIdeas(q, locale);
        const items = ideas.map((it) => ({ title: it.title, q: it.q, mon, rac, desc: it.desc }));
        return NextResponse.json({ ok: true, items });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message ?? 'ideas_error' }, { status: 500 });
    }
}
