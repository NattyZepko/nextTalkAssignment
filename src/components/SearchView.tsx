"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchResultsAds } from '@/components/SearchResultsAds';
import { TrackedLink } from '@/components/TrackedLink';
import { buildSerpItems } from '@/lib/serp';
import type { SerpItem } from '@/lib/serp';
import { buildQuery, parseQuery, safeDecode } from '@/lib/url';

type Props = {
    initialQ: string;
    initialLocale: string;
    mon: string;
    rac: string;
};

export function SearchView({ initialQ, initialLocale, mon, rac }: Props) {
    const [inputQ, setInputQ] = useState(initialQ);
    const [committedQ, setCommittedQ] = useState(initialQ);
    const [items, setItems] = useState<SerpItem[]>(() => buildSerpItems(initialQ, mon, rac));
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Sync input from URL on mount; do not change committed search
    useEffect(() => {
        try {
            const qRaw = parseQuery(window.location.search).q;
            const urlQ = safeDecode(qRaw);
            if (urlQ) setInputQ(urlQ);
        } catch { }
    }, []);

    async function onSearch() {
        const q = inputQ.trim();
        const paramsStr = buildQuery({ q, locale: initialLocale, mon, rac });
        setCommittedQ(q);
        setLoading(true);
        try {
            router.replace(`/search?${paramsStr}`);
            const resp = await fetch(`/api/ideas?${paramsStr}`);
            const json = await resp.json().catch(() => null);
            const nextItems: SerpItem[] = json?.items || buildSerpItems(q, mon, rac);
            setItems(nextItems);
        } catch {
            setItems(buildSerpItems(q, mon, rac));
        } finally {
            setLoading(false);
        }
    }

    // items are driven by committedQ and AI suggestions; no extra memo here

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <label htmlFor="q" className="text-sm text-gray-700">Query</label>
                <input
                    id="q"
                    value={inputQ}
                    onChange={(e) => setInputQ(e.target.value)}
                    className="flex-1 border border-gray-400 rounded px-2 py-1 text-sm bg-white text-gray-900 placeholder:text-gray-500"
                    placeholder="Type a keyword"
                />
                <button
                    className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                    onClick={onSearch}
                    disabled={loading}
                >
                    {loading ? 'Searching…' : 'Search'}
                </button>
            </div>

            <p className="text-sm text-gray-600">Locale: {initialLocale}</p>

            <div className="border rounded p-4">
                <h2 className="font-medium">Search Ads</h2>
                <SearchResultsAds query={committedQ} locale={initialLocale} />
            </div>

            <div className="border rounded p-4">
                <h2 className="font-medium">Articles</h2>
                <ul className="list-disc pl-6 space-y-3">
                    {items.map((it) => (
                        <li key={it.title}>
                            <TrackedLink
                                href={`/article?${buildQuery({
                                    q: it.q,
                                    locale: initialLocale,
                                    mon: it.mon,
                                    rac: it.rac,
                                    serp_q: committedQ,
                                    serp_locale: initialLocale,
                                    serp_mon: mon,
                                    serp_rac: rac,
                                })}`}
                                q={it.q}
                                locale={initialLocale}
                                channel={it.mon}
                                rac={it.rac}
                                keyword={it.q}
                            >
                                {it.title}
                            </TrackedLink>
                            <p className="ml-5 text-xs text-gray-600">{it.desc}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
