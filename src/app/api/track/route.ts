import { NextRequest, NextResponse } from 'next/server';
import { trackEventSchema } from '@/lib/validation';
import { storeEvent } from '@/lib/track';
import { getIp } from '@/lib/ip';

export async function POST(req: NextRequest) {
    const ip = getIp(req);
    const ua = req.headers.get('user-agent') ?? undefined;
    // Attempt to enrich GEO from common hosting headers (Vercel/Cloudflare or custom proxies)
    const geoCountry =
        req.headers.get('x-vercel-ip-country') ||
        req.headers.get('cf-ipcountry') ||
        req.headers.get('x-country') ||
        undefined;
    const geoRegion =
        req.headers.get('x-vercel-ip-country-region') ||
        req.headers.get('x-region') ||
        undefined;
    const geoCity = req.headers.get('x-vercel-ip-city') || req.headers.get('x-city') || undefined;
    const json = await req.json().catch(() => ({}));
    const parsed = trackEventSchema.safeParse({ ...json, ip, userAgent: ua, geoCountry, geoRegion, geoCity });
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    await storeEvent(parsed.data);
    return NextResponse.json({ ok: true });
}
