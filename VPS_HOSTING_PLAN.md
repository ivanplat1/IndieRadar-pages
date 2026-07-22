# VPS hosting plan (post-beta)

**Status (beta):** stay on **GitHub Actions** for nightly crawl, export, Pages deploy, and Telegram push. Interactive bot runs **locally** (`npm run dev:telegram`) or on a developer machine during closed beta.

**Trigger to migrate:** more niches, always-on multi-user bot, or GHA minutes consistently over the free 2000/min/month (~$6 per extra 1000 min).

---

## Why move off GHA

| Pressure | Now (beta) | At scale |
|---|---|---|
| Actions minutes | ~1950–2100/min per month (daily crawl ~1h × 30 + weekly rollup) | Grows with crawl duration and extra workflows |
| Cost | Free tier + small overage | Cheaper than stacking GHA overage + separate bot host |
| Always-on Telegram bot | Not required if push-only; local polling for testers | **Required** for onboarding, `/report`, settings buttons |
| Crawl + export time | ~5–10 min export for 5 niches × 2 locales | Linear in niches; GHA job timeout (360 min) becomes a risk |

Static GitHub Pages **stay** after migration — only the **build/deploy pipeline** moves to the server.

---

## Target architecture (one VPS)

| Workload | How | Notes |
|---|---|---|
| Telegram bot | `systemd`, 24/7 | Long polling (`npm run dev:telegram`) |
| Store crawl | cron | Same schedule: 03:00 Asia/Almaty = `0 22 * * *` UTC |
| Export Pages JSON | after crawl | `npm run export:pages -- <niche> <locale>` for each niche/locale |
| Deploy `IndieRadar-pages` | after export | `rsync` + git push with `PAGES_DEPLOY_TOKEN` |
| Nightly Telegram push | after deploy | `npm run push:telegram` |
| Weekly rollup + push | Sunday cron | `trend-weekly-rollup` + `npm run push:telegram:weekly` |

**GitHub Actions (slim):** CI typecheck, ops Telegram alerts, manual `workflow_dispatch` backfill only — **disable** `crawl-daily` schedule.

---

## Suggested VPS sizing

- **2 vCPU / 2 GB RAM** (Hetzner CX22, DO Basic ~$6/mo, etc.)
- Ubuntu 22/04 or 24/04, Node 22, git, rsync
- Secrets in `/opt/indieradar/.env` (never commit)
- PAT with write access to public `IndieRadar-pages` repo only

Bot idle RAM ~50–100 MB; crawl uses CPU/RAM for ~1 hour/night.

---

## Nightly script (sketch)

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /opt/indieradar
git pull --ff-only
npm ci
npm run dev:crawler
npm run verify:crawler
IFS=',' read -ra NICHES <<< "${CRAWLER_NICHE_SLUGS:-productivity,habit-tracker,finance,ai-chat,fitness}"
for niche in "${NICHES[@]}"; do
  niche="$(echo "$niche" | xargs)"
  for locale in ru en; do
    npm run export:pages -- "$niche" "$locale"
  done
done
# Deploy to IndieRadar-pages (clone + rsync + commit + push)
npm run push:telegram
```

Log to `/var/log/indieradar/crawl.log`; alert on non-zero exit (Telegram ops or email).

---

## systemd unit (bot sketch)

```ini
[Unit]
Description=IndieRadar Telegram bot
After=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/indieradar
EnvironmentFile=/opt/indieradar/.env
ExecStart=/usr/bin/npm run dev:telegram
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## Env vars on server

Same as GitHub secrets today:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`
- `TELEGRAM_BETA_*`, `CRAWLER_NICHE_SLUGS`, store market vars (see `.env.example`)
- `PAGES_REPOSITORY`, `PAGES_DEPLOY_TOKEN` (or deploy via SSH)
- `GITHUB_PAGES_BASE_URL` / `REPORT_PAGES_BASE_URL` for link generation in reports

---

## Migration checklist

1. Provision VPS, harden SSH, install Node 22.
2. Clone private repo, copy `.env`, `npm ci`, smoke-test crawler once manually.
3. Enable `systemd` bot service; verify onboarding + `/report`.
4. Install nightly script + cron; run once manually; verify Pages + pulse.
5. Disable `crawl-daily.yml` schedule (keep `workflow_dispatch`).
6. Monitor one week: crawl logs, Pages links, subscriber push.
7. Optional: add weekly cron for rollup + weekly push.

---

## Cost comparison (rough)

| Setup | ~Monthly |
|---|---|
| Beta today (GHA + local bot) | $0 (+ $0–3 Actions overage) |
| GHA crawl + Railway bot only | ~$5 |
| GHA overage at ~3000 min | ~$6 extra |
| **Single VPS (bot + crawl + deploy)** | **~$5–6 fixed** |

Railway Hobby ($5 + usage) is an alternative to VPS if ops prefer managed cron; one VPS is simpler when both bot and crawl must scale together.

---

## Related docs

- `docs/GITHUB_PAGES_SETUP.md` — Pages repo and export
- `docs/TELEGRAM_SETUP.md` — bot env and delivery modes
- `docs/DAILY_CRAWL_SCHEDULING_PLAN.md` — original GHA scheduler rationale (beta)
- `.github/workflows/crawl-daily.yml` — current nightly pipeline
