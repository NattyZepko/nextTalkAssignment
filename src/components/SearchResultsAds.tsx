'use client';
import { useEffect, useMemo, useRef } from 'react';

declare global {
    interface Window {
        _googCsa?: any;
    }
}

type Props = {
    query: string;
    locale?: string;
    containerId?: string;
};

export function SearchResultsAds({ query, locale, containerId: containerIdProp }: Props) {
    const pubId = process.env.NEXT_PUBLIC_AFS_PUB_ID; // expect partner-pub or pub- for AFS/CSA
    const styleId = process.env.NEXT_PUBLIC_ADSENSE_SEARCH_STYLE_ID || process.env.NEXT_PUBLIC_ADSENSE_ASID;
    const hl = (locale && locale.length >= 2 ? locale.slice(0, 2) : 'en');
    const containerId = useMemo(() => containerIdProp || 'csacontainer1', [containerIdProp]);
    const lastKeyRef = useRef<string>('');

    useEffect(() => {
        let cancelled = false;

        const waitForCmp = async () => {
            const deadline = Date.now() + 12000;
            try {
                const lc = localStorage.getItem('consent');
                if (lc === 'accepted') return true;
            } catch { }
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
                    if (cancelled) return resolveOnce(false);
                    try {
                        if (typeof (window as any).__tcfapi === 'function') {
                            (window as any).__tcfapi('ping', 2, (_data: any, ok: boolean) => {
                                if (ok) resolveOnce(true);
                            });
                            return;
                        }
                        if (typeof (window as any).__gpp === 'function') {
                            (window as any).__gpp('ping', (_data: any, ok: boolean) => {
                                if (ok) resolveOnce(true);
                            });
                            return;
                        }
                    } catch { }
                    if (Date.now() > deadline) resolveOnce(false);
                };
                iv = setInterval(check, 300);
                check();
            });
        };

        const run = async (tries: number = 0) => {
            if (cancelled) return;
            const el = document.getElementById(containerId);
            if (!el) {
                if (tries < 20) setTimeout(() => run(tries + 1), 250);
                return;
            }

            const cmpReady = await waitForCmp();
            if (!cmpReady) {
                console.warn('CMP not ready -> CSA search ads not requested');
                return;
            }

            // Ensure stub exists
            try {
                if (typeof window._googCsa !== 'function') {
                    window._googCsa = function () {
                        (window._googCsa.q = window._googCsa.q || []).push(arguments);
                    };
                    window._googCsa.t = Date.now();
                }
            } catch { }

            // Load CSA script once
            const scriptId = 'afs-adsense-search-js';
            if (!document.getElementById(scriptId)) {
                const s = document.createElement('script');
                s.id = scriptId;
                s.async = true;
                s.src = 'https://www.google.com/adsense/search/ads.js';
                document.head.appendChild(s);
            }

            const pageOptions: any = {
                pubId,
                query,
                hl,
                styleId,
            };
            const adblock: any = {
                container: containerId,
            };

            try {
                const pathname = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '';
                const key = `${containerId}_${pathname}_${query}`;
                if (lastKeyRef.current === key) return;
                // @ts-ignore
                window._googCsa && window._googCsa('ads', pageOptions, adblock);
                lastKeyRef.current = key;
            } catch { }
        };
        run();
        return () => { cancelled = true; };
    }, [pubId, styleId, hl, containerId, query]);

    if (!pubId || !styleId || !query) return null;
    return <div id={containerId} />;
}
