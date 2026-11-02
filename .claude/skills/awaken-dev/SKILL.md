---
name: awaken-dev
description: How to change, run and verify the AWAKEN fitness PWA in this repo (vanilla JS, no build step, offline service worker, localStorage save, optional GitHub Gist sync). Use before editing app.js, index.html, styles.css, sw.js or manifest.webmanifest, and to smoke-test the app in a browser after any change.
---

# Working on AWAKEN

AWAKEN is a static, offline-first PWA. There is no framework, bundler, package.json or test suite. These are the files:

| File | Role |
|---|---|
| `index.html` | Shell: top bar, `#view`, bottom `#tabs` nav, `#modalWrap`, hidden `#fileInput` |
| `app.js` | Everything else: state, rendering, XP/stats, plan, export/import, Gist sync |
| `styles.css` | All styling (dark "system window" theme, phone-first) |
| `sw.js` | Network-first offline cache |
| `manifest.webmanifest`, `icon.svg` | Install metadata |

## Rules when changing the app

1. **Bump the cache version.** Whenever a shipped file changes, bump `VERSION` in `sw.js` (`awaken-vN` → `awaken-vN+1`). If you add a new shipped file, also add it to `FILES` there.
2. **Don't break existing saves.** The whole save is one JSON object in `localStorage['awaken.save.v1']`, which is also what goes in `.txt` backups and in `awaken_save.json` in the gist. New fields need defaults for saves that don't have them yet. Never rename or drop fields without a migration. XP and stats are recomputed from logs each time, so never store derived totals.
3. **Keep the token out of saves.** The Gist sync config, including the token, lives in a separate localStorage key so it never ends up in a backup or the gist. Keep it that way.
4. **Escape user text.** Views are template strings. Pass anything user-entered through `esc()` before it goes into HTML.
5. **Stay phone-first.** It's used one-handed mid-workout. Test at about 390px wide, keep tap targets large, and never add horizontal scroll.
6. **Use no dependencies or CDNs.** It must work fully offline from the cached files.
7. **Update `README.md`** when game mechanics, the plan or the coaching export format change. Exported `.txt` formats are read by a Claude coach, so keep them stable and readable.

## Running it

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Service workers need http(s), not `file://`.

## Verifying a change

Run the smoke test from the repo root. It serves the app, loads it at 390×844 in headless Chromium, clicks through every tab, and fails on JS errors, console errors, empty views or horizontal overflow:

```bash
node .claude/skills/awaken-dev/scripts/smoke.js
```

Add `--shots <dir>` to save a full-page screenshot per tab, then look at them. A passing script doesn't prove a layout looks right.

The script uses the Node `playwright` package. In Claude Code cloud sessions it's preinstalled (`require('playwright')` works and `chromium.launch()` needs no options). Don't run `playwright install`. On your own machine, run `npm i -g playwright` and `npx playwright install chromium` once.

For deeper flows (logging a workout, a PR alert, import/export), write a one-off Playwright script following the `webapp-testing` skill. Use Node instead of Python if Python Playwright isn't installed. Each fresh browser context starts with an empty save. To start from a known state, seed it with `page.evaluate(() => localStorage.setItem('awaken.save.v1', JSON.stringify(...)))` and reload.

**Never test Cloud Sync with a real GitHub token.** Stub `fetch` for `api.github.com` with `page.route` instead.
