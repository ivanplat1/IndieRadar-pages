# Daily Brief Report Debug Plan

## Goal

Bring the daily brief report (RU/EN) to production MVP quality for the `productivity` niche:

- multi-market coverage in review themes;
- few false positives;
- discoveries without obvious noise;
- signals reflect fresh data after repeat crawls.

**Not in scope for this workstream:**

- GitHub Actions scheduling (`docs/DAILY_CRAWL_SCHEDULING_PLAN.md`);
- full vs short report toggle;
- AI summaries (Stage 3);
- new report types such as App Deep Dive.

## Current architecture

- Crawler writes signals to Supabase (`review_theme`, `new_app`, `app_update`).
- Analyzer: `services/analyzer/src/report.ts` — rule-based templates, no LLM.
- Review snippet translation: `services/analyzer/src/translate.ts` (Google Translate).
- Theme rules: `services/crawler/src/reviewThemes.ts`.
- Niche filter at crawl time: `services/crawler/src/nicheRelevance.ts`.
- Analyzer re-filters stored signals via `isReviewThemeSignalRelevant()` and `matchesReviewTheme()`.

Useful commands:

```bash
npm run dev:analyzer -- productivity ru
npm run dev:analyzer -- productivity en
npm run dev:analyzer -- finance ru
npm run inspect:crawler
npm run dev:crawler
```

## Known problems

### P0 — review theme quality

1. **False positives in `bugs_stability`**
   - Example: Todoist CH review "works cleanly, no errors" classified as bugs/stability.
   - Need intent-aware negative patterns for positive stability mentions.

2. **App Store barely produces `review_theme` signals**
   - Last full crawl: App Store `reviewsFetched=225`, `reviewSignalsCreated=0`.
   - Google Play: `reviewSignalsCreated=19`.
   - Productivity report is mostly Google Play in review themes.
   - Investigate `services/crawler/src/appStore.ts` theme extraction, freshness, and sample review metadata.

3. **Signals are not refreshed on re-crawl**
   - `reviewThemeSignalExists()` uses create-only dedup per niche + app + theme + market.
   - Repeat crawls do not update count, markets, freshness, or sample reviews.
   - Report does not reflect day-to-day dynamics.

### P1 — discoveries and classification

4. **Noise in App Discoveries (productivity)**
   - Examples: OnSkin, Oral-B appear as competitors.
   - Tighten `nicheRelevance.ts` for App Store and/or post-filter `new_app` in analyzer.

5. **`getDiscoveryCategory()` is hardcoded for productivity**
   - Categories in `report.ts`: focus, tasks, habits, notes.
   - Finance report mislabels Yahoo Finance as focus and Fidelity as notes/calendar.
   - Need niche-aware categories or neutral per-niche labels.

### P2 — report completeness

6. **Other niches produce thin reports**
   - `finance`: ~12 signals, 1 market, 2 themes, 0 updates.
   - Check whether this is missing crawl data or analyzer behavior.
   - Not a blocker for productivity MVP, but document as known gap.

## Work order

### Step 1: Diagnosis (read-only)

- Read `ROADMAP.md`, `report.ts`, `reviewThemes.ts`, `appStore.ts`, `googlePlay.ts`, `nicheRelevance.ts`.
- Query Supabase for productivity signal counts by type and platform.
- Generate `productivity ru` and `en` baselines.

### Step 2: Fix false positives (quick win)

- Improve `reviewThemes.ts` for `bugs_stability`, `pricing_paywall`, `sync_accounts`, `ads`.
- Add negative patterns / sentiment guards.
- Keep analyzer re-filter aligned with crawler rules.
- Regression: Todoist positive review no longer appears under bugs.

### Step 3: App Store review themes

- Trace why 0 signals appear despite fetched reviews.
- Fix root cause in crawler, not analyzer workaround.
- Target: App Store `review_theme` signals visible in productivity report.

### Step 4: Signal refresh on re-crawl

- Replace skip-only dedup with upsert/update of metadata:
  - `reviewCount`, markets, `reviewWindow`, `sampleReviews`, `occurred_at`.
- Ensure analyzer grouping uses updated fields.

### Step 5: Discoveries cleanup

- Tighten niche relevance and/or analyzer post-filter for `new_app`.
- Make `getDiscoveryCategory()` niche-aware.

### Step 6: Verify MVP done

Run `npm run dev:analyzer -- productivity ru` and compare with demo baseline.

**Done when:**

1. Review themes include Google Play and App Store.
2. No obvious false positives in top priority signals.
3. Discoveries exclude Oral-B / OnSkin-level noise.
4. Repeat crawl updates counts for at least one app/theme.

## Constraints

- Minimal diff; do not refactor all of `report.ts`.
- Match repo style and conventions.
- Do not commit `.env`.
- Commit only when requested.

## Deliverables

1. Root-cause list with file references.
2. Fixes in priority order P0 → P1.
3. `ROADMAP.md` update for closed vs remaining items.
4. Final productivity RU report for before/after comparison.

## Suggested branch

`cursor/fix-daily-brief-reports`

## Dev chat prompt

```
Отладка daily brief отчётов IndieRadar до production MVP.

Репо: /Users/ivanplatonov/IndieRadar/IndieRadar
План: прочитай и следуй `docs/DAILY_BRIEF_REPORT_DEBUG_PLAN.md`
Ветка: создай `cursor/fix-daily-brief-reports` от актуальной base branch

Цель: довести daily brief по нише `productivity` (RU/EN) до production MVP.

Не в scope: GitHub Actions scheduling, full/short toggle, AI summaries, App Deep Dive.

Известные проблемы:
- false positives в review themes (Todoist «ошибок нет» → bugs)
- App Store: 225 reviews, 0 review_theme signals
- signals не обновляются при re-crawl (create-only dedup)
- discoveries шум: OnSkin, Oral-B
- getDiscoveryCategory() захардкожен под productivity

Порядок: диагностика → false positives → App Store themes → signal refresh → discoveries → verify.

Команды:
npm run dev:analyzer -- productivity ru
npm run inspect:crawler
npm run dev:crawler

Критерии готовности — см. план. После фиксов покажи diff и before/after отчёт.
```
