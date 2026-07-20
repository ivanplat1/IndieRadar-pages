# Trend Data Collection (Phase A)

Append-only history so IndieRadar can build a niche trend report in 3–6 months. **No trend report UI or Telegram push in this phase** — only data collection.

## What we store

| Table | Cadence | Purpose |
|---|---|---|
| `app_market_snapshots` | Daily after crawl | Rating / version / reviews_count curve per app×market |
| `niche_theme_weekly_rollups` | Weekly (Sunday) | Theme mention counts per app×market×week |
| `source_items` (reviews) | Ongoing | Raw reviews with `published_at` (theme tags applied at rollup time) |
| `signals` (`app_update`, `new_app`) | Ongoing | Already append-only event timeline |

`review_theme` signals and `market_apps.metadata` are still overwritten each crawl. Snapshots and rollups are the durable history.

## Horizon

| Window | Use |
|---|---|
| 90 days | Daily / weekly brief (existing) |
| **6 months** | Target for first trend report |
| 12 months | Metrics + rollups (not full raw reviews) |

Store APIs only return a short review tail (~50). Backfill cannot reconstruct a full year.

## Nightly path

1. `crawl-daily` runs Google Play + App Store for five niches: `productivity`, `habit-tracker`, `finance`, `ai-chat`, `fitness` (`CRAWLER_NICHE_SLUGS`).
2. After both crawls, crawler writes `app_market_snapshots` per niche for apps linked via `niche_apps` (cap: `SNAPSHOT_MAX_APPS_PER_NICHE` / `CRAWLER_NICHE_CANONICAL_REVIEW_LIMIT`, default 30).
3. Unique key `(app_id, market_country, market_language, snapshot_date)` prevents same-day duplicates.

## Weekly path

Sunday `04:30 UTC` — `.github/workflows/trend-weekly-rollup.yml` rolls up all five niches (or one niche when `workflow_dispatch` input is set):

```bash
npm run rollup:weekly -- productivity
# optional: --week 2026-07-13   # Monday UTC
```

Rollup logic:

1. Read review `source_items` with `published_at` in the completed ISO week (Mon–Sun UTC).
2. Match text → theme via `matchesReviewTheme()`.
3. Upsert `niche_theme_weekly_rollups` (only rows with mentions > 0).
4. Fallback: if no review source items matched, seed from `signals` type `review_theme` with `lastCrawledAt` in the week.

## Optional one-time backfill

Not part of nightly GHA:

```bash
npm run crawl:trends-backfill
```

Defaults: `CRAWLER_REVIEW_MAX_AGE_DAYS=180`, `CRAWLER_REVIEW_FETCH_HOURS=8760`. Then writes today's snapshots and a rollup for the current ISO week.

Expect at most ~90–180 days of reviews from the APIs, not a full year.

## Manual verify

```bash
# 1. Apply database/migrations/0005_trend_snapshots.sql in Supabase SQL editor
# 2. Crawl
npm run dev:crawler
# 3. Inspect
npm run inspect:crawler
# 4. Rollup last completed week
npm run rollup:weekly -- productivity
```

Example SQL:

```sql
-- Forest-style theme curve (replace app id / theme)
select week_start, market_country, review_mentions
from niche_theme_weekly_rollups
where theme_id = 'bugs_stability'
order by week_start desc
limit 20;

-- Rating drift for one app
select snapshot_date, market_country, market_language, score, version, reviews_count
from app_market_snapshots
where app_id = '<market_apps.id>'
order by snapshot_date desc
limit 30;
```

## Out of scope (later)

- `buildTrendReport(niche, locale, windowMonths)`
- Telegram trend push
- All niches beyond `productivity`
