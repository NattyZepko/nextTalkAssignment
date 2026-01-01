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
    const baseUrlProp = resultsBaseUrl || '';
    const hl = (locale && locale.length >= 2 ? locale.slice(0, 2) : 'en');

    const containerId = useMemo(() => 'afscontainer1', []);

    useEffect(() => {
        const waitForCmp = async () => {
            const deadline = Date.now() + 12000; // wait up to 12s
            // Immediate proceed if explicit local consent accepted
            try {
                const lc = localStorage.getItem('consent');
                if (lc === 'accepted') return true;
            } catch { }
            // Poll for TCF or GPP response
            return await new Promise<boolean>((resolve) => {
                const check = () => {
                    try {
                        if (typeof (window as any).__tcfapi === 'function') {
                            try {
                                (window as any).__tcfapi('getTCData', 2, (data: any, ok: boolean) => {
                                    if (ok) {
                                        resolve(true);
                                    }
                                });
                            } catch { }
                        } else if (typeof (window as any).__gpp === 'function') {
                            try {
                                (window as any).__gpp('ping', (data: any, ok: boolean) => {
                                    if (ok) resolve(true);
                                }, null, '1.1');
                            } catch { }
                        }
                    } catch { }
                    if (Date.now() > deadline) resolve(false);
                };
                const iv = setInterval(() => {
                    check();
                    if (Date.now() > deadline) clearInterval(iv);
                }, 300);
                check();
            });
        };

        let cancelled = false;
        const run = async (tries: number = 0) => {
            if (cancelled) return;
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
            // Resolve absolute resultsPageBaseUrl (required by CSA)
            let resultsBaseAbsolute = '';
            try {
                const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : (siteUrl || '');
                // Prefer explicit prop if it is already absolute
                if (baseUrlProp && /^https?:\/\//.test(baseUrlProp)) {
                    resultsBaseAbsolute = baseUrlProp;
                } else if (origin) {
                    // For search pages, pass base URL without query; CSA will append via resultsPageQueryParam using provided `query`
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
                query, // Explicitly pass the search term so CSA appends `?q=<term>`
            };
            const rsblock: any = {
                container: containerId,
                relatedSearches: 6,
            };
            try {
                // Only push when CMP is ready; otherwise skip to avoid CSA timeout
                const pushedKey = `__afs_relatedsearch_pushed_${containerId}`;
                if (!cmpReady) {
                    console.warn('CMP not ready -> CSA relatedsearch not requested');
                    return;
                }
                // Avoid duplicate pushes across navigations
                if ((window as any)[pushedKey]) return;
                // @ts-ignore
                window._googCsa && window._googCsa('relatedsearch', pageOptions, rsblock);
                (window as any)[pushedKey] = true;
            } catch { }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [pubId, styleId, hl, baseUrlProp, containerId, query]);

    if (!pubId || !styleId) return null;
    return <div id={containerId} />;
}
