export type GeminiStatus = {
    ok: boolean;
    model?: string;
    version?: string;
    statusCode?: number;
    message?: string;
    retrySeconds?: number;
};

let lastStatus: GeminiStatus | null = null;
let backoffUntilTs: number | null = null;

export function setGeminiStatus(status: GeminiStatus) {
    lastStatus = status;
}

export function getGeminiStatus(): GeminiStatus | null {
    return lastStatus;
}

export function setGeminiBackoffUntil(ts: number | null) {
    backoffUntilTs = ts;
}

export function getGeminiBackoffUntil(): number | null {
    return backoffUntilTs;
}
