'use client';
import { useEffect, useMemo, useRef } from 'react';

declare global {
    interface Window {
        _googCsa?: any;
    }
}

type RelatedSearchProps = {
    query: string;
    locale?: string;
    resultsBaseUrl?: string;
    containerId?: string; // optional custom container id to avoid collisions
};

export function RelatedSearchOnContent({ query, locale, resultsBaseUrl, containerId: containerIdProp }: RelatedSearchProps) {
    const pubId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    const styleId = process.env.NEXT_PUBLIC_ADSENSE_ASID || process.env.NEXT_PUBLIC_ADSENSE_STYLE_ID;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const baseUrlProp = resultsBaseUrl || '';
    const hl = (locale && locale.length >= 2 ? locale.slice(0, 2) : 'en');
    const containerId = useMemo(() => containerIdProp || 'afscontainer1', [containerIdProp]);
    const lastKeyRef = useRef<string>('');

    if (process.env.NODE_ENV !== 'production') {
        try {
            console.log('AFS pubId:', pubId);
        } catch { }
    }

    useEffect(() => {
        let isCancelled = false;
        const waitForCmp = async () => {
            const deadline = Date.now() + 12000; // wait up to 12s
            // Immediate proceed if explicit local consent accepted
            try {
                const lc = localStorage.getItem('consent');
                if (lc === 'accepted') return true;
            } catch { }
            // Poll for TCF or GPP response; resolve exactly once and clear interval
            return await new Promise<boolean>((resolve) => {
                let done = false;
                let iv: any;
                const resolveOnce = (val: boolean) => {
                    if (done) return;
                    done = true;
                    try { clearInterval(iv); } catch { }
                    resolve(val);
                };
                const check = () => {
                    if (isCancelled) return resolveOnce(false);
                    try {
                        if (typeof (window as any).__tcfapi === 'function') {
                            try {
                                // Treat CMP responding as sufficient readiness (pragmatic approach)
                                (window as any).__tcfapi('ping', 2, (_data: any, ok: boolean) => {
                                    if (ok) resolveOnce(true);
                                });
                                return;
                            } catch { }
                        }
                        if (typeof (window as any).__gpp === 'function') {
                            try {
                                (window as any).__gpp('ping', (_data: any, ok: boolean) => {
                                    if (ok) resolveOnce(true);
                                });
                                return;
                            } catch { }
                        }
                    } catch { }
                    if (Date.now() > deadline) resolveOnce(false);
                };
                iv = setInterval(check, 300);
                check();
            });
        };

        let cancelled = false;
        const run = async (tries: number = 0) => {
            if (isCancelled) return;
            // Ensure container exists before requesting CSA
            const el = document.getElementById(containerId);
            if (!el) {
                if (tries < 20) setTimeout(() => run(tries + 1), 250);
                return;
            }

            const cmpReady = await waitForCmp();
            // Ensure stub exists
            try {
                if (typeof window._googCsa !== 'function') {
                    window._googCsa = function () {
                        (window._googCsa.q = window._googCsa.q || []).push(arguments);
                    };
                    window._googCsa.t = Date.now();
                }
            } catch { }

            // Only proceed if CMP ready; otherwise skip to avoid CSA timeout
            if (!cmpReady) {
                console.warn('CMP not ready -> CSA relatedsearch not requested');
                return;
            }

            // Load AFS script once (after CMP is ready)
            const scriptId = 'afs-adsense-search-js';
            if (!document.getElementById(scriptId)) {
                const s = document.createElement('script');
                s.id = scriptId;
                s.async = true;
                s.src = 'https://www.google.com/adsense/search/ads.js';
                document.head.appendChild(s);
            }

            // Prepare options and push relatedsearch unit
            // Resolve absolute resultsPageBaseUrl (required by CSA)
            let resultsBaseAbsolute = '';
            try {
                const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : (siteUrl || '');
                // Prefer explicit prop if it is already absolute; otherwise build absolute base without query
                if (baseUrlProp && /^https?:\/\//.test(baseUrlProp)) {
                    resultsBaseAbsolute = baseUrlProp;
                } else if (origin) {
                    resultsBaseAbsolute = origin.replace(/\/$/, '') + '/search';
                } else if (siteUrl) {
                    resultsBaseAbsolute = siteUrl.replace(/\/$/, '') + '/search';
                }
            } catch { }

            const pageOptions: any = {
                pubId,
                relatedSearchTargeting: 'content',
                hl,
                styleId,
                resultsPageBaseUrl: resultsBaseAbsolute || (siteUrl ? siteUrl.replace(/\/$/, '') + '/search' : ''),
                resultsPageQueryParam: 'q',
                // RSOC: do not force a query unless explicitly recommended for your setup
            };
            const rsblock: any = {
                container: containerId,
                relatedSearches: 6,
            };
            try {
                // Avoid duplicate pushes across navigations using a ref instead of global window keys
                const pathname = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '';
                const key = `${containerId}_${pathname}_${query}`;
                if (lastKeyRef.current === key) return;
                // @ts-ignore
                window._googCsa && window._googCsa('relatedsearch', pageOptions, rsblock);
                lastKeyRef.current = key;
            } catch { }
        };
        run();
        return () => {
            isCancelled = true;
        };
    }, [pubId, styleId, hl, baseUrlProp, containerId, query]);

    if (!pubId || !styleId) return null;
    return <div id={containerId} />;
}
