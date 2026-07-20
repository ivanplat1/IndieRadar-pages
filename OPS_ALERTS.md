# Ops Telegram Alerts (v1)

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

## Message shape

```text
🚨 GitHub Actions failure

Workflow: Daily Crawl
Repo: owner/IndieRadar
Branch: main
SHA: abc1234
Failed job: crawl
Failed step: Run crawler

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
| `GITHUB_TOKEN` | Actions default (optional locally) | Fetch failed job names |
| `GITHUB_WORKFLOW` | Actions / manual | Workflow display name |
| `GITHUB_REPOSITORY` | Actions / manual | `owner/repo` |
| `GITHUB_SHA` | Actions / manual | Commit SHA |
| `GITHUB_REF` | Actions / manual | Branch name or `refs/heads/...` |
| `GITHUB_RUN_ID` | Actions / manual | Run id for the Actions URL |

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
| `npm run alert:gha -w @indieradar/telegram` | `tsx src/alertGhaFailure.ts` |

## Out of scope (v1)

- Alerts to beta subscribers
- Crawl quality / zero-signals alerts
- Reusing the product bot token
