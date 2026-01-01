"use client";
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type TcfPing = { cmpLoaded?: boolean; gdprApplies?: boolean; tcfPolicyVersion?: number };
type TcfData = { tcString?: string; eventStatus?: string; cmpStatus?: string };
type UspPing = { uspapiSupport?: boolean };
type UspData = { version?: number; uspString?: string };

declare global {
    interface Window {
        __tcfapi?: (
            cmd: string,
            ver: number,
            cb: (data: any, success: boolean) => void,
            param?: any
        ) => void;
        __gpp?: (
            cmd: string,
            cb: (data: any, success: boolean) => void,
            param?: any,
            version?: string
        ) => void;
        __uspapi?: (cmd: string, ver: number, cb: (data: any, success: boolean) => void) => void;
        fbq?: any;
        adsbygoogle?: any[];
    }
}

export function DebugWidget() {
    const [collapsed, setCollapsed] = useState(false);
    const [tcfPing, setTcfPing] = useState<TcfPing | null>(null);
    const [tcfData, setTcfData] = useState<TcfData | null>(null);
    const [uspPing, setUspPing] = useState<UspPing | null>(null);
    const [uspData, setUspData] = useState<UspData | null>(null);
    const [cookies, setCookies] = useState<{ fbp?: string; fbc?: string }>({});
    const [pixelReady, setPixelReady] = useState(false);
    const [adsReady, setAdsReady] = useState(false);
    const [geminiStatus, setGeminiStatusState] = useState<{ ok?: boolean; model?: string; version?: string; statusCode?: number; message?: string; retrySeconds?: number } | null>(null);
    const [geminiBackoffUntilTs, setGeminiBackoffUntilTs] = useState<number | null>(null);
    const [consentOpenVia, setConsentOpenVia] = useState<string | null>(null);
    const [consentError, setConsentError] = useState<string | null>(null);
    const [consentState, setConsentState] = useState<string>('N/A');

    const sp = useSearchParams();
    const q = sp.get('q') || '';
    const locale = sp.get('locale') || '';
    const mon = sp.get('mon') || '';
    const rac = sp.get('rac') || '';

    const thirdParty = process.env.NEXT_PUBLIC_ENABLE_THIRD_PARTY === 'true';

    useEffect(() => {
        // CMP TCF ping
        if (typeof window.__tcfapi === 'function') {
            window.__tcfapi('ping', 2, (data, ok) => {
                if (ok) setTcfPing(data as TcfPing);
            });
            window.__tcfapi('getTCData', 2, (data, ok) => {
                if (ok) setTcfData(data as TcfData);
            });
            // Subscribe to consent changes
            try {
                window.__tcfapi('addEventListener', 2, (data: any, ok: boolean) => {
                    if (ok && data) {
                        setTcfData(data as TcfData);
                    }
                });
            } catch { }
        }
        // USP ping (CCPA/US Privacy)
        if (typeof window.__uspapi === 'function') {
            window.__uspapi('uspPing', 1, (data, ok) => {
                if (ok) setUspPing(data as UspPing);
            });
            window.__uspapi('getUSPData', 1, (data, ok) => {
                if (ok) setUspData(data as UspData);
            });
        }
        // Cookies
        try {
            const all = document.cookie || '';
            const fbp = /(^|;\s*)_fbp=([^;]+)/.exec(all)?.[2];
            const fbc = /(^|;\s*)_fbc=([^;]+)/.exec(all)?.[2];
            setCookies({ fbp, fbc });
        } catch { }
        // Pixel
        setPixelReady(typeof window.fbq === 'function');
        // AdSense
        setAdsReady(Array.isArray(window.adsbygoogle));
        // Gemini Status
        fetch('/api/gemini-status')
            .then((r) => r.json())
            .then((j) => {
                setGeminiStatusState(j?.status ?? null);
                setGeminiBackoffUntilTs(j?.backoffUntilTs ?? null);
            })
            .catch(() => { });
        // Local consent (banner)
        try {
            const c = localStorage.getItem('consent');
            if (c === 'accepted') setConsentState('Accepted');
            else if (c === 'declined') setConsentState('Declined');
        } catch { }
    }, []);

    const cmpReady = !!tcfPing?.cmpLoaded;
    const uspReady = !!uspPing?.uspapiSupport || (typeof window !== 'undefined' && typeof window.__uspapi === 'function');

    const openConsent = () => {
        setConsentOpenVia(null);
        setConsentError(null);
        let attempted = false;
        // Always provide a local fallback banner so users see immediate UI
        try {
            window.dispatchEvent(new Event('open-consent-banner'));
            setConsentOpenVia('Banner');
        } catch { }
        // Try TCF via common commands
        try {
            if (typeof window.__tcfapi === 'function') {
                attempted = true;
                window.__tcfapi('displayConsentUi', 2, () => { });
                setConsentOpenVia('TCF');
                setTimeout(() => {
                    try {
                        window.__tcfapi && window.__tcfapi('showConsentTool', 2, () => { });
                        setConsentOpenVia((prev) => prev || 'TCF');
                    } catch { }
                }, 300);
            }
        } catch { }
        // Try GPP (US Privacy) open, then legacy USP
        try {
            if (typeof window.__gpp === 'function') {
                attempted = true;
                window.__gpp('open', () => { }, null, '1.1');
                setConsentOpenVia('GPP');
            }
        } catch { }
        try {
            if (typeof window.__uspapi === 'function') {
                attempted = true;
                window.__uspapi('displayUspUi', 1, () => { });
                setConsentOpenVia('USP');
            }
        } catch { }
        // If nothing available, try to load CMP dynamically and retry briefly
        if (!attempted) {
            const choiceId = process.env.NEXT_PUBLIC_INMOBI_CHOICE_ID;
            const hostOverride = process.env.NEXT_PUBLIC_CMP_HOST_OVERRIDE || '';
            const rawHost = hostOverride || (typeof window !== 'undefined' ? window.location.hostname : '');
            const host = (rawHost || '').replace(/^https?:\/\//, '').replace(/:.*/, '').replace(/\/.*/, '');
            if (choiceId && host) {
                const url = `https://cmp.inmobi.com/choice/${choiceId}/${host}/choice.js?tag_version=V3`;
                const s = document.createElement('script');
                s.async = true;
                s.src = url;
                document.head.appendChild(s);
                let tries = 0;
                const maxTries = 20;
                const iv = setInterval(() => {
                    tries++;
                    try {
                        if (typeof window.__tcfapi === 'function') {
                            try { window.__tcfapi('init', 2, () => { }, { tag_version: 'V3' }); } catch { }
                            attempted = true;
                            window.__tcfapi('displayConsentUi', 2, () => { });
                            setConsentOpenVia('TCF');
                            clearInterval(iv);
                            return;
                        }
                        if (typeof window.__gpp === 'function') {
                            attempted = true;
                            window.__gpp('open', () => { }, null, '1.1');
                            setConsentOpenVia('GPP');
                            clearInterval(iv);
                            return;
                        }
                        if (typeof window.__uspapi === 'function') {
                            attempted = true;
                            window.__uspapi('displayUspUi', 1, () => { });
                            setConsentOpenVia('USP');
                            clearInterval(iv);
                            return;
                        }
                    } catch { }
                    if (tries >= maxTries) {
                        clearInterval(iv);
                        const msg = 'CMP script failed to initialize';
                        setConsentError(msg);
                        // Keep local banner open as fallback
                        try { window.dispatchEvent(new Event('open-consent-banner')); } catch { }
                    }
                }, 300);
            } else {
                const msg = 'CMP/USP/GPP APIs not found';
                setConsentError(msg);
                // Keep local banner open as fallback
                try { window.dispatchEvent(new Event('open-consent-banner')); } catch { }
            }
        }
    };

    const items = useMemo(
        () => [
            { k: 'CMP Ready', v: String(cmpReady) },
            { k: 'GDPR Applies', v: String(tcfPing?.gdprApplies ?? '') },
            { k: 'TCF Status', v: tcfData?.cmpStatus ?? '' },
            { k: 'USP Ready', v: String(uspReady) },
            { k: 'USP String', v: uspData?.uspString ?? '' },
            { k: 'q', v: q },
            { k: 'locale', v: locale },
            { k: 'mon', v: mon },
            { k: 'rac', v: rac },
            { k: 'Third-party', v: String(thirdParty) },
            { k: 'FB Pixel', v: String(pixelReady) },
            { k: 'AdSense', v: String(adsReady) },
            { k: '_fbp', v: cookies.fbp ?? '' },
            { k: '_fbc', v: cookies.fbc ?? '' },
            { k: 'Gemini OK', v: String(geminiStatus?.ok ?? '') },
            { k: 'Gemini Model', v: geminiStatus?.model ?? '' },
            { k: 'Gemini Version', v: geminiStatus?.version ?? '' },
            { k: 'Gemini Code', v: String(geminiStatus?.statusCode ?? '') },
            { k: 'Gemini Retry(s)', v: String(geminiStatus?.retrySeconds ?? '') },
            { k: 'Gemini Backoff until', v: geminiBackoffUntilTs ? new Date(geminiBackoffUntilTs).toLocaleTimeString() : '' },
            { k: 'Gemini Backoff(s)', v: geminiBackoffUntilTs ? String(Math.max(0, Math.ceil((geminiBackoffUntilTs - Date.now()) / 1000))) : '' },
            { k: 'Gemini Error', v: geminiStatus?.message ?? '' },
        ], [cmpReady, tcfPing, tcfData, uspReady, uspData, q, locale, mon, rac, thirdParty, pixelReady, adsReady, cookies, geminiStatus, geminiBackoffUntilTs]
    );

    // Derive user-friendly consent state whenever sources change
    useEffect(() => {
        // Priority: explicit banner choice
        try {
            const c = localStorage.getItem('consent');
            if (c === 'accepted') {
                setConsentState('Accepted');
                return;
            }
            if (c === 'declined') {
                setConsentState('Declined');
                return;
            }
        } catch { }
        // TCF
        if (tcfData?.eventStatus) {
            const hasTc = !!tcfData.tcString;
            if (tcfData.eventStatus === 'useractioncomplete' || tcfData.eventStatus === 'tcloaded') {
                setConsentState(hasTc ? 'TCF: Consented' : 'TCF: No consent');
                return;
            }
            setConsentState(`TCF: ${tcfData.eventStatus}`);
            return;
        }
        // USP (CCPA)
        if (uspData?.uspString) {
            setConsentState(`USP: ${uspData.uspString}`);
            return;
        }
        setConsentState('N/A');
    }, [tcfData, uspData]);

    return (
        <div className="fixed bottom-16 right-4 z-50">
            <div className="rounded-lg shadow-lg border border-gray-700 bg-gray-900/90 backdrop-blur p-3 w-80 text-white">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Debug Widget</span>
                    <div className="space-x-2">
                        <button
                            className="text-sm px-2 py-1 border rounded hover:bg-gray-800"
                            onClick={() => setCollapsed((c) => !c)}
                            aria-label={collapsed ? 'Expand debug' : 'Collapse debug'}
                        >
                            {collapsed ? 'Expand' : 'Minimize'}
                        </button>
                        <button
                            className="text-sm px-2 py-1 border rounded hover:bg-gray-800"
                            onClick={openConsent}
                        >
                            Manage preferences
                        </button>
                    </div>
                </div>
                {collapsed ? null : (
                    <div className="text-xs grid grid-cols-2 gap-x-3 gap-y-1">
                        {items.map((it) => (
                            <div key={it.k} className="flex">
                                <span className="text-gray-400 w-24">{it.k}</span>
                                <span className="font-mono break-all text-gray-100">{it.v}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-2 text-[11px] text-gray-300">
                    <div className="mb-1 text-xs">
                        <span className="font-semibold">Consent:</span> {consentState}{consentOpenVia ? ` — via ${consentOpenVia}` : ''}{consentError ? ` — ${consentError}` : ''}
                    </div>
                    We use cookies for analytics and ads. Manage preferences per GDPR/CCPA.
                </div>
            </div>
        </div>
    );
}
