# Telegram Evaluation Bot Setup

Bot: [@IndieRadarBot](https://t.me/IndieRadarBot) (display name: **IndieRadar**)

Delivery modes, no always-on server:

| Mode | Command | When |
|---|---|---|
| On-demand | `npm run dev:telegram` | Local long polling; onboarding + `/report` + `/week` |
| Daily push | `npm run push:telegram` | GitHub Actions after nightly crawl → active subscribers (delta-only) |
| Weekly push | `npm run push:telegram:weekly` | Sunday GHA + manual dispatch → active subscribers (**always** send) |

## Environment variables

Add to repo root `.env` for local development (same values as GitHub secrets where applicable):

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
TELEGRAM_BETA_OPEN=0
TELEGRAM_BETA_ALLOWLIST=
```

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
| `TELEGRAM_ADMIN_CHAT_ID` | Admin / superuser chat id (always allowed) |
| `TELEGRAM_BETA_OPEN` | `1` / `true` — anyone can `/start`; otherwise closed beta |
| `TELEGRAM_BETA_ALLOWLIST` | Comma-separated chat ids allowed when beta is closed |

GitHub Actions nightly/weekly push needs `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ADMIN_CHAT_ID` (admin fallback if the subscribers table is empty). Beta gate env vars are only required for local polling.

Also required for report generation:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Database migration

Apply `database/migrations/0004_telegram_subscribers.sql` in the Supabase SQL editor (or your usual migration path) before multi-user onboarding.

Table: `telegram_subscribers` — one row per Telegram chat (niche, locale, daily push flag).

Weekly push reuses the same recipients (`daily_push_enabled && is_active`); there is no separate weekly flag in v1.

## How to get a Telegram `chat_id`

1. Create or open the bot in [@BotFather](https://t.me/BotFather) — token goes into `TELEGRAM_BOT_TOKEN`.
2. Send `/start` to [@IndieRadarBot](https://t.me/IndieRadarBot).
3. Open in a browser (replace `<TOKEN>` with your bot token):

   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```

4. Copy `message.chat.id`.

Use your own id as `TELEGRAM_ADMIN_CHAT_ID`. Add beta testers to `TELEGRAM_BETA_ALLOWLIST` (or set `TELEGRAM_BETA_OPEN=1`).

## Beta user onboarding

1. User opens [@IndieRadarBot](https://t.me/IndieRadarBot) (must be allowed if beta is closed).
2. `/start` — welcome + instructions.
3. `/setniche productivity` — save niche (validated against `niches.slug`).
4. `/setlocale ru` or `/setlocale en` — save language → «Вы подключены к beta».
5. `/settings` — niche, locale, push on/off.
6. `/pause` / `/resume` — disable / enable nightly + weekly push.
7. `/report` — daily compact brief (saved niche/locale by default).
8. `/week` — weekly summary for the last 7 days.

Admin (`TELEGRAM_ADMIN_CHAT_ID`) is always allowed and can onboard like any other subscriber.

## Local usage

```bash
# Apply migration 0004 in Supabase first

# Terminal 1 — start polling bot
npm run dev:telegram

# In Telegram:
/start
/niches
/setniche productivity
/setlocale ru
/settings
/report
/week
/pause
/resume
```

Preview weekly text without Telegram:

```bash
npm run report:weekly -- productivity ru
```

## Nightly / manual push

```bash
# All active subscribers (or admin fallback if table empty)
npm run push:telegram

# Only subscribers on a niche (+ optional locale)
npm run push:telegram -- productivity
npm run push:telegram -- productivity ru

# Ignore delta check
npm run push:telegram -- --force
npm run push:telegram -- productivity ru --force
```

Delta: per `(niche, locale)` via `hasDailyPulseDelta`; same niche/locale is checked once and shared across recipients. Users with `daily_push_enabled=false` are skipped.

## Weekly push

Weekly summary **always sends** (no delta skip), even on a quiet week.

```bash
# All active subscribers (or admin fallback)
npm run push:telegram:weekly

# Filter by niche / locale
npm run push:telegram:weekly -- productivity
npm run push:telegram:weekly -- productivity ru
```

`--force` is accepted but unnecessary (weekly never skips for lack of delta).

## GitHub Actions

After a successful daily crawl, `.github/workflows/crawl-daily.yml` runs:

```bash
npm run push:telegram
```

**Weekly summary:** `.github/workflows/telegram-weekly.yml`

- Schedule: Sunday `04:00` UTC
- Manual: Actions → **Telegram Weekly Summary** → **Run workflow**

**Quick daily test without crawler:** Actions → **Telegram Push** → **Run workflow** (filters by niche/locale, `--force`, ~1–2 min).

### Required GitHub secrets

| Secret | Description | Status |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | Configured |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Configured |
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather | Configured |
| `TELEGRAM_ADMIN_CHAT_ID` | Admin chat id (fallback recipient) | Configured |

## Commands

| Command | Behavior |
|---|---|
| `/start` | Welcome / status |
| `/niches` | List niches |
| `/setniche <slug>` | Save niche |
| `/setlocale ru\|en` | Save locale |
| `/settings` | Show prefs + push flag |
| `/pause` / `/resume` | Toggle nightly + weekly push |
| `/report` | Compact daily brief (saved niche/locale, else productivity/ru) |
| `/report <niche> full` | Full brief by sections |
| `/report full` or `/report file` | `.md` document |
| `/week` | Weekly summary (saved niche/locale) |
| `/week <niche> [ru\|en]` | Weekly summary for niche/locale |

Default locale for new subscribers: `ru`. HTML formatting: bold section headers + emoji.

See also: `docs/TELEGRAM_EVALUATION_BOT_PLAN.md`, `docs/REPORT_DELIVERY_MODEL.md`
