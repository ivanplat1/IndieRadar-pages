# Planned Features (backlog)

Ideas approved in concept, **not scheduled for current beta slice**. Implement in separate dev chats after onboarding + beta feedback.

---

## Telegram beta onboarding

**In progress:** locale-first → niche picker buttons (`cursor/telegram-onboarding-picker`).

See onboarding DEV prompt in concept chat (picker UI: RU for `ru|be|kk|ky|uz`, EN for `uk` and rest).

---

## Find niche by app name

**Status:** deferred (post onboarding v1).

**Problem:** beta users may not know niche slug (`productivity`, `habit-tracker`, …).

**UX (target):**
- On niche step: button «🔍 Найти по приложению» / «Find by app name»
- User types competitor or own app name (e.g. `Forest`, `Todoist`)
- Bot suggests niche + confirm button

**Implementation tiers:**

| Tier | Approach | Effort | Limits |
|---|---|---|---|
| v1.1 | Search `market_apps` + `niche_apps` in Supabase (`ILIKE` name) | ~2–4h | Only apps already in crawl |
| v1.2 | Live Google Play / App Store search + `isAppRelevantToNiche()` | ~1 day | Latency, rate limits, noise |
| — | Unreleased / not-in-store apps | n/a | Manual niche pick or support |

**Out of scope:** auto-detect niche without a known store listing; AI classification.

**Depends on:** onboarding picker merged; enough apps per niche in DB.

---

## Future candidates (unprioritized)

- Theme balance fixes (see `ROADMAP.md` on `cursor/update-roadmap-status`)
- Trend report UI (`buildTrendReport`) after rollups mature
- App Store updates + release-note feature parsing (`cursor/app-store-updates`)
- Ops alerts v2 (silent failures: 0 signals, push skipped N nights)
- Billing / founding member
- Email delivery channel
- Positive review themes / sentiment mix
