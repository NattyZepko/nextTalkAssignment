import { NextRequest, NextResponse } from 'next/server';
import { searchParamsSchema, DEFAULTS } from '@/lib/validation';
import { generateArticleHtml } from '@/lib/ai';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const parsed = searchParamsSchema.safeParse(params);
    const { q = DEFAULTS.q, locale = DEFAULTS.locale } = parsed.success ? parsed.data : {} as any;
    const content = await generateArticleHtml(q, locale);
    return NextResponse.json(content);
}
