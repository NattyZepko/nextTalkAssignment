# Dynamic RSOC Platform

SERP-first Next.js app with RSOC ads, tracking, Facebook CAPI proxy, AI-generated content, CMP stubs, and performance/observability utilities.

## Quick Start

1. Copy `.env.local.example` → `.env.local` and fill values.
2. Install dependencies and generate Prisma client.
3. Run database migrations.

```powershell
Push-Location "d:\path\nextTalkAssignment"
npm install
npx prisma generate
npx prisma migrate dev --name init
Pop-Location
```

## Development

```powershell
Push-Location "d:\path\nextTalkAssignment"
npm run dev
Pop-Location
```

Open http://localhost:3000

## Production

```powershell
Push-Location "d:\path\nextTalkAssignment"
npm run build
npx next start -p 3000
Pop-Location
```

Optional: set host binding `-H yourdomain.com` if required by your environment.

## Environment Variables

See `.env.local.example` for a complete template. Key variables:

- **SITE_URL:** Base site URL for server-side links.
- **DATABASE_URL:** Prisma connection URL (SQLite dev: `file:./dev.db`).
- **OPENAI_API_KEY/OPENAI_MODEL:** OpenAI Chat Completions (default `gpt-4o-mini`).
- **GOOGLE_API_KEY/GEMINI_MODEL/GEMINI_TIMEOUT_MS/GEMINI_LIST_VERSION:** Gemini models and timeouts.
- **FACEBOOK_PIXEL_ID/FACEBOOK_ACCESS_TOKEN/FACEBOOK_API_VERSION:** Facebook CAPI proxy settings.
- **NEXT_PUBLIC_ADSENSE_CLIENT/NEXT_PUBLIC_ADSENSE_ASID/NEXT_PUBLIC_ADSENSE_SLOT:** RSOC AdSense client-side config.
- **NEXT_PUBLIC_ADSENSE_ADTEST:** Set to `true` to show test ads in dev/local.
- **NEXT_PUBLIC_ADSENSE_PAGE_URL:** Optional override for AdSense page URL (use your production https URL).
- **NEXT_PUBLIC_FACEBOOK_PIXEL_ID/NEXT_PUBLIC_INMOBI_CHOICE_ID/NEXT_PUBLIC_CMP_HOST_OVERRIDE:** Client CMP/pixel configuration.
- **NEXT_PUBLIC_ENABLE_THIRD_PARTY/NEXT_PUBLIC_DEBUG_WIDGET:** Enable third-party scripts and debug UI.
- **ARTICLE_CACHE_TTL_SECONDS/IDEAS_CACHE_TTL_SECONDS:** LRU cache TTLs for content and ideas.

## Database

- Schema: [prisma/schema.prisma](prisma/schema.prisma)
- Migrations: [prisma/migrations](prisma/migrations)
- Dev DB: [prisma/dev.db](prisma/dev.db) (SQLite)

Switch to Postgres/MySQL by updating `provider` in `schema.prisma` and `DATABASE_URL`.

## Routes

- SERP: `/search?q=php%20developer&locale=en`
- Article: `/article?q=stock%20investment%20tips&locale=en`
- Status: `/status` (env + counters + averages)
- Debug: `/debug` (CMP/pixel/ad/Gemini checks)

## Content Generation

- Articles are generated server-side via Gemini/OpenAI and cached in an LRU to reduce API costs.
- HTML starts with `<article>` and includes headings (H1–H3), readable sections, and related search terms.
- SEO metadata (title/description) is derived from the article content (H1 + first paragraph) and applied via Next.js metadata.
- Caching TTL is controlled by `ARTICLE_CACHE_TTL_SECONDS`.

## Facebook Conversion API

- Endpoint: POST `/api/fb/lead` (server-side proxy)
- Env: `FACEBOOK_PIXEL_ID`, `FACEBOOK_ACCESS_TOKEN`, `FACEBOOK_API_VERSION` (default `v18.0`)
- Testing: `FACEBOOK_TEST_EVENT_CODE` (optional) — get from Events Manager → Test Events and set in env to validate delivery.
- Payload includes:
	- Event: `Lead` with `event_source_url`, `event_time`, `action_source=website`
	- User data: `client_ip_address`, `client_user_agent`, `fbc`, `fbp`, `click_id`
	- Custom data: `channel`, `keyword`, `ad_creative`
- Client: `TrackedLink` triggers `/api/track` and `/api/fb/lead` using beacons on click.
- Server enriches missing `ip`, `user-agent`, `fbc/fbp` cookies, and `event_source_url` from headers; retries and timeouts via `fetchWithTimeoutAndRetry`.

### Manual Verification Steps
- Set envs: `FACEBOOK_PIXEL_ID`, `FACEBOOK_ACCESS_TOKEN`, optionally `FACEBOOK_TEST_EVENT_CODE`.
- Build and start the server.
- Navigate to `/search` and click any `TrackedLink` article link.
- Check `/status` for metrics: `fb.lead.sent` increments; `fb.lead.errors` remains 0.
- In Facebook Events Manager, open Test Events to verify receipt (if `FACEBOOK_TEST_EVENT_CODE` is set).

## APIs

- POST `/api/track` — store event (server enriches GEO via headers)
- POST `/api/fb/lead` — proxy Facebook CAPI lead
- GET `/api/generate?q=...&locale=...` — AI-generated content (cached)
- GET `/api/ideas?q=...&locale=...` — AI ideas (cached TTL)

## Ads (RSOC)

Configure AdSense client, ASID, and slot in env. The RSOC component guards duplicate initializations and keys refreshes by query.

If ads appear blank locally, enable test ads:

```powershell
$env:NEXT_PUBLIC_ADSENSE_ADTEST="true"
npm run dev
```

Also ensure you have consented in the CMP banner; ad blockers can hide units.

For production fills:
- Serve over HTTPS on an approved domain (added in AdSense “Sites”).
- Consider adding `ads.txt` at the root.
- If using non-standard ports or proxies, set `NEXT_PUBLIC_ADSENSE_PAGE_URL` to your canonical URL.

## CMP/Privacy

Basic CMP hooks for InMobi Choice with host override. Dedicated pages:

- [src/app/privacy/page.tsx](src/app/privacy/page.tsx)
- [src/app/do-not-sell/page.tsx](src/app/do-not-sell/page.tsx)

## Observability

In-memory metrics (counters/timings) surfaced on `/status`. Not persistent; resets on restart. Integrate external telemetry if needed.

## Notes

- Content sanitization enforces HTML-only starting with `<article>`.
- URL helpers centralize encoding/decoding and query building.
- Prisma client uses a singleton to optimize connection usage.
