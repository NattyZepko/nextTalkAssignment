import { searchParamsSchema, DEFAULTS } from '@/lib/validation';
import { generateArticleHtml, peekArticleCache, articleCacheKey } from '@/lib/ai';
import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { buildQuery } from '@/lib/url';
import { prisma } from '@/lib/db';
import { RSOCAd } from '@/components/RSOCAd';

export const dynamic = 'force-dynamic';

function pickParam(sp: Record<string, any>, key: string, dflt: string) {
    const v: any = sp?.[key];
    if (Array.isArray(v)) return (v[0] as string) || dflt;
    if (typeof v === 'string' && v.length > 0) return v as string;
    return dflt;
}

export async function generateMetadata({ searchParams }: { searchParams: Record<string, any> | Promise<Record<string, any>> }): Promise<Metadata> {
    noStore();
    const sp = typeof (searchParams as any)?.then === 'function' ? await (searchParams as Promise<Record<string, any>>) : (searchParams as Record<string, any>);
    const q = pickParam(sp, 'q', DEFAULTS.q);
    const locale = pickParam(sp, 'locale', DEFAULTS.locale);
    console.log('[Article:metadata] searchParams', sp);
    const cached = peekArticleCache(q, locale);
    const title = cached?.metaTitle || `${q} — Article`;
    const description = cached?.metaDescription || `Generated content for ${q} in ${locale}.`;
    return { title, description };
}

export default async function ArticlePage({ searchParams }: { searchParams: Record<string, any> | Promise<Record<string, any>> }) {
    noStore();
    const sp = typeof (searchParams as any)?.then === 'function' ? await (searchParams as Promise<Record<string, any>>) : (searchParams as Record<string, any>);
    // Normalize params defensively (arrays vs strings)
    const rawQ1 = pickParam(sp, 'q', '');
    const rawQ2 = pickParam(sp, 'serp_q', '');
    const q = rawQ1 || rawQ2 || DEFAULTS.q;
    const locale = pickParam(sp, 'locale', DEFAULTS.locale);
    const rawQ = sp?.['q'] as any;
    const rawLocale = sp?.['locale'] as any;
    const rawMon = sp?.['mon'] as any;
    const rawRac = sp?.['rac'] as any;
    const serp_q = (sp?.['serp_q'] as any) || rawQ || DEFAULTS.q;
    const serp_locale = (sp?.['serp_locale'] as any) || rawLocale || DEFAULTS.locale;
    const serp_mon = (sp?.['serp_mon'] as any) || rawMon || DEFAULTS.mon;
    const serp_rac = (sp?.['serp_rac'] as any) || rawRac || DEFAULTS.rac;
    // Server-side logging: record the q/locale and raw params used to generate article
    const h = await headers();
    console.log('[Article] Loading content', {
        q,
        locale,
        serp_q,
        serp_locale,
        serp_mon,
        serp_rac,
        headers: {
            host: h.get('host'),
            referer: h.get('referer'),
            forwardedProto: h.get('x-forwarded-proto'),
            forwardedFor: h.get('x-forwarded-for'),
        },
        searchParams: sp,
    });
    const content = await generateArticleHtml(q, locale);
    // Determine published date: from DB if available, else fallback constant
    let publishedText = 'Published on Jan 1, 2026'; // Default
    try {
        const key = articleCacheKey(q, locale);
        const row = await prisma.content.findUnique({ where: { cacheKey: key }, select: { createdAt: true } });
        if (row?.createdAt) {
            const dt = new Date(row.createdAt);
            // Format deterministically (UTC) to avoid client/server timezone mismatches during hydration
            const formatted = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(dt);
            publishedText = `Published on ${formatted}`;
        }
    } catch { }
    return (
        <div className="space-y-4">
            <div>
                <Link
                    href={`/search?${buildQuery({ q: serp_q, locale: serp_locale, mon: serp_mon, rac: serp_rac })}`}
                    className="text-sm text-blue-600 hover:underline"
                >
                    ← Back to SERP
                </Link>
            </div>
            <h1 className="text-2xl font-semibold">{q}</h1>
            <p className="text-sm text-gray-300">Locale: {locale}</p>
            <div className="text-[12px] font-normal opacity-90"><span suppressHydrationWarning>{publishedText}</span></div>
            {/* RSOC ad unit near top of article */}
            <div className="my-4">
                <RSOCAd query={q} locale={locale} />
            </div>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content.html }} />
            {/* Optional second unit after content */}
            <div className="my-6">
                <RSOCAd query={q} locale={locale} />
            </div>
        </div>
    );
}
