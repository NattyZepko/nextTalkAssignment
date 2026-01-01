'use client';
import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type RSOCAdProps = {
    query: string;
    locale?: string;
};

export function RSOCAd({ query, locale }: RSOCAdProps) {
    const client = process.env.NEXT_PUBLIC_ADSENSE_CA_PUB;
    const asid = process.env.NEXT_PUBLIC_ADSENSE_ASID;
    const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT;
    const adtest = process.env.NEXT_PUBLIC_ADSENSE_ADTEST === 'true';
    const pageUrlOverride = process.env.NEXT_PUBLIC_ADSENSE_PAGE_URL;
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Force a fresh ad element whenever targeting changes
    // One key that captures both routing + targeting changes
    const searchStr = searchParams?.toString() ?? '';
    const insKey = useMemo(() => {
        const route = `${pathname}?${searchStr}`;
        const id = asid ? `asid:${asid}` : slot ? `slot:${slot}` : 'none';
        return `${route}|${id}|q:${query}|l:${locale ?? ''}`;
    }, [pathname, searchStr, asid, slot, query, locale]);
    const lastPushedKeyRef = useRef<string>('');

    // Push exactly once per rendered <ins> key
    useEffect(() => {
        if (!client || (!asid && !slot)) return;
        if (typeof window === 'undefined') return;
        if (lastPushedKeyRef.current === insKey) return;
        lastPushedKeyRef.current = insKey;
        try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.warn('adsbygoogle push failed', e);
        }
    }, [client, asid, slot, insKey]);

    if (!client || (!asid && !slot)) {
        return (
            <div className="border p-3 rounded bg-yellow-50 text-sm">
                RSOC placeholder — set NEXT_PUBLIC_ADSENSE_CA_PUB and NEXT_PUBLIC_ADSENSE_ASID (or NEXT_PUBLIC_ADSENSE_SLOT).
            </div>
        );
    }

    // Prefer RSOC ASID; fall back to slot if provided
    if (asid) {
        return (
            <ins
                key={insKey}
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client={client}
                data-asid={asid}
                data-ad-format="autorelaxed"
                data-full-width-responsive="true"
                {...(pageUrlOverride ? { 'data-page-url': pageUrlOverride } : {})}
                {...(adtest ? { 'data-adtest': 'on' } : {})}
            />
        );
    }
    return (
        <ins
            key={insKey}
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
            {...(pageUrlOverride ? { 'data-page-url': pageUrlOverride } : {})}
            {...(adtest ? { 'data-adtest': 'on' } : {})}
        />
    );
}
