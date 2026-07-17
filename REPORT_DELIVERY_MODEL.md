# Report Delivery Model

## Product vision

IndieRadar reports should feel like a **chat inbox**, not a repetitive newsletter.

The user can:

- receive a **daily pulse only when there is meaningful delta**;
- read missed daily pulses later in the same chat history;
- receive a separate **weekly summary** message at the end of the week;
- open a full brief on demand when needed.

This solves sparse-signal days without abandoning the daily product rhythm.

## Delivery modes

### 1. Daily pulse (delta-only)

Short message, one screen.

Send only if at least one delta trigger fires:

- new signal;
- increased review count for an existing theme;
- new market added to an existing theme;
- app update detected;
- new app discovered in store scan;
- top priority signal changed.

If there is no delta: **do not send**.

Example:

```text
📊 Productivity · 15 Jul

Новое с вчера:
• Google Calendar — bugs +2 reviews (DE, FR)
• Forest — pricing repeated on App Store (PL)

Main shift: Calendar bugs strengthened across 2 more markets

[Open full brief]
```

### 2. Weekly summary (always send)

**Status (v1):** implemented for Telegram — `buildWeeklyReport()`, `/week`, Sunday GHA `telegram-weekly.yml`, `npm run push:telegram:weekly`. Aggregates current `signals` over a 7-day window (no `report_snapshots` yet).

Separate message, different abstraction level.

Sent once per week even if several days had no daily pulse.

Example:

```text
📅 Weekly · Productivity · 11–17 Jul 2026

Trends:
1. Calendar bugs — leader of the week (12 reviews, 8 markets)
2. Forest pricing/paywall — stable #2

New this week: ...
Strengthened: ...
Next week actions: ...

[Open full weekly report]
```

Weekly should aggregate and interpret the week, not duplicate 7 daily pulses.

### 3. Full brief (on demand)

Full markdown report remains available:

- linked from pulse / weekly messages;
- opened via bot command;
- later via web view.

Full brief is drill-down, not the default push format.

## Why chat history matters

Chat history enables async reading:

- user may ignore Mon and Wed pulses;
- on Friday they scroll up and read 3 days at once;
- weekly summary stays as a separate anchor message in the same thread.

This is the core UX advantage over email for early IndieRadar.

## Confirmed MVP channels

**Decision:** personalized delivery via:

1. **Telegram bot** — primary channel, private chat, inbox history.
2. **Email** — secondary channel, only if user provided an email.

Rules:

- Telegram is always attempted when user linked Telegram.
- Email is sent only when `email` is present and email delivery is enabled.
- User can use both channels at once.
- Code must be built with **channel interfaces** so WhatsApp, web inbox, Slack, etc. can be added later without rewriting report generation.

Native app is **out of scope** until retention and paid usage are proven.

## Channel architecture (interface-first)

Keep report generation separate from delivery. Suggested package: `services/delivery`.

### Core types

```ts
type DeliveryChannelId = "telegram" | "email" | "whatsapp" | "web_inbox" | "slack";

type DeliveryMessageType = "daily_pulse" | "weekly_summary" | "full_brief";

type DeliveryPayload = {
  type: DeliveryMessageType;
  nicheSlug: string;
  locale: "ru" | "en";
  subject: string;
  shortText: string;
  fullText?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
};

type DeliveryRecipient = {
  userId: string;
  telegramChatId?: string;
  email?: string;
};

type DeliveryResult = {
  channel: DeliveryChannelId;
  success: boolean;
  externalMessageId?: string;
  error?: string;
};
```

### Channel interface

```ts
interface ReportDeliveryChannel {
  readonly id: DeliveryChannelId;

  canDeliver(recipient: DeliveryRecipient): boolean;

  deliver(
    recipient: DeliveryRecipient,
    payload: DeliveryPayload
  ): Promise<DeliveryResult>;
}
```

### Orchestrator interface

```ts
interface ReportDeliveryService {
  deliverToUser(
    recipient: DeliveryRecipient,
    payload: DeliveryPayload,
    options?: { channels?: DeliveryChannelId[] }
  ): Promise<DeliveryResult[]>;
}
```

### MVP implementations

| Adapter | When used |
|---|---|
| `TelegramDeliveryChannel` | `recipient.telegramChatId` is set |
| `EmailDeliveryChannel` | `recipient.email` is set and email enabled |
| `WhatsAppDeliveryChannel` | later stub / not implemented |
| `WebInboxDeliveryChannel` | later stub / not implemented |

Orchestrator logic for MVP:

```text
for channel in enabledChannels(recipient):
  if channel.canDeliver(recipient):
    results.push(await channel.deliver(recipient, payload))
```

Report generators (`daily pulse`, `weekly summary`, `full brief`) produce one `DeliveryPayload`. Channels only handle transport + formatting limits.

### Formatting per channel

| Channel | daily pulse | weekly summary | full brief |
|---|---|---|---|
| Telegram | short text + button/link | separate message | link or `/full` command |
| Email | optional short mail | recommended primary use | HTML/markdown body |

Email is especially good for weekly summary and full brief archive. Telegram remains best for daily pulse inbox UX.

## Data model (conceptual)

### `report_snapshots`

Per niche, per day:

- `niche_id`
- `snapshot_date`
- `signal_fingerprint`
- `top_signals_json`
- `priority_ranking_json`

Used for delta detection and weekly aggregation.

### `report_deliveries`

Per user delivery record:

- `user_id`
- `niche_id`
- `delivery_type` (`daily_pulse` | `weekly_summary` | `full_brief`)
- `window_start`
- `window_end`
- `delta_fingerprint`
- `message_text`
- `external_message_id` (Telegram message id, etc.)
- `sent_at`

### `user_delivery_preferences`

- `user_id`
- `niche_id`
- `locale`
- `telegram_chat_id` optional
- `email` optional
- `telegram_enabled` default true when linked
- `email_enabled` default false until email provided
- `daily_pulse_enabled`
- `weekly_summary_enabled`
- `quiet_days` optional later

Email is never required. Telegram-only users are valid.

## Delta detection

Compare current snapshot with previous sent state:

```text
current_fingerprint = hash(
  top_priority_signals,
  review_theme_counts,
  markets_per_theme,
  new_apps,
  app_updates
)
```

Send daily pulse when `current_fingerprint != last_sent_fingerprint`.

Weekly summary uses snapshots from the last 7 days, not a fresh full re-crawl.

## Build order

1. Signal refresh + daily snapshot persistence
2. Delta detection
3. Daily pulse generator
4. ~~Weekly summary generator~~ **done (v1 Telegram; signals window, not snapshots)**
5. `services/delivery` with channel interfaces
6. `TelegramDeliveryChannel` adapter
7. `EmailDeliveryChannel` adapter (only if email present)
8. Delivery orchestrator + `report_deliveries` persistence
9. User preferences (niche, locale, telegram link, optional email)

## Messenger strategy

See messenger comparison below.

**MVP channels:** Telegram bot + Email if provided.

**Later:** WhatsApp, web inbox, public Telegram channel, Slack for teams.

**Not now:** native mobile app.

---

## Messenger comparison

### Evaluation criteria

| Criterion | Why it matters |
|---|---|
| Chat history | user reads 1–3 days later |
| Private per-user settings | niche, locale, on/off |
| Setup complexity | solo founder MVP speed |
| API cost | free tier viability |
| RU / global reach | audience fit |
| Rich text / links | report readability |
| Interactive commands | `/productivity`, `/week`, settings |
| Reliability | cron + webhook stability |

### Telegram Bot (private chat)

**Pros**

- Best fit for inbox UX: personal chat history, scroll back anytime.
- Easy bot API, webhooks, low cost.
- Strong in RU/CIS and global indie/founder audience.
- Supports commands, inline buttons, links to full report.
- Fastest MVP path.

**Cons**

- User must start bot first (`/start`).
- Not ideal for passive broadcast to unknown audience without onboarding.
- Message formatting limits for very long reports.

**Best for:** primary delivery channel for beta users.

### Telegram Channel

**Pros**

- Simple broadcast model.
- Good for marketing/public niche feeds later.
- Users can read history like a feed.

**Cons**

- One channel = one niche/language mix unless many channels.
- No per-user preferences.
- Less interactive than bot.
- Harder to support multi-niche personal subscriptions.

**Best for:** public demo feed, not personal MVP.

### Email

**Pros**

- Universal, professional, easy archive/search.
- Good for full long-form weekly report.
- No messenger dependency.

**Cons**

- Weaker “read 3 days in chat” UX.
- More friction for daily micro-updates.
- Deliverability/setup overhead (SPF, DKIM, templates).

**Best for:** universal fallback and weekly archive. MVP channel #2 when user provides email.

### Slack

**Pros**

- Strong for team/shared market intel.
- Webhooks and bot ecosystem.

**Cons**

- Assumes team workspace, not solo indie founder by default.
- Overkill for personal brief MVP.
- Harder onboarding than Telegram.

**Best for:** later B2B / team plan.

### Discord

**Pros**

- Community-friendly, channel history.

**Cons**

- Feels community-first, not personal inbox.
- Bot setup heavier than Telegram for this use case.

**Best for:** community edition later, not first delivery channel.

### WhatsApp Business API

**Pros**

- Huge global reach.

**Cons**

- Business API setup, cost, template approval.
- Poor fit for fast indie MVP.
- More compliance overhead.

**Best for:** later scale, not MVP.

## Recommended delivery stack

### Phase 1 — MVP

- **Primary:** Telegram bot, private chat
- **Secondary:** Email, only if user provided email
- **Architecture:** `ReportDeliveryChannel` interfaces + orchestrator
- **Messages:** daily pulse if delta, weekly summary always
- **Full brief:** Telegram command/link; email for long-form when enabled

### Phase 2

- User choice: daily pulse on/off, weekly on/off per channel
- Optional public Telegram channel per niche for marketing
- Web inbox using same delivery payloads

### Phase 3

- WhatsApp adapter behind the same interface
- Slack / team inbox
- Evaluate native app only after retention + paid demand

## Onboarding fields (MVP)

```text
/start in Telegram
→ choose niche(s)
→ choose locale
→ optional: add email for weekly/full archive
→ confirm: daily pulse + weekly summary
```

Validate channel demand in onboarding, do not pre-build every messenger.

## Suggested bot commands (MVP)

```text
/start
/niches
/productivity
/week productivity
/full productivity
/email you@example.com
/settings
/pause
/resume
```

## Dev chat prompt

```text
Implement IndieRadar report delivery MVP with interface-first channel architecture.

Read:
- docs/REPORT_DELIVERY_MODEL.md
- docs/DAILY_BRIEF_REPORT_DEBUG_PLAN.md

Goal:
- daily pulse only when delta exists
- weekly summary as separate message
- Telegram bot as primary channel
- Email delivery only when user provided email
- channel adapters behind interfaces for future WhatsApp/web/Slack

Architecture:
- create `services/delivery`
- define `ReportDeliveryChannel`, `ReportDeliveryService`, `DeliveryPayload`
- implement `TelegramDeliveryChannel`
- implement `EmailDeliveryChannel`
- orchestrator sends through all eligible channels

Build order:
1. report_snapshots + delta fingerprint
2. daily pulse generator
3. weekly summary generator
4. delivery interfaces + orchestrator
5. Telegram adapter
6. Email adapter (optional per user)
7. user preferences (telegram link, optional email)

Out of scope:
- WhatsApp implementation (interface only / stub ok)
- public Telegram channel
- web inbox
- native app
- AI summaries

Deliverables:
- schema/migrations if needed
- `services/delivery` package
- docs for Telegram + email env vars
- test flow:
  - delta → Telegram pulse sent
  - no delta → no pulse
  - week end → weekly sent
  - user with email → weekly/full also emailed
```
