#!/usr/bin/env node
// Smoke test for AWAKEN: serves the repo, opens it at phone width in headless
// Chromium, visits every tab and fails on any page error or console error.
// Usage: node .claude/skills/awaken-dev/scripts/smoke.js [--shots <dir>]
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../../../..');
const port = 8000 + Math.floor(Math.random() * 900);
const shotsIdx = process.argv.indexOf('--shots');
const shots = shotsIdx > -1 ? path.resolve(process.argv[shotsIdx + 1]) : null;
const TABS = ['status', 'quests', 'train', 'plan', 'records'];

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  const errors = [];
  let browser;
  try {
    await wait(800);
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    // Dismiss the first-run intro modal if it shows.
    for (let i = 0; i < 5 && await page.locator('#modalWrap:not([hidden])').count(); i++) {
      await page.locator('#modalActions button').last().click();
      await wait(150);
    }
    if (shots) fs.mkdirSync(shots, { recursive: true });
    for (const t of TABS) {
      await page.click(`#tabs button[data-tab="${t}"]`);
      await wait(200);
      const len = (await page.locator('#view').innerText()).trim().length;
      if (!len) errors.push(`tab "${t}" rendered empty`);
      const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (wide) errors.push(`tab "${t}" scrolls horizontally at 390px`);
      if (shots) await page.screenshot({ path: path.join(shots, `${t}.png`), fullPage: true });
      console.log(`ok  ${t} (${len} chars)`);
    }
  } catch (e) {
    errors.push(String(e));
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  if (errors.length) { console.error('\nFAIL\n' + errors.join('\n')); process.exit(1); }
  console.log('\nPASS');
})();
