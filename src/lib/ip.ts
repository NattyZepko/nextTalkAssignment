import type { NextRequest } from 'next/server';

export function getIp(req: NextRequest): string | undefined {
    const xfwd = req.headers.get('x-forwarded-for');
    if (xfwd) return xfwd.split(',')[0].trim();
    const xreal = req.headers.get('x-real-ip');
    if (xreal) return xreal.trim();
    return undefined;
}
