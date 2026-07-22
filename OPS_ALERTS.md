# Ops Telegram Alerts

Admin-only alerts when a key GitHub Actions workflow fails.

Uses a **separate ops bot** ([@indieRadarAlertBot](https://t.me/indieRadarAlertBot)) — not the product [@IndieRadarBot](https://t.me/IndieRadarBot) / daily-weekly push token.

## What triggers an alert

Workflow: `.github/workflows/ops-telegram-alerts.yml`

| Event | Condition |
|---|---|
| `workflow_run` completed | `conclusion == failure` |
| Watched workflows | Daily Crawl, Telegram Weekly Summary, Telegram Push, Trend Weekly Rollup, Deploy Report Pages |
| Skip | Triggering workflow is Ops Telegram Alerts itself |

Successful runs do **not** send a message.

### v2 — silent failures now fail the workflow

Previously some pipeline steps could succeed while delivery was broken (Pages skipped, stale exports, zero signals). **Daily Crawl** now ends with health checks that **fail the job** → same ops alert as any other GHA failure.

| Check | When | Fails if |
|---|---|---|
| Pages deploy required | after export | `PAGES_DEPLOY_TOKEN` / `PAGES_REPOSITORY` missing, or no git diff to push |
| Local exports fresh | after deploy + push | any `docs/data/reports/{niche}/{locale}/daily.json` missing or `generatedAt` older than 6h |
| Live Pages fresh | after deploy + push | public `daily.json` missing, stale, or unreachable (retries up to ~3 min) |
| Signal health | after deploy + push | any beta niche has &lt; 1 signal in 48h, or latest crawl created 0 review signals |
| Telegram push | push step | any recipient send failed |

Tune thresholds via env (see below).

## Message shape

```text
🚨 GitHub Actions failure

Workflow: Daily Crawl
Repo: owner/IndieRadar
Branch: main
SHA: abc1234
Failed job: crawl
Failed step: Verify nightly pipeline health

View run
```

Rendered as Telegram HTML. **Failed job** / **Failed step** come from the Actions Jobs API when `GITHUB_TOKEN` is available (step name only — no log dump).

## Setup

1. Create a dedicated bot in [@BotFather](https://t.me/BotFather) (ops/alerts only).
2. Open a chat with that bot and send `/start`.
3. Put the token and your chat id into secrets / `.env` (table below). Chat id can differ from the product admin chat.

## Secrets / env

| Name | Where | Purpose |
|---|---|---|
| `TELEGRAM_OPS_BOT_TOKEN` | GitHub Actions secret + local `.env` | Ops bot token (not product bot) |
| `TELEGRAM_OPS_ADMIN_CHAT_ID` | GitHub Actions secret + local `.env` | Ops alert recipient |
| `PAGES_DEPLOY_TOKEN` | GitHub Actions secret | Required for nightly Pages deploy |
| `PAGES_REPOSITORY` | GitHub Actions secret | Public Pages repo (`owner/IndieRadar-pages`) |
| `REPORT_PAGES_BASE_URL` | GitHub Actions secret (optional) | Live Pages check URL base |
| `GITHUB_TOKEN` | Actions default (optional locally) | Fetch failed job names |
| `GITHUB_WORKFLOW` | Actions / manual | Workflow display name |
| `GITHUB_REPOSITORY` | Actions / manual | `owner/repo` |
| `GITHUB_SHA` | Actions / manual | Commit SHA |
| `GITHUB_REF` | Actions / manual | Branch name or `refs/heads/...` |
| `GITHUB_RUN_ID` | Actions / manual | Run id for the Actions URL |

### Pipeline health tuning (optional)

| Name | Default | Purpose |
|---|---|---|
| `PIPELINE_REQUIRE_PAGES_DEPLOY` | `1` in Daily Crawl | Require live Pages freshness check |
| `OPS_EXPORT_MAX_AGE_HOURS` | `6` | Max age for local + live `daily.json` |
| `OPS_SIGNAL_WINDOW_HOURS` | `48` | Window for per-niche signal counts |
| `OPS_MIN_SIGNALS_PER_NICHE` | `1` | Minimum signals per beta niche |
| `OPS_MIN_REVIEW_SIGNALS_CREATED` | `1` | Minimum `reviewSignalsCreated` in latest crawl stats |
| `OPS_PAGES_LIVE_ATTEMPTS` | `6` | Live Pages HTTP retries |
| `OPS_PAGES_LIVE_DELAY_MS` | `30000` | Delay between live Pages retries |

Permissions on the alert job: `actions: read` (job details), `contents: read` (checkout).

> Note: GitHub Actions ignores `GITHUB_*` overrides in the workflow `env:` map. The alert job exports the failed run’s metadata in the shell step before `npm run alert:gha`.

## Local / manual test

From repo root (with `.env` containing ops bot token + ops admin chat id):

```bash
export GITHUB_WORKFLOW="Manual test failure"
export GITHUB_REPOSITORY="ivanplat1/IndieRadar"   # your repo
export GITHUB_SHA="$(git rev-parse HEAD)"
export GITHUB_REF="$(git rev-parse --abbrev-ref HEAD)"
export GITHUB_RUN_ID="0"   # link will 404; fine for smoke test
# optional: export GITHUB_TOKEN=ghp_...  for job name lookup

npm run alert:gha
```

Expect one message from the **ops** bot in the ops admin chat.

### Pipeline health (local)

```bash
# After export + Pages deploy
PIPELINE_REQUIRE_PAGES_DEPLOY=1 npm run verify:pipeline

# Pages / exports only
PIPELINE_REQUIRE_PAGES_DEPLOY=1 npm run verify:pages

# Supabase signal counts only
npm run verify:signals
```

## Intentional failure test (GHA)

1. Confirm secrets `TELEGRAM_OPS_BOT_TOKEN` and `TELEGRAM_OPS_ADMIN_CHAT_ID` exist in the repo.
2. Run **Deploy Report Pages** with `force_fail=true`:

   ```bash
   gh workflow run "Deploy Report Pages" -f force_fail=true
   ```

3. On failure → ops-bot alert with run link.
4. Re-run without `force_fail` (or `force_fail=false`) → no alert.

## Scripts

| Command | Package |
|---|---|
| `npm run alert:gha` | root → `@indieradar/telegram` |
| `npm run verify:pipeline` | nightly: signals + exports + live Pages |
| `npm run verify:pages` | exports + live Pages only |
| `npm run verify:signals` | Supabase signal health only |

## Out of scope

- Alerts to beta subscribers
- Warning alerts on successful runs (failures only — keeps noise low)
- Reusing the product bot token
