import { z } from 'zod';

// Default values used across the app
export const DEFAULTS = {
    q: 'web developer',
    locale: 'en_US',
    mon: 'ads',
    rac: 'defaultCreative',
    channel: 'web',
};

export const searchParamsSchema = z.object({
    q: z.string().min(1).default(DEFAULTS.q),
    locale: z.string().min(2).default(DEFAULTS.locale),
    mon: z.string().default(DEFAULTS.mon),
    rac: z.string().default(DEFAULTS.rac),
});

export const trackEventSchema = z.object({
    clickId: z.string().optional(),
    gclid: z.string().optional(),
    fbclid: z.string().optional(),
    clickid: z.string().optional(),
    channel: z.string().default(DEFAULTS.channel),
    q: z.string().default(''),
    locale: z.string().default(DEFAULTS.locale),
    userAgent: z.string().optional(),
    ip: z.string().optional(),
    geoCountry: z.string().optional(),
    geoRegion: z.string().optional(),
    geoCity: z.string().optional(),
    rac: z.string().default(''),
    params: z.record(z.any()).default({}),
});

export type TrackEventInput = z.infer<typeof trackEventSchema>;
