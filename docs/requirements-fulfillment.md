# Requirements Fulfillment Guide

This document maps each requirement from instructions.prompt.md to the implemented code, endpoints, and how to validate them in this project.

## SERP + Article Pages
- **What:** Search-first flow with AI article rendering and RSOC ads.
- **Where:**
  - SERP view: [src/components/SearchView.tsx](../src/components/SearchView.tsx)
  - Article page: [src/app/article/page.tsx](../src/app/article/page.tsx)
  - Layout/shell: [src/app/layout.tsx](../src/app/layout.tsx)
- **How it works:**
  - SERP suggests items (and triggers ideas fetch) and embeds a RSOC ad.
  - Article page renders AI-generated content for `q` and includes back link preserving SERP context.
- **Validate:**
  - Run dev and visit `/search?q=cats&locale=en_US`; open article links.

## RSOC Ads (Related Search on Content)
- **What:** Google AdSense RSOC unit rendering with ASID or fallback slot; dev test mode supported.
- **Where:** [src/components/RSOCAd.tsx](../src/components/RSOCAd.tsx), [src/components/ThirdPartyScripts.tsx](../src/components/ThirdPartyScripts.tsx)
- **How it works:**
  - Loads AdSense once, safely pushes `adsbygoogle`, keys ad refresh by query.
  - Supports `data-asid` (RSOC) or `data-ad-slot` (fallback), optional `data-adtest` and `data-page-url`.
- **Validate:**
  - Set `NEXT_PUBLIC_ADSENSE_CLIENT` and `NEXT_PUBLIC_ADSENSE_ASID`.
  - For dev fills, set `NEXT_PUBLIC_ADSENSE_ADTEST=true`.
  - Open `/search` and confirm the "Related Search Ads" section shows an ad.

## Tracks Ad Clicks and User Behavior
- **What:** Client beacons capture click events and send to backend.
- **Where:**
  - Client tracking: [src/lib/clientTracking.ts](../src/lib/clientTracking.ts)
  - Tracked links: [src/components/TrackedLink.tsx](../src/components/TrackedLink.tsx)
  - Tracking API: [src/app/api/track/route.ts](../src/app/api/track/route.ts), [src/lib/track.ts](../src/lib/track.ts)
- **Captured fields:** `clickid/gclid/fbclid`, `channel (mon)`, `q`, `locale`, `user agent`, `ip` (server), `geo` (headers), `rac`, and full URL params.
- **View it:**
  - Metrics: `/status` shows `Tracked Events` and `DB create avg (ms)`.
  - DB: SQLite file at [prisma/dev.db](../prisma/dev.db); schema at [prisma/schema.prisma](../prisma/schema.prisma).

## Event Tracking System
- **What:** Server persists events and records metrics.
- **Where:**
  - Store: [src/lib/track.ts](../src/lib/track.ts) using Prisma singleton [src/lib/db.ts](../src/lib/db.ts)
  - Model: `Event` in [prisma/schema.prisma](../prisma/schema.prisma)
  - Endpoint: [src/app/api/track/route.ts](../src/app/api/track/route.ts)
- **Monitoring:**
  - `/status` displays counters `track.events`, `track.errors` and timing averages.

## Facebook Conversion API (CAPI)
- **What:** Sends `Lead` to FB on ad/article click with robust data.
- **Where:**
  - Endpoint: [src/app/api/fb/lead/route.ts](../src/app/api/fb/lead/route.ts)
  - Client trigger: [src/lib/clientTracking.ts](../src/lib/clientTracking.ts)
  - Graph call: [src/lib/fb.ts](../src/lib/fb.ts)
- **Data included:** `event_source_url`, `event_time`, `ip`, `user-agent`, cookies `fbc/fbp`, `click_id`, and custom `channel/keyword/ad_creative/source`.
- **Auth:** `FACEBOOK_ACCESS_TOKEN` stored server-side (never exposed to client).
- **Reliability:** Timeouts + retries via [src/lib/retry.ts](../src/lib/retry.ts). Metrics `fb.lead.sent/errors` in `/status`.
- **Testing:** Set `FACEBOOK_TEST_EVENT_CODE` and verify in Facebook Events Manager → Test Events.

## Dynamic Content Generation (AI)
- **What:** SEO-optimized HTML articles via Gemini/OpenAI, cached.
- **Where:** [src/lib/ai.ts](../src/lib/ai.ts)
- **Quality & SEO:**
  - Sanitizes to valid HTML starting with `<article>`.
  - Includes headings (H1–H3) and naturally mentions related search terms.
  - Derives `metaTitle` (from H1) and `metaDescription` (from first paragraph).
  - Relevance checks prevent drift; strict retry when off-topic.
- **Caching:** LRU with TTL via [src/lib/cache.ts](../src/lib/cache.ts); metadata read via `peekArticleCache()` avoids regeneration.
- **Validate:** Hit `/article?q=...&locale=...` and view page source/meta; check `/status` for `AI Requests`, `AI Cache Hits`, and `AI generate avg (ms)`.

## URL Structure & Handling
- **What:** Consistent encoding/decoding and query building.
- **Where:** [src/lib/url.ts](../src/lib/url.ts), used in [src/components/SearchView.tsx](../src/components/SearchView.tsx) and [src/app/article/page.tsx](../src/app/article/page.tsx).
- **How:** `safeEncode/safeDecode`, `buildQuery`, `parseQuery` ensure robust param parsing and link construction.

## Privacy Compliance (GDPR & CCPA)
- **What:** CMP hooks, privacy pages, and consent reopening.
- **Where:**
  - CMP: [src/components/ThirdPartyScripts.tsx](../src/components/ThirdPartyScripts.tsx)
  - Consent banner & controls: [src/components/ConsentBanner.tsx](../src/components/ConsentBanner.tsx) and [src/components/DebugWidget.tsx](../src/components/DebugWidget.tsx)
  - Pages: [src/app/privacy/page.tsx](../src/app/privacy/page.tsx), [src/app/do-not-sell/page.tsx](../src/app/do-not-sell/page.tsx)
- **Validate:**
  - `/debug` shows CMP statuses, cookies, and consent actions.

## Performance & Scalability
- **What:** DB pooling, caching, async operations, and metrics.
- **Where:**
  - Prisma singleton: [src/lib/db.ts](../src/lib/db.ts)
  - Caches: [src/lib/cache.ts](../src/lib/cache.ts) (`contentCache`, `ideasCache`)
  - Async beacons: [src/lib/clientTracking.ts](../src/lib/clientTracking.ts)
  - Metrics store: [src/lib/metrics.ts](../src/lib/metrics.ts)
  - Status page: [src/app/status/page.tsx](../src/app/status/page.tsx)
- **Monitored Metrics:**
  - Counters: `track.events`, `track.errors`, `ai.generate.invocations`, `ai.cache.hits`, `ideas.generate.invocations`, `ideas.cache.hits`, `fb.lead.sent`, `fb.lead.errors`.
  - Timings: `db.event.create.ms`, `ai.generate.ms`, `ideas.generate.ms` (avg + max available).
- **Validate:** Open `/status` to see env + live counters and timing averages.

## Database
- **What:** SQLite (dev) via Prisma; ready to swap providers.
- **Where:**
  - Schema: [prisma/schema.prisma](../prisma/schema.prisma)
  - Migrations: [prisma/migrations](../prisma/migrations)
  - Dev DB: [prisma/dev.db](../prisma/dev.db)
- **Saved Data:**
  - `Event`: captured tracking payloads and enriched metadata.
  - `Content`: cached AI HTML with meta and unique `cacheKey`.

## Deployment & Env
- **Docs:** See [README.md](../README.md) and [.env.local.example](../.env.local.example) for setup, production run, and env keys.
- **Key envs:** `SITE_URL`, `DATABASE_URL`, `OPENAI_*`, `GOOGLE_API_KEY/GEMINI_*`, `FACEBOOK_*`, RSOC `NEXT_PUBLIC_ADSENSE_*`, CMP/pixel flags, cache TTLs.

## Testing & Validation (Manual)
- **Tracking:** Click links on `/search` → check `/status` counters and DB event count.
- **CAPI:** With `FACEBOOK_TEST_EVENT_CODE`, verify in Events Manager; see `/status` counters.
- **AI:** Trigger `/article` and confirm meta title/description reflect content; check cache hits on `/status`.
- **CMP:** Use `/debug` to open consent UI and view CMP/GPP/USP status.
- **RSOC:** With test mode enabled, confirm ad unit loads; otherwise ensure approved domain/HTTPS.

## Architecture Diagram

```mermaid
flowchart LR
  user(User) --> browser[Next.js App (App Router)]
  browser --> serp[/search: SearchView + RSOCAd]
  browser --> article[/article: Article Page]

  serp --> ads[AdSense RSOC unit]
  browser --> tps[ThirdPartyScripts: FB Pixel + CMP + AdSense]
  browser --> debug[/debug: DebugWidget]

  click[TrackedLink (client)] --> trackAPI[/api/track]
  click --> fbLeadAPI[/api/fb/lead]

  trackAPI --> prisma[(Prisma + SQLite)]
  fbLeadAPI --> fbGraph[(Facebook CAPI)]

  article --> ai[lib/ai.ts: Gemini/OpenAI]
  ai --> contentCache[(LRU Content Cache)]
  ideasAPI[/api/ideas] --> ideasCache[(LRU Ideas Cache)]

  status[/status] --> metrics[(In-memory Metrics)]
```

## Technology Choices & Rationale

- **Next.js (App Router, v16):** Modern React framework with file-based routing, server components, and built-in API routes. Chosen for SSR/SEO, performance, and an integrated developer experience.
- **TypeScript:** Adds type safety across server and client code, reducing runtime errors and documenting intent.
- **Tailwind CSS:** Utility-first styling for fast iteration and consistent design without heavy CSS boilerplate.
- **Prisma ORM:** Schema-first data modeling, migrations, and a clean TypeScript client. Simplifies DB access and is portable across SQLite/Postgres/MySQL.
- **SQLite (dev):** Lightweight, zero-setup local database ideal for development and demos. Can be swapped to Postgres/MySQL in production by updating `provider` and `DATABASE_URL`.
- **LRU Caches (content/ideas):** In-memory caches with TTL to reduce AI/API costs and improve latency. Env-tunable TTLs balance freshness vs. cost.
- **Google AdSense RSOC:** Standard solution for Related Search monetization. Supports RSOC `ASID`, dev test mode (`data-adtest`), and an optional `data-page-url` override.
- **Facebook Conversion API:** Server-side event delivery for reliable conversion tracking with retries and optional Test Event Code for validation.
- **CMP (InMobi Choice):** Recommended free CMP; stubs integrate TCF/GPP/USP APIs and allow consent UI management for GDPR/CCPA compliance.
- **In-memory Metrics:** Lightweight counters/timings surfaced on `/status` for quick operational insight without external telemetry.
- **URL Helpers:** Centralized encode/decode/query building to prevent bugs in param handling across pages and links.
- **Retry Utility:** Exponential backoff with jitter and timeouts to make external API calls resilient.
- **Client Beacons:** `navigator.sendBeacon` or fetch with `keepalive` to log events without blocking user navigation.
- **Mermaid Diagrams:** Markdown-friendly diagrams to communicate architecture clearly in docs without additional tooling.
