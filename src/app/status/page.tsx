import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';
import { metrics } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export default async function StatusPage() {
    let dbOk = false;
    let eventCount: number | null = null;
    try {
        eventCount = await prisma.event.count();
        dbOk = true;
    } catch {
        dbOk = false;
    }

    const env = {
        SITE_URL: process.env.SITE_URL,
        ADSENSE_CLIENT: process.env.NEXT_PUBLIC_ADSENSE_CLIENT ? 'set' : 'missing',
        ADSENSE_ASID: process.env.NEXT_PUBLIC_ADSENSE_ASID ? 'set' : 'missing',
        ADSENSE_SLOT: process.env.NEXT_PUBLIC_ADSENSE_SLOT ? 'set' : 'missing',
        FB_PIXEL: process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ? 'set' : 'missing',
        INMOBI_CHOICE_ID: process.env.NEXT_PUBLIC_INMOBI_CHOICE_ID ? 'set' : 'missing',
        CMP_HOST: process.env.NEXT_PUBLIC_CMP_HOST_OVERRIDE ?? 'unset',
        ENABLE_THIRD_PARTY: process.env.NEXT_PUBLIC_ENABLE_THIRD_PARTY ?? 'unset',
        CACHE_TTL_SEC: process.env.ARTICLE_CACHE_TTL_SECONDS ?? 'unset',
    };

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-semibold">Status</h1>
            <div className="border rounded p-4">
                <h2 className="font-medium">Environment</h2>
                <ul className="list-disc pl-6 text-sm">
                    <li>SITE_URL: {String(env.SITE_URL)}</li>
                    <li>AdSense client: {env.ADSENSE_CLIENT}</li>
                    <li>RSOC ASID: {env.ADSENSE_ASID}</li>
                    <li>AdSense slot: {env.ADSENSE_SLOT}</li>
                    <li>FB Pixel: {env.FB_PIXEL}</li>
                    <li>InMobi Choice ID: {env.INMOBI_CHOICE_ID}</li>
                    <li>CMP host: {env.CMP_HOST}</li>
                    <li>Enable third-party: {env.ENABLE_THIRD_PARTY}</li>
                    <li>Cache TTL (sec): {env.CACHE_TTL_SEC}</li>
                </ul>
            </div>
            <div className="border rounded p-4">
                <h2 className="font-medium">Metrics</h2>
                <ul className="list-disc pl-6">
                    <li>Tracked Events: {metrics.getCounter('track.events')}</li>
                    <li>Track Errors: {metrics.getCounter('track.errors')}</li>
                    <li>AI Requests: {metrics.getCounter('ai.generate.invocations')}</li>
                    <li>AI Cache Hits: {metrics.getCounter('ai.cache.hits')}</li>
                    <li>Ideas Requests: {metrics.getCounter('ideas.generate.invocations')}</li>
                    <li>Ideas Cache Hits: {metrics.getCounter('ideas.cache.hits')}</li>
                    <li>DB create avg (ms): {metrics.getTimingAvg('db.event.create.ms')}</li>
                    <li>AI generate avg (ms): {metrics.getTimingAvg('ai.generate.ms')}</li>
                    <li>Ideas generate avg (ms): {metrics.getTimingAvg('ideas.generate.ms')}</li>
                </ul>
            </div>
            <div className="border rounded p-4">
                <h2 className="font-medium">Database</h2>
                <p className="text-sm">Connected: {dbOk ? 'yes' : 'no'}</p>
                <p className="text-sm">Event count: {eventCount ?? 'n/a'}</p>
            </div>
        </div>
    );
}
