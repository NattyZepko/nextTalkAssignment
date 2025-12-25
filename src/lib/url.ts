/**
 * URL helpers for safe encoding/decoding and query string handling.
 *
 * - `safeEncode`/`safeDecode`: guard against malformed inputs.
 * - `buildQuery`: constructs a query string from a record, skipping null/undefined.
 * - `parseQuery`: parses a `?`-prefixed or raw query string into a record.
 */
export function safeEncode(value: string | undefined | null): string {
    try {
        return encodeURIComponent(value ?? '');
    } catch {
        return '';
    }
}

export function safeDecode(value: string | undefined | null): string {
    try {
        return decodeURIComponent(value ?? '');
    } catch {
        return value ?? '';
    }
}

export function buildQuery(params: Record<string, string | undefined | null>): string {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v != null) usp.set(k, String(v));
    }
    return usp.toString();
}

export function parseQuery(search: string): Record<string, string> {
    const usp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const out: Record<string, string> = {};
    for (const [k, v] of usp.entries()) {
        out[k] = v;
    }
    return out;
}
