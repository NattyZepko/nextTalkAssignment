import { searchParamsSchema, DEFAULTS } from '@/lib/validation';
import { SearchView } from '@/components/SearchView';

export const dynamic = 'force-dynamic';

export default function SearchPage({ searchParams }: { searchParams: Record<string, string> }) {
    const parsed = searchParamsSchema.safeParse(searchParams);
    const { q = DEFAULTS.q, locale = DEFAULTS.locale, mon = DEFAULTS.mon, rac = DEFAULTS.rac } = parsed.success ? parsed.data : ({} as any);
    return <SearchView initialQ={q} initialLocale={locale} mon={mon} rac={rac} />;
}
