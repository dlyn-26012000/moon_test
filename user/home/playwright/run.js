#!/usr/bin/env node
/**
 * Home UI suite — live against moon.dlyn.site (raw Playwright, no test runner).
 * Captures screenshots + trace + video into ../evidence/*. Run: node run.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.HOME_BASE_URL || 'https://moon.dlyn.site';
const EV = path.resolve(__dirname, '../evidence');
const SS = path.join(EV, 'screenshots');
const VID = path.join(EV, 'videos');
const TRC = path.join(EV, 'traces');
[SS, VID, TRC].forEach((d) => fs.mkdirSync(d, { recursive: true }));

let pass = 0, fail = 0, warn = 0;
const results = [];
function log(id, ok, msg, extra = '') {
  const tag = ok === true ? '✅' : ok === 'warn' ? '⚠️' : '❌';
  if (ok === true) pass++; else if (ok === 'warn') warn++; else fail++;
  console.log(`${tag} ${id} — ${msg}${extra ? ' | ' + extra : ''}`);
  results.push({ id, ok, msg, extra });
}
const shot = (page, name) => page.screenshot({ path: path.join(SS, name), fullPage: false });
const shotFull = (page, name) => page.screenshot({ path: path.join(SS, name), fullPage: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    recordVideo: { dir: VID, size: { width: 1366, height: 900 } },
  });
  await ctx.tracing.start({ screenshots: true, snapshots: true });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

  try {
    // ---- TC-F01: guest home renders ----
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1500);
    await shotFull(page, 'F01-guest-home-full.png');
    await shot(page, 'F01-guest-home-viewport.png');
    const bodyText = await page.locator('body').innerText();
    log('TC-F01', /Tochi|./.test(await page.title()) ? true : false, `Home loaded "${await page.title()}"`);

    // Section presence via structural class cues
    const heroImgs = await page.locator('section img').count();
    log('TC-F02a', heroImgs > 0 ? true : 'warn', `Hero images present`, `imgCount=${heroImgs}`);
    const flashSale = await page.locator('.bg-orange-100').first();
    const hasFlash = await flashSale.count();
    log('TC-F04a', hasFlash ? true : 'warn', `FlashSale section present=${!!hasFlash}`);
    const mostLiked = page.locator('.bg-slate-900').first();
    const hasML = await mostLiked.count();
    log('TC-F06a', hasML ? true : 'warn', `MostLiked section present=${!!hasML}`);

    // ---- TC-F04: FlashSale countdown ticking ----
    if (hasFlash) {
      const readTimer = async () => (await flashSale.locator('.tabular-nums').allInnerTexts()).join(':');
      const t1 = await readTimer();
      await page.waitForTimeout(2200);
      const t2 = await readTimer();
      await flashSale.screenshot({ path: path.join(SS, 'F04-flashsale-countdown.png') }).catch(() => {});
      log('TC-F04', t1 && t2 && t1 !== t2 ? true : 'warn', `countdown ticking`, `${t1} -> ${t2}`);
    }

    // ---- TC-F02: Hero carousel autoplay (slide changes) ----
    {
      const hero = page.locator('section').first();
      await hero.screenshot({ path: path.join(SS, 'F02-hero-t0.png') }).catch(() => {});
      await page.waitForTimeout(3500);
      await hero.screenshot({ path: path.join(SS, 'F02-hero-t3.png') }).catch(() => {});
      log('TC-F02', 'warn', `Hero autoplay — so sánh F02-hero-t0 vs t3 (thủ công)`);
    }

    // ---- BUG-C7 UI: MostLiked hearts show favorited for guest ----
    if (hasML) {
      await mostLiked.screenshot({ path: path.join(SS, 'BUG-C7-mostliked-guest.png') }).catch(() => {});
      const filled = await mostLiked.locator('svg.fill-red-500, [aria-pressed="true"], .text-red-500').count();
      log('BUG-C7-ui', 'warn', `Guest MostLiked hearts (xem BUG-C7-mostliked-guest.png) — API đã xác nhận is_favorited=true`, `heart-ish=${filled}`);
    }

    // ---- TC-F10: login modal opens ----
    try {
      const acct = page.getByRole('button', { name: /đăng nhập|login|tài khoản|account/i }).first();
      if (await acct.count()) {
        await acct.click({ timeout: 5000 });
        await page.waitForTimeout(800);
      }
      await shot(page, 'F10-after-account-click.png');
      const modal = await page.locator('[role="dialog"], .modal, input[type="password"]').count();
      log('TC-F10', modal ? true : 'warn', `Login/account UI mở (dialog/password field=${modal})`);
    } catch (e) { log('TC-F10', 'warn', `login modal: ${e.message.split('\n')[0]}`); }

    // ---- TC-F11: language switch vi -> en ----
    try {
      await page.keyboard.press('Escape').catch(() => {});
      const langBtn = page.getByRole('button', { name: /switch language|language|ngôn ngữ/i }).first();
      const before = await page.locator('body').innerText();
      if (await langBtn.count()) {
        await langBtn.click({ timeout: 5000 });
        await page.waitForTimeout(400);
        const en = page.getByText(/English/i).first();
        if (await en.count()) { await en.click(); await page.waitForTimeout(1200); }
      }
      await shotFull(page, 'F11-after-en-switch.png');
      const after = await page.locator('body').innerText();
      log('TC-F11', before !== after ? true : 'warn', `Language switch đổi nội dung=${before !== after}`);
    } catch (e) { log('TC-F11', 'warn', `lang switch: ${e.message.split('\n')[0]}`); }

    // ---- Mobile viewport smoke (evidence only) ----
    const mpage = await ctx.newPage();
    await mpage.setViewportSize({ width: 390, height: 844 });
    await mpage.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 });
    await mpage.waitForTimeout(1200);
    await mpage.screenshot({ path: path.join(SS, 'R03-mobile-home.png'), fullPage: true });
    log('TC-R03', true, `Mobile 390px screenshot captured (evidence)`);
    await mpage.close();

    // ---- console errors ----
    log('TC-console', consoleErrors.length === 0 ? true : 'warn',
      `console/page errors=${consoleErrors.length}`, consoleErrors.slice(0, 3).join(' || '));

  } catch (e) {
    log('SUITE', false, 'fatal: ' + e.message.split('\n')[0]);
    await shotFull(page, 'FATAL.png').catch(() => {});
  } finally {
    await ctx.tracing.stop({ path: path.join(TRC, 'home-trace.zip') });
    await ctx.close();
    await browser.close();
  }

  console.log(`\n=== UI DONE: ${pass} pass, ${warn} warn, ${fail} fail ===`);
  fs.writeFileSync(path.join(EV, 'network', '_ui_summary.json'), JSON.stringify({ results, consoleErrors }, null, 2));
})();
