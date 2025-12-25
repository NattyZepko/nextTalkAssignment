type RetryOptions = {
    retries?: number;
    baseDelayMs?: number; // initial backoff
    maxDelayMs?: number; // cap backoff
    factor?: number; // exponential factor
    jitter?: boolean;
};

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextDelay(current: number, factor: number, maxDelay: number, jitter: boolean) {
    let delay = Math.min(current * factor, maxDelay);
    if (jitter) {
        const random = Math.random() * delay * 0.3; // 30% jitter
        delay = delay - random;
    }
    return Math.max(10, Math.floor(delay));
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
    const {
        retries = 2,
        baseDelayMs = 200,
        maxDelayMs = 1500,
        factor = 2,
        jitter = true,
    } = opts;

    let attempt = 0;
    let delay = baseDelayMs;
    let lastError: any;

    while (attempt <= retries) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;
            // AbortError or 5xx should be retried; 4xx usually not
            const msg = String(err?.message ?? '');
            const isAbort = err?.name === 'AbortError' || msg.includes('aborted');
            const isNetwork = msg.includes('fetch') || msg.includes('NetworkError');
            const status = err?.status ?? 0;
            const retryableStatus = status >= 500 || status === 0; // 0 when network fails
            if (attempt === retries || (!isAbort && !isNetwork && !retryableStatus)) {
                break;
            }
            await sleep(delay);
            delay = nextDelay(delay, factor, maxDelayMs, jitter);
            attempt += 1;
        }
    }
    throw lastError;
}

export async function fetchWithTimeoutAndRetry(
    url: string,
    init: RequestInit & { timeoutMs?: number; retries?: number } = {}
): Promise<Response> {
    const timeoutMs = init.timeoutMs ?? 2500;
    const retries = init.retries ?? 2;
    return withRetry(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const resp = await fetch(url, { ...init, signal: controller.signal });
            if (!resp.ok) {
                const err: any = new Error(`HTTP ${resp.status}`);
                err.status = resp.status;
                throw err;
            }
            return resp;
        } finally {
            clearTimeout(timer);
        }
    }, { retries });
}
