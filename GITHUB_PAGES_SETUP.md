# GitHub Pages for private IndieRadar repo

The main repository is **private**, so GitHub Pages cannot be enabled on it with a free plan.

Use a separate **public** repository for static report pages only (no secrets in that repo).

## One-time setup

1. Create a public repo, e.g. `IndieRadar-pages` (empty, no README required).

2. Enable Pages on that repo:
   - **Settings → Pages → Build and deployment → Deploy from branch**
   - Branch: `main`, folder: `/ (root)`

3. Create a fine-grained PAT (or classic token) with **Contents: Read and write** on `IndieRadar-pages` only.

4. Add secrets to **IndieRadar** (private repo):
   - `PAGES_REPOSITORY` = `ivanplat1/IndieRadar-pages`
   - `PAGES_DEPLOY_TOKEN` = fine-grained PAT with **Contents: Read and write** on `IndieRadar-pages`
   - Optional `REPORT_PAGES_BASE_URL` = `https://ivanplat1.github.io/IndieRadar-pages/report` (override; GitHub **rejects** secret names starting with `GITHUB_`)

   Nightly crawl workflows already default `GITHUB_PAGES_BASE_URL` to the URL above. Set it in local `.env` for the Telegram bot.

5. Run workflow **Deploy Report Pages** (Actions tab) or push changes under `docs/`.

The deploy job uses `git rsync` (not JamesIves action) and skips gracefully if secrets are missing.

## URLs

- Daily brief: `https://ivanplat1.github.io/IndieRadar-pages/report/?q=productivity/ru`
- Weekly brief: `https://ivanplat1.github.io/IndieRadar-pages/report/?q=productivity/ru/week`
- App themes: `https://ivanplat1.github.io/IndieRadar-pages/report/?q=productivity/ru/app/<canonical_app_id>`

Legacy `?niche=&locale=&app=&period=` links still work in the viewer.

App links use a stable `canonical_app_id` (not rank position), so Telegram links stay correct when the priority order changes.

## Local export

```bash
npm run export:pages -- productivity ru
```

Updates `docs/data/reports/…` JSON consumed by `docs/report/index.html`.
