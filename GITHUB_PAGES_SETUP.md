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
   - `PAGES_DEPLOY_TOKEN` = your PAT
   - `GITHUB_PAGES_BASE_URL` = `https://ivanplat1.github.io/IndieRadar-pages/report`

5. Run workflow **Deploy Report Pages** (or push to `docs/` on the tracked branch).

## URLs

- Full brief: `https://ivanplat1.github.io/IndieRadar-pages/report/?niche=productivity&locale=ru`
- App themes: `https://ivanplat1.github.io/IndieRadar-pages/report/?niche=productivity&locale=ru&app=1`

## Local export

```bash
npm run export:pages -- productivity ru
```

Updates `docs/data/reports/…` JSON consumed by `docs/report/index.html`.
