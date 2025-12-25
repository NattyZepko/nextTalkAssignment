import { NextRequest, NextResponse } from 'next/server';
import { sendLead } from '@/lib/fb';
import { metrics } from '@/lib/metrics';

function parseCookies(header: string | null): Record<string, string> {
    const out: Record<string, string> = {};
    if (!header) return out;
    const parts = header.split(';');
    for (const p of parts) {
        const [k, v] = p.split('=');
        if (k && v) out[k.trim()] = decodeURIComponent(v.trim());
    }
    return out;
}

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const pixelId = process.env.FACEBOOK_PIXEL_ID;
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!pixelId || !accessToken) {
        return NextResponse.json({ error: 'Facebook Pixel/Token missing' }, { status: 400 });
    }
    try {
        const headers = req.headers;
        const ipHeader = headers.get('x-forwarded-for') || headers.get('forwardedfor') || headers.get('x-real-ip');
        const ip = body.ip || (ipHeader ? ipHeader.split(',')[0].trim() : undefined);
        const userAgent = body.userAgent || headers.get('user-agent') || undefined;
        const cookies = parseCookies(headers.get('cookie'));
        const fbc = body.fbc || cookies['_fbc'];
        const fbp = body.fbp || cookies['_fbp'];
        const eventSourceUrl = body.eventSourceUrl || req.url || process.env.SITE_URL;
        const click_id = body.click_id ?? body.clickId ?? body.gclid ?? body.fbclid;
        const source = body.source ?? body.channel ?? 'web';
        const testEventCode = process.env.FACEBOOK_TEST_EVENT_CODE || undefined;

        const resp = await sendLead({
            pixelId,
            accessToken,
            eventSourceUrl,
            eventTime: body.eventTime,
            userAgent,
            ip,
            fbc,
            fbp,
            click_id,
            channel: body.channel ?? 'web',
            keyword: body.keyword ?? body.q ?? '',
            ad_creative: body.ad_creative ?? body.rac ?? '',
            source,
            testEventCode,
        });
        metrics.inc('fb.lead.sent');
        return NextResponse.json({ ok: true, resp });
    } catch (e: any) {
        metrics.inc('fb.lead.errors');
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
