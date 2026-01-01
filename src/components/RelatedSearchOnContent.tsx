'use client';
import { useEffect, useMemo } from 'react';

declare global {
    interface Window {
        _googCsa?: any;
    }
}

type RelatedSearchProps = {
    query: string;
    locale?: string;
    resultsBaseUrl?: string;
};

export function RelatedSearchOnContent({ query, locale, resultsBaseUrl }: RelatedSearchProps) {
    const pubId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    const styleId = process.env.NEXT_PUBLIC_ADSENSE_ASID || process.env.NEXT_PUBLIC_ADSENSE_STYLE_ID;
    const siteUrl = process.env.SITE_URL || '';
    const baseUrl = (resultsBaseUrl || (siteUrl ? siteUrl.replace(/\/$/, '') + '/search' : '/search'));
    const hl = (locale && locale.length >= 2 ? locale.slice(0, 2) : 'en');

    const containerId = useMemo(() => 'afscontainer1', []);

    useEffect(() => {
        // Ensure stub exists
        try {
            if (typeof window._googCsa !== 'function') {
                window._googCsa = function () {
                    (window._googCsa.q = window._googCsa.q || []).push(arguments);
                };
                window._googCsa.t = Date.now();
            }
        } catch { }

        // Load AFS script once
        const scriptId = 'afs-adsense-search-js';
        if (!document.getElementById(scriptId)) {
            const s = document.createElement('script');
            s.id = scriptId;
            s.async = true;
            s.src = 'https://www.google.com/adsense/search/ads.js';
            document.head.appendChild(s);
        }

        // Prepare options and push relatedsearch unit
        const pageOptions: any = {
            pubId,
            relatedSearchTargeting: 'content',
            hl,
            styleId,
            resultsPageBaseUrl: baseUrl,
            resultsPageQueryParam: 'q',
        };
        const rsblock: any = {
            container: containerId,
            relatedSearches: 6,
        };
        try {
            // @ts-ignore
            window._googCsa && window._googCsa('relatedsearch', pageOptions, rsblock);
        } catch { }
    }, [pubId, styleId, hl, baseUrl, containerId, query]);

    if (!pubId || !styleId) return null;
    return <div id={containerId} />;
}
