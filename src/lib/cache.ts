/**
 * In-memory LRU caches and TTL configuration.
 *
 * - `contentCache`: caches generated article HTML by `locale:q` for ARTICLE_CACHE_TTL_SECONDS (default 1h).
 * - `ideasCache`: caches SERP ideas by `locale:q` for IDEAS_CACHE_TTL_SECONDS (default 15m).
 *
 * Both caches are sized for small/medium workloads by default and can be tuned
 * via environment variables without code changes.
 */
import { LRUCache } from 'lru-cache';

type ContentItem = {
    html: string;
    metaTitle?: string;
    metaDescription?: string;
};

type IdeasListItem = { title: string; q: string; desc: string };
type IdeasList = IdeasListItem[];

const ttlSecEnv = process.env.ARTICLE_CACHE_TTL_SECONDS;
const ttlMs = (() => {
    const n = ttlSecEnv ? parseInt(ttlSecEnv, 10) : NaN;
    if (!Number.isFinite(n) || n <= 0) return 1000 * 60 * 60; // default 1h
    return n * 1000;
})();

export const contentCache = new LRUCache<string, ContentItem>({
    max: 500,
    ttl: ttlMs,
});

const ideasTtlSecEnv = process.env.IDEAS_CACHE_TTL_SECONDS;
const ideasTtlMs = (() => {
    const n = ideasTtlSecEnv ? parseInt(ideasTtlSecEnv, 10) : NaN;
    if (!Number.isFinite(n) || n <= 0) return 1000 * 60 * 15; // default 15 min
    return n * 1000;
})();

export const ideasCache = new LRUCache<string, IdeasList>({
    max: 500,
    ttl: ideasTtlMs,
});
