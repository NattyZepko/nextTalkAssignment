import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const limitParam = url.searchParams.get('limit');
        const limit = Math.min(Math.max(parseInt(limitParam || '25', 10) || 25, 1), 100);
        const rows = await prisma.content.findMany({
            orderBy: { updatedAt: 'desc' },
            take: limit,
            select: {
                id: true,
                q: true,
                locale: true,
                metaTitle: true,
                metaDescription: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return NextResponse.json({ ok: true, items: rows });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message ?? 'content_list_error' }, { status: 500 });
    }
}
