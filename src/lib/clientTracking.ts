'use client';

function beaconJson(url: string, payload: any) {
    try {
        if ('sendBeacon' in navigator) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(url, blob);
            return Promise.resolve(true);
        }
    } catch { }
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
    })
        .then(() => true)
        .catch(() => false);
}

function getCookie(name: string): string | undefined {
    const match = document.cookie.match(new RegExp('(^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : undefined;
}

export async function trackClickAndLead(params: {
    q?: string;
    locale?: string;
    channel?: string;
    rac?: string;
    keyword?: string;
    ad_creative?: string;
    source?: string;
}) {
    const urlParams = new URLSearchParams(window.location.search);
    const gclid = urlParams.get('gclid') || undefined;
    const fbclid = urlParams.get('fbclid') || undefined;
    const clickId = urlParams.get('clickid') || undefined;
    const fbc = getCookie('_fbc');
    const fbp = getCookie('_fbp');
    const userAgent = navigator.userAgent;

    // 1. Store event
    await beaconJson('/api/track', {
        clickId,
        gclid,
        fbclid,
        channel: params.channel,
        q: params.q ?? params.keyword,
        locale: params.locale,
        userAgent,
        rac: params.rac ?? params.ad_creative,
        params: Object.fromEntries(urlParams.entries()),
    });

    // 2. Send Facebook Lead
    await beaconJson('/api/fb/lead', {
        eventSourceUrl: window.location.href,
        eventTime: Date.now(),
        userAgent,
        fbc,
        fbp,
        click_id: clickId || gclid || fbclid,
        channel: params.channel,
        keyword: params.keyword ?? params.q,
        ad_creative: params.ad_creative ?? params.rac,
        source: params.source ?? params.channel ?? 'web',
    });
}
