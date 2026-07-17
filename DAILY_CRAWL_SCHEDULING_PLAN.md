# Daily Crawl Scheduling Plan

## Goal

Start accumulating IndieRadar data automatically on a daily schedule so we can move from demo runs to a real historical dataset.

**Primary outcome:** one reliable nightly crawl for the `productivity` niche, writing into Supabase without manual intervention.

**Not in v1:** incremental review fetch, signal refresh, automated report delivery, multi-niche scheduling.

## Why now

- Daily brief becomes useful only with repeated crawls over time.
- Supabase Free projects pause after 1 week of inactivity; scheduled crawls keep the project active.
- Current DB usage is far below the Free plan limit (~15–25 MB vs 500 MB).
- Existing crawler already completes end-to-end (~35 min full multi-market run).

## Recommended approach

Use **GitHub Actions cron** as the first scheduler.

Why not local cron or `services/scheduler` yet:

- local machine sleep/offline breaks reliability;
- `services/scheduler` is still a placeholder;
- GitHub Actions is free, observable, and fits the current repo workflow.

## Scope for v1

### Included

- Scheduled workflow in `.github/workflows/`
- Nightly run of `npm run dev:crawler`
- Niche: `productivity`
- Markets/config from `.env.example` defaults
- GitHub secrets for Supabase credentials
- Basic failure visibility via GitHub Actions logs/email
- Post-run sanity check using existing `npm run inspect:crawler` or equivalent lightweight check

### Excluded

- Incremental review fetch
- Refreshing existing `review_theme` signals
- Automated analyzer report generation
- Telegram/email report delivery
- Multi-niche orchestration
- Custom scheduler service deployment

## Proposed schedule

| Setting | Value |
|---|---|
| Frequency | 1x per day |
| Cron | `0 3 * * *` (03:00 UTC) |
| Niche | `productivity` |
| Expected runtime | ~30–40 min |
| Timeout | 60–90 min job timeout |

Optional later: second daily run only after stability is proven.

## Runtime configuration

Use the current production-like defaults:

```env
CRAWLER_NICHE_SLUG=productivity
CRAWLER_REVIEW_MAX_AGE_DAYS=90
GOOGLE_PLAY_MARKETS=us:en,gb:en,de:de,fr:fr,it:it,es:es,nl:nl,se:sv,dk:da,fi:fi,no:no,ch:de,at:de,be:nl,ie:en,pl:pl,cz:cs,pt:pt
GOOGLE_PLAY_SEARCH_LIMIT=5
GOOGLE_PLAY_REVIEW_APP_LIMIT=5
GOOGLE_PLAY_REVIEW_LIMIT=50
APP_STORE_COUNTRIES=us,gb,de,fr,it,es,nl,se,dk,fi,no,ch,at,be,ie,pl,cz,pt
APP_STORE_SEARCH_LIMIT=10
APP_STORE_REVIEW_APP_LIMIT=5
APP_STORE_REVIEW_LIMIT=50
```

## Implementation steps

### 1. Add GitHub Actions workflow

Create `.github/workflows/crawl-daily.yml`:

- trigger: `schedule` + optional `workflow_dispatch`
- checkout repo
- setup Node.js with npm cache
- install dependencies
- run crawler with env from GitHub secrets
- upload crawler logs as artifact on failure
- fail job if crawler exits non-zero

### 2. Configure GitHub secrets

Required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional for v1:

- `SUPABASE_ANON_KEY` (only if needed by scripts)

Do not commit `.env`.

### 3. Add a minimal post-run check

After crawler success, run a lightweight verification:

- `npm run inspect:crawler`
- or a tiny script that asserts:
  - latest `crawl_runs` finished today
  - `source_items` count increased or stayed stable
  - no fatal crawler errors in output

### 4. Observe first week manually

For the first 7 runs, verify:

- workflow exits `0`
- `crawl_runs` increments daily
- `source_items` grows gradually
- no repeated DNS/network failures
- Supabase project stays active

### 5. Document operator workflow

Operator docs live in `README.md` (Daily Crawl section) and below.

#### GitHub secrets setup

1. Open the repo on GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. Add repository secrets:
   - `SUPABASE_URL` — from Supabase project settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (never commit this).
3. Optional: `SUPABASE_ANON_KEY` — only needed for local dev without service role.

#### Enable and test the workflow

1. Merge `.github/workflows/crawl-daily.yml` into the default branch (`main`). Scheduled cron runs only from the default branch.
2. Go to **Actions** → **Daily Crawl** → **Run workflow** for a manual test.
3. Wait for the job (~30–40 min). Steps: install → `npm run dev:crawler` → `npm run verify:crawler` → `npm run inspect:crawler`.
4. On success, check Supabase `crawl_runs` for new succeeded rows from today.

#### Logs and failure handling

- Success/failure: GitHub Actions job status and step logs.
- On failure: download the `crawler-logs-<run_id>` artifact (14-day retention).
- Retry once manually via **Run workflow**; if it fails again, verify secrets and inspect crawler logs.

## Success criteria

v1 is done when:

1. Nightly workflow runs automatically for 7 consecutive days.
2. At least 5 of 7 runs complete successfully without manual fixes.
3. Supabase receives new `crawl_runs` and additional `source_items` over the week.
4. Operator can manually re-run the workflow from GitHub UI.

## Failure handling

| Failure | Action |
|---|---|
| Network/DNS error | Retry once manually via `workflow_dispatch` |
| Crawler timeout | Increase job timeout; inspect slow market/app in logs |
| Supabase auth error | Check secrets |
| Partial market failure | Accept for v1 if overall job succeeds; log scope in `crawl_runs` metadata later |
| Missed day | Run manual catch-up crawl next day |

## Known limitations during accumulation

- Full re-fetch re-upserts many existing reviews.
- Existing `review_theme` signals are not refreshed on re-crawl.
- App Store review themes may still be sparse.
- Discoveries may include some non-productivity noise.

These do not block historical data accumulation.

## Follow-up work (after v1)

1. Incremental review fetch (last 24–48h on success; backfill since last successful run on failure).
2. Refresh existing `review_theme` signals instead of create-only dedup.
3. Scheduled analyzer run after successful crawl.
4. Store generated report artifact or send to Telegram/email.
5. Usage dashboard (`inspect:usage`) for DB growth monitoring.

## Suggested branch

`cursor/daily-crawl-scheduling`

## Related files

- `services/crawler/src/index.ts`
- `services/crawler/src/config.ts`
- `services/crawler/src/inspect.ts`
- `.env.example`
- `ROADMAP.md` (Stage 2 follow-ups)
