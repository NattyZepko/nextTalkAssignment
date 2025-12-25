import { fetchWithTimeoutAndRetry } from '@/lib/retry';

const FB_API_VERSION = process.env.FACEBOOK_API_VERSION || 'v18.0';

export async function sendLead(payload: {
    pixelId: string;
    accessToken: string;
    eventSourceUrl?: string;
    eventTime?: number;
    userAgent?: string;
    ip?: string;
    fbc?: string;
    fbp?: string;
    click_id?: string;
    channel?: string;
    keyword?: string;
    ad_creative?: string;
    source?: string;
    testEventCode?: string;
}) {
    const url = `https://graph.facebook.com/${FB_API_VERSION}/${payload.pixelId}/events`;
    const data = {
        data: [
            {
                event_name: 'Lead',
                event_time: Math.floor((payload.eventTime ?? Date.now()) / 1000),
                event_source_url: payload.eventSourceUrl,
                action_source: 'website',
                user_data: {
                    client_ip_address: payload.ip,
                    client_user_agent: payload.userAgent,
                    fbc: payload.fbc,
                    fbp: payload.fbp,
                    click_id: payload.click_id,
                },
                custom_data: {
                    channel: payload.channel,
                    keyword: payload.keyword,
                    ad_creative: payload.ad_creative,
                    source: payload.source,
                },
            },
        ],
        ...(payload.testEventCode ? { test_event_code: payload.testEventCode } : {}),
    };

    const resp = await fetchWithTimeoutAndRetry(`${url}?access_token=${payload.accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        timeoutMs: 2500,
        retries: 3,
    });
    return await resp.json();
}
