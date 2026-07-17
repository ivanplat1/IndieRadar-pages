# Workstream Scopes

IndieRadar work is split across chat sessions by **intent**, not by automatic Cursor modes.
At the start of a chat, declare the mode in the first message when helpful:

```text
Режим: CONCEPT
Режим: DEV
Режим: OPS
```

## Modes

| Mode | Purpose | Do | Don't |
|---|---|---|---|
| **CONCEPT** | Product, plans, prompts, trade-offs | Discuss, decide, write/update `docs/*`, draft prompts for other chats | Implement code, run crawls, commit unless explicitly asked to document only |
| **DEV** | Implementation | Code, tests, migrations, workflows, commit/push when asked | Redesign product from scratch without need; skip linked plan docs |
| **OPS** | Run, debug, observe | Run crawler/analyzer/bot, read logs, CI, Supabase counts | Large refactors; new features without a plan |

## Redirect cheat sheet

If the request does not match the current mode, **stop and remind** the user which chat/mode fits.

| Request | Right mode |
|---|---|
| "Какой мессенджер выбрать?", "weekly vs daily?", naming, roadmap | **CONCEPT** |
| "Сделай Telegram compact format", "fix false positives", PR | **DEV** |
| "Запусти crawl", "почему GHA failed", "сколько в Supabase" | **OPS** |
| "Давай промт для другого чата" | **CONCEPT** (output prompt only) |
| "Execute commit-and-push" | **DEV** or **OPS** (git), not concept-only |

## Agent reminder template

When out of scope, reply briefly:

```text
Это скорее задача для [DEV/OPS/CONCEPT] чата.
Здесь могу: [1–2 bullets in current mode].
Перенести в другой чат или сделать здесь?
```

## Linked plans (by topic)

| Topic | Doc | Typical mode |
|---|---|---|
| Daily brief quality | `docs/DAILY_BRIEF_REPORT_DEBUG_PLAN.md` | DEV |
| Nightly crawl | `docs/DAILY_CRAWL_SCHEDULING_PLAN.md` | DEV + OPS |
| Telegram bot | `docs/TELEGRAM_EVALUATION_BOT_PLAN.md`, `docs/TELEGRAM_SETUP.md` | DEV + OPS |
| Report delivery (future) | `docs/REPORT_DELIVERY_MODEL.md` | CONCEPT → DEV |
| Data model | `docs/DATA_MODEL.md` | DEV |

## Limits of this approach

- Cursor does **not** know chat history from other tabs automatically.
- Rules reduce drift; they do not replace a one-line mode prefix in the first message.
- When unsure, ask once instead of implementing the wrong scope.
