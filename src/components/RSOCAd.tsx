'use client';
import { useEffect, useMemo, useRef } from 'react';

type RSOCAdProps = {
    query: string;
    locale?: string;
};

export function RSOCAd({ query, locale }: RSOCAdProps) {
    const client = process.env.NEXT_PUBLIC_ADSENSE_CA_PUB;
    const asid = process.env.NEXT_PUBLIC_ADSENSE_ASID;
    const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT;
    const adtest = process.env.NEXT_PUBLIC_ADSENSE_ADTEST === 'true' || process.env.NODE_ENV !== 'production';
    const pageUrlOverride = process.env.NEXT_PUBLIC_ADSENSE_PAGE_URL;
    const elRef = useRef<HTMLModElement | null>(null);

    // Force a fresh ad element whenever targeting changes
    const unitKey = useMemo(() => {
        const id = asid ? `asid:${asid}` : slot ? `slot:${slot}` : 'none';
        return `${id}-${query}-${locale ?? ''}`;
    }, [asid, slot, query, locale]);

    useEffect(() => {
        // Load AdSense script once
        const scriptId = 'adsbygoogle-js';
        if (!document.getElementById(scriptId)) {
            const s = document.createElement('script');
            s.id = scriptId;
            s.async = true;
            s.src = client
                ? `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
                : 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
            (s as any).crossOrigin = 'anonymous';
            document.head.appendChild(s);
        }
        // Push ad only if the current <ins> hasn't been initialized yet
        try {
            const initialized = elRef.current?.getAttribute('data-adsbygoogle-status');
            if (!initialized) {
                // @ts-ignore
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch { }
    }, [unitKey, client]);

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
                key={unitKey}
                ref={elRef}
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client={client}
                data-asid={asid}
                data-ad-format="autorelaxed"
                data-full-width-responsive="true"
                {...(pageUrlOverride ? { 'data-page-url': pageUrlOverride } : {})}
                {...(adtest ? { 'data-adtest': 'on' } : {})}
            ></ins>
        );
    }
    return (
        <ins
            key={unitKey}
            ref={elRef}
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
            {...(pageUrlOverride ? { 'data-page-url': pageUrlOverride } : {})}
            {...(adtest ? { 'data-adtest': 'on' } : {})}
        ></ins>
    );
}
