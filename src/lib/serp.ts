import { DEFAULTS } from '@/lib/validation';

export type SerpItem = {
    title: string;
    q: string;
    mon: string;
    rac: string;
    desc: string;
};

export function buildSerpItems(query: string, mon?: string, rac?: string): SerpItem[] {
    const base = (query || DEFAULTS.q).trim();
    const m = mon || DEFAULTS.mon;
    const r = rac || DEFAULTS.rac;
    const candidates: Array<{ title: string; desc: string }> = [
        { title: `Best ${base} resources`, desc: `Top curated resources to learn ${base} fast.` },
        { title: `${base} tutorial for beginners`, desc: `Step-by-step starter guide to get you going.` },
        { title: `Advanced ${base} tips`, desc: `Practical tips to level up your skills.` },
        { title: `${base} jobs near you`, desc: `Local job listings and how to apply.` },
        { title: `${base} salary and career path`, desc: `Typical salaries and growth paths at a glance.` },
        { title: `Top tools for ${base}`, desc: `Essential tools to boost productivity.` },
    ];
    return candidates.map(({ title, desc }) => ({ title, q: title, mon: m, rac: r, desc }));
}
