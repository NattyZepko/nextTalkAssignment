/**
 * Lightweight in-memory metrics.
 *
 * Provides counters (`inc/getCounter`) and timings (`timing/getTimingAvg/getTimingMax`).
 * Designed for quick operational visibility and status pages without external
 * telemetry. Not persistent and resets on process restart.
 */
type Timing = { count: number; totalMs: number; maxMs: number };

class Metrics {
    private counters = new Map<string, number>();
    private timings = new Map<string, Timing>();

    inc(name: string, by = 1) {
        this.counters.set(name, (this.counters.get(name) ?? 0) + by);
    }

    timing(name: string, ms: number) {
        const cur = this.timings.get(name) ?? { count: 0, totalMs: 0, maxMs: 0 };
        cur.count += 1;
        cur.totalMs += ms;
        cur.maxMs = Math.max(cur.maxMs, ms);
        this.timings.set(name, cur);
    }

    getCounter(name: string): number {
        return this.counters.get(name) ?? 0;
    }

    getTimingAvg(name: string): number {
        const t = this.timings.get(name);
        if (!t || t.count === 0) return 0;
        return Math.round(t.totalMs / t.count);
    }

    getTimingMax(name: string): number {
        const t = this.timings.get(name);
        return t?.maxMs ?? 0;
    }
}

export const metrics = new Metrics();
