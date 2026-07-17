# Telegram Evaluation Bot Plan

## Goal

Evaluate the daily brief product in Telegram without paying for an always-on server.

Bot: **@IndieRadarBot** (display name: **IndieRadar**)

## Delivery modes (v0.5)

| Mode | How | Server cost |
|---|---|---|
| **Scheduled push** | GitHub Actions after nightly crawl → `sendMessage` | $0 |
| **On-demand** | Local `npm run dev:telegram` with long polling | $0 |

No webhook, VPS, or Cloudflare required for evaluation.

## Scope v0.5

### Included

- Single admin user: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ADMIN_CHAT_ID`
- Ignore messages from other `chat_id`
- Commands: `/start`, `/niches`, `/report <niche> [ru|en]`
- Report generation via existing `buildDailyReport()`
- Split long reports for Telegram 4096 char limit
- Shared `sendReportToTelegram()` for bot and GitHub Actions
- Nightly push: `productivity ru` after successful crawl

### Excluded

- Delta-only pulse
- Weekly summary
- Email delivery
- User preferences in database
- Multi-user onboarding
- Webhook / always-on hosting
- Full `ReportDeliveryChannel` orchestrator (later)

## Package structure

Suggested: `services/telegram/`

```
services/telegram/
  src/
    bot.ts      # polling + command handlers
    send.ts     # sendMessage + split logic
    index.ts    # npm run dev:telegram
  package.json
```

## Commands

| Command | Behavior |
|---|---|
| `/start` | Welcome + short usage |
| `/niches` | List niches from Supabase |
| `/report productivity ru` | Generate and send full brief |
| `/report finance en` | Same for other niche/locale |

Default locale: `ru`.

## Environment variables

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
```

Add to `.env` locally and GitHub Actions secrets. Never commit real values.

## How to get `TELEGRAM_ADMIN_CHAT_ID`

1. Create bot via [@BotFather](https://t.me/BotFather) → `@IndieRadarBot`
2. Send `/start` to the bot in Telegram
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Copy `message.chat.id` from the response

## GitHub Actions flow

After successful nightly crawl:

```text
npm run dev:crawler
  → generate productivity RU report
  → sendReportToTelegram(report, TELEGRAM_ADMIN_CHAT_ID)
```

Requires secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_CHAT_ID`

See also: `docs/DAILY_CRAWL_SCHEDULING_PLAN.md`

## BotFather metadata

**Name:** IndieRadar

**Description:** Daily market briefs for indie app niches. Review signals, competitor moves, opportunities.

**About:** Productivity, finance and more. Daily brief for indie founders.

**Commands:**

```text
start - Start and see usage
niches - List available niches
report - Get latest niche brief
```

## Build order

1. `services/telegram` package
2. `send.ts` with message splitting
3. Local polling bot + commands
4. Wire to `buildDailyReport()`
5. Add GHA step for nightly push
6. Document setup in README

## Success criteria

- Local `/report productivity ru` sends full report to admin chat
- GHA can send the same report after crawl without a server
- Non-admin chat IDs are ignored
- Long reports are split, not silently truncated

## Later (full delivery)

When evaluation is positive, extend using `docs/REPORT_DELIVERY_MODEL.md`:

- delta-only daily pulse
- weekly summary message
- optional email
- `ReportDeliveryChannel` interfaces
- user preferences

## Suggested branch

`cursor/telegram-evaluation-bot`

## Dev chat prompt

```text
Реализуй минимальный Telegram evaluation bot для IndieRadar: @IndieRadarBot

Репо: /Users/ivanplatonov/IndieRadar/IndieRadar
Ветка: cursor/telegram-evaluation-bot (от актуальной base)
Бот уже создан в BotFather: @IndieRadarBot
План: docs/TELEGRAM_EVALUATION_BOT_PLAN.md

Цель: личная оценка daily brief в Telegram без платного always-on сервера.

Два режима:
1. Scheduled push — после nightly crawl в GitHub Actions → productivity RU brief в admin chat
2. On-demand — локально npm run dev:telegram, команды /report по запросу

Scope v0.5:
- TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID, только admin
- /start, /niches, /report <niche> [ru|en]
- buildDailyReport() + split для лимита 4096
- services/telegram: bot.ts, send.ts, index.ts
- shared sendReportToTelegram() для bot и GHA

Не делать: delta, weekly, email, user DB, webhook, multi-user, full delivery orchestrator.

Deliverables:
- services/telegram + npm run dev:telegram
- GHA step для nightly push
- .env.example vars
- docs: как получить chat_id
- тест: /report productivity ru

Критерии: локальный /report работает, GHA push без сервера, чужие chat_id игнорируются, длинный отчёт split.
```
