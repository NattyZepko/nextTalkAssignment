import { prisma } from '@/lib/db';
import { TrackEventInput } from '@/lib/validation';
import { metrics } from './metrics';

/**
 * Persist tracking events to the database.
 *
 * Stores enriched client/server metadata from `/api/track` in the `Event`
 * table. Failures are logged and swallowed to avoid disrupting user flow.
 */

export async function storeEvent(input: TrackEventInput) {
    const start = Date.now();
    try {
        await prisma.event.create({
            data: {
                clickId: input.clickId,
                gclid: input.gclid,
                fbclid: input.fbclid,
                channel: input.channel,
                query: input.q,
                locale: input.locale,
                userAgent: input.userAgent,
                ip: input.ip,
                geoCountry: input.geoCountry,
                geoRegion: input.geoRegion,
                geoCity: input.geoCity,
                referrerAdCreative: input.rac,
                params: input.params ? JSON.stringify(input.params) : undefined,
            },
        });
        metrics.inc('track.events');
        metrics.timing('db.event.create.ms', Date.now() - start);
    } catch (e) {
        metrics.inc('track.errors');
        metrics.timing('db.event.create.ms', Date.now() - start);
        console.error('[track] storeEvent error', e);
        // swallow to avoid blocking user response
    }
}
