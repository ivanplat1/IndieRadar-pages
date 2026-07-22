# Planned Features (backlog)

Ideas approved in concept, **not in the current beta slice**. See `ROADMAP.md` for active priorities.

---

## AI prompt export («Continue in your AI»)

**Status:** approved in concept — after beta feedback on daily brief usefulness (target: Stage 2+ / bridge before Stage 3).

**Problem:** Indie devs already use ChatGPT, Claude, Cursor, etc. IndieRadar answers *what* is happening in the market; the next step is *what to do for my app* — often explored in an external AI chat, not inside our bot.

**Idea:** From a report block the user cares about (theme, app, opportunity, weekly top signal), generate a **copy-paste prompt** pre-filled with IndieRadar context so they can continue the discussion in their preferred AI tool — without building in-product LLM billing/API in v1.

**Product principle:** *AI-agnostic — we don't replace your AI; we make it market-aware.* Prefer export + deep links over in-product chat when it matches indie dev workflow.

### UX (target)

| Surface | Trigger | Delivery |
|---|---|---|
| Telegram | Buttons under theme / opportunity | **Open in ChatGPT / Claude** (short URL) + **Copy full prompt** (markdown) |
| GitHub Pages | «Continue in AI» near theme, app drill-down, opportunities | Provider dropdown + clipboard |

**User flow:**
1. User reads brief (pulse, priority signal, opportunity).
2. Taps **«Open in ChatGPT»** / **«Copy full prompt»** (or Claude).
3. **Link path:** external AI opens with a **short prefill** (~300–800 chars) + link back to full IndieRadar context on Pages.
4. **Copy path:** full structured prompt (~500–1500 tokens, translated) in clipboard — paste if they prefer Cursor or a longer chat.
5. Continues in their tool (positioning, roadmap, interview script, etc.).

### Deep links to external AI (v1.2)

Full prompt **does not fit** in a URL (~500–1500 tokens vs ~2000 char browser/Telegram limits). Use a **hybrid**:

| Action | Content | Limit |
|---|---|---|
| **Open in ChatGPT / Claude** | Short prefill: signal summary, 1–2 translated quotes, suggested question, link to Pages report section | ≤ ~800 chars encoded |
| **Copy full prompt** | Complete markdown context (all quotes, apps, markets, intent) | No practical limit |

**Supported providers (best-effort):**

| Provider | URL format | Notes |
|---|---|---|
| **ChatGPT** | `https://chatgpt.com/?q={encoded}&temporary-chat=true` | Undocumented; prefills input. Optional: `&hints=search`, `&model=gpt-4o` |
| **Claude Desktop** | `claude://claude.ai/new?q={encoded}` | Official; prefill only, user sends. ~14k char limit |
| **Claude web** | `https://claude.ai/new?q={encoded}` | Unreliable ( broke intermittently 2025 ) — fallback to copy or Desktop link |
| **Claude Code** | `claude-cli://open?q={encoded}` | Desktop terminal; ~5k char limit |
| **Perplexity / Gemini** | `?q={encoded}` on respective hosts | Community pattern; test before shipping |

**Implementation sketch:**
- `buildAiPromptFull(context)` → markdown for clipboard (locale + translated quotes).
- `buildAiPromptShort(context)` → teaser for URL (same locale).
- `buildAiDeepLink(provider, shortPrompt)` → URL-encoded link; only **our** generated text (no user-supplied URL injection).
- Pages report section URL in short prompt: `{webBaseUrl}?q=niche/locale/daily#section-{id}`.

**Telegram layout (target):**

```
[ ChatGPT ]  [ Claude ]  [ Copy full prompt ]
```

**Short prefill example (RU):**

```text
Я indie-разработчик в нише productivity. Главный сигнал за 24ч: Goodnotes —
bugs/stability, 31 отзыв (App Store, DE). Помоги оценить, есть ли product gap.
Полный контекст IndieRadar: https://…/report?q=…
```

**Risks:** ChatGPT `?q=` is undocumented and may change; Claude web link may fail → always offer **Copy full prompt** as primary fallback.

### Prompt content (from our data)

Include (compressed, not raw DB dump):

- niche slug + display name, report locale, date / window (24h pulse vs 7d snapshot vs weekly);
- signal theme (`bugs_stability`, `pricing_paywall`, …) with RU/EN label;
- top apps (names, platforms, markets, review counts);
- 3–5 **sample review quotes** (see **Translation** below);
- existing report copy where useful: opportunity title, next-action line, theme mix %;
- crawl freshness: `generatedAt`, optional «data through {date}»;
- placeholder: `[MY APP: describe your app in one sentence]` (later: from subscriber profile).

Optional **intent templates** (v1.1): user picks before copy — «product differentiation», «competitive teardown», «user interview questions», «pricing experiment».

### Translation (user locale)

Reports already translate review snippets via `services/analyzer/src/translate.ts` (`translateForLocale`, Google Translate `gtx`, in-memory cache, protected app names).

**Prompt export must follow the same locale rules:**

| Part | Language |
|---|---|
| Prompt instructions, headings, suggested questions | User brief locale (`ru` / `en` from `telegram_subscribers.locale` or report export locale) |
| Theme labels, section titles | Same as brief (reuse `themeLabelRu` / `themeLabelEn`) |
| Sample review quotes in prompt | **Translated to user locale** when locale is `ru` (same pipeline as daily brief); keep **original quote** in a collapsed «Source (EN/DE/…)» sub-block optional in v1.1 |
| App names, niche names | Never translated (protected terms) |
| Store / market codes | Keep as-is (`US`, `DE`, `Google Play`) |

**Rules:**
- Reuse `translateForLocale()` — do not duplicate translation logic.
- If translation fails or times out → fall back to original quote text (same as report).
- Prompt generator runs at **export time** (not stored in Supabase) to avoid stale translations.
- For `en` locale: translate non-English quotes to EN when helpful; EN quotes stay as-is.

**Example (RU user, EN source review):**

```markdown
## Цитаты пользователей (перевод IndieRadar)
1. «Приложение постоянно зависает после обновления…» — App Store, DE, 2/5
   _Оригинал:_ "The app keeps freezing after the update…"
```

### Tiers

| Tier | Scope | Notes |
|---|---|---|
| **v0** | Static template + theme + apps + translated samples | One intent («evaluate this signal for my app») |
| **v1** | Per-block prompts in Telegram + Pages | Pulse line, priority theme, top opportunity, weekly hero |
| **v1.1** | Intent picker + optional «my app» one-liner in onboarding | Better prompts, less editing after paste |
| **v1.2** | Deep links (ChatGPT / Claude) + Copy full prompt hybrid | Short URL + full markdown; see **Deep links** above |
| **v2** | Track `prompt_copied` / `prompt_opened` (privacy-safe) | Decide Stage 3 in-product AI vs stay export-first |

### Relation to Stage 3

- **Stage 3 (in-product AI summaries):** LLM inside IndieRadar, billed/metered, full UX control.
- **Prompt export:** zero marginal AI cost, meets users where they are; validate demand before Stage 3.
- If copy-rate is high and retention improves → Stage 3; if export is enough → stay export-first.

### Out of scope (v0–v1)

- Putting the **full** prompt only in a URL (length limits); use short prefill + copy instead.
- Storing generated prompts in DB.
- AI classification of niches or themes (separate from crawl rules).
- Auto-submitting prompts in external AI without user confirmation (prefill only).

### Open questions (beta)

- Mobile: inline URL buttons vs «share sheet» with provider list.
- Default provider from user setting vs last-used.
- One prompt per theme vs per app+theme pair.
- Whether to include competitor store URLs in prompt (helpful vs noise).
- Claude web vs Desktop link when user is on mobile.

---

## Find niche by app name

**Status:** deferred (after onboarding merge + beta feedback).

**Problem:** beta users may not know niche slug (`productivity`, `habit-tracker`, …).

**UX (target):**
- On niche step: «🔍 Найти по приложению» / «Find by app name»
- User types competitor or own app name (e.g. `Forest`, `Todoist`)
- Bot suggests niche + confirm button

**Implementation tiers:**

| Tier | Approach | Limits |
|---|---|---|
| v1.1 | Supabase `market_apps` + `niche_apps` search | Only crawled apps |
| v1.2 | Live store search + `isAppRelevantToNiche()` | Latency, noise |
| — | Unreleased apps | Manual niche pick |

**Out of scope:** AI niche classification without a store listing.

---

## Future candidates (unprioritized)

- **VPS migration (bot + crawl off GHA)** — see `docs/VPS_HOSTING_PLAN.md`; beta stays on Actions until scale or always-on bot in prod
- Trend report UI (`buildTrendReport`) after rollups mature
- App Store updates + release-note feature parsing (`cursor/app-store-updates`)
- Ops alerts v2 (silent failures: 0 signals, Pages not deployed, push errors) — see `docs/OPS_ALERTS.md`
- Billing / founding member (Stripe or Lemon Squeezy)
- Email delivery channel
- Positive review themes / sentiment mix
- Multi-niche subscription per user
