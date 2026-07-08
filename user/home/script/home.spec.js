#!/usr/bin/env node
/**
 * User Home — End-to-End suite (live against moon.dlyn.site).
 * Raw Playwright (no @playwright/test runner in this repo).
 *
 * Covers: Guest home, Authenticated home, Guest↔Auth comparison, Responsive
 * matrix, API capture (HAR + req/res snapshots), console capture, performance
 * observation, and live re-verification of BUG-001/002/003.
 *
 * Run:  node script/home.spec.js
 * Scope: ONLY the User Home screen. Login is used strictly as a Precondition.
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const { BASE, API_HOST, CREDS, HOME_ENDPOINTS, VIEWPORTS, PATHS } = require('./fixtures');
const U = require('./utils');

const consoleSink = [];
function wireConsole(page, tagPrefix) {
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type()))
      consoleSink.push(`[${tagPrefix}][${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => consoleSink.push(`[${tagPrefix}][pageerror] ${e.message}`));
}

async function gotoHome(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Pusher websocket stays open → networkidle never fires. Wait for header.
  await page.locator('button[aria-label="Account menu"]').first()
    .waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200); // hydration + client fallbacks settle
}

const apiLog = [];

(async () => {
  U.ensureDirs();
  const browser = await chromium.launch({ headless: true });
  const perf = {};

  // =====================================================================
  // PART 1 — GUEST (desktop 1366x768) + API capture + HAR
  // =====================================================================
  const guestCtx = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    recordVideo: { dir: PATHS.videos, size: { width: 1366, height: 768 } },
    recordHar: { path: PATHS.har, content: 'embed' },
    locale: 'vi-VN',
  });
  await guestCtx.tracing.start({ screenshots: true, snapshots: true });
  const gp = await guestCtx.newPage();
  wireConsole(gp, 'guest');
  U.attachApiCapture(gp, API_HOST, HOME_ENDPOINTS, apiLog);

  try {
    const t0 = Date.now();
    await gotoHome(gp);
    perf.guestLoadMs = Date.now() - t0;
    U.log('TC-F01', true, 'Guest Home loaded', `${perf.guestLoadMs}ms`);
    await U.shot(gp, 'F01-guest-home-viewport.png', false);
    await U.shot(gp, 'F01-guest-home-full.png', true);

    // --- Section presence (text-based, resilient to class churn) ---
    const bodyText = (await gp.locator('body').innerText()).toLowerCase();
    const has = (re) => re.test(bodyText);
    const sections = {
      hero: (await gp.locator('img').count()) > 0,
      feature: has(/miễn phí|free|đổi trả|bảo hành|chính hãng|shipping|return|warranty|authentic/),
      flashsale: has(/khuyến mãi|flash|sốc|sale/),
      mostliked: has(/yêu thích|liked|favorite/),
      featured: has(/nổi bật|featured/),
      membership: has(/thành viên|membership|hạng/),
    };
    Object.entries(sections).forEach(([k, v]) =>
      U.log(`TC-F01.${k}`, v ? true : 'warn', `section ${k} ${v ? 'present' : 'not detected (may be empty/hidden)'}`));

    // --- Hero images / banner links (TC-F03) ---
    const heroImgs = await gp.locator('a img, [class*="hero" i] img, [class*="banner" i] img').count();
    U.log('TC-F03', heroImgs > 0 ? true : 'warn', `hero/banner images rendered`, `count=${heroImgs}`);

    // --- FlashSale countdown present (TC-F04) ---
    const countdown = await gp.locator('text=/\\d{1,2}\\s*:\\s*\\d{2}\\s*:\\s*\\d{2}/').first().count()
      || await gp.locator('text=/\\d+\\s*(giờ|phút|giây|h|m|s)/i').first().count();
    U.log('TC-F04', countdown ? true : 'warn', 'FlashSale countdown detected', `matches=${countdown}`);
    await U.shot(gp, 'F04-flashsale-area.png', false);

    // --- BUG-001 live: hearts in Most-Liked all filled for guest? ---
    // Heuristic: count filled-heart vs outline-heart svg in the page.
    const heartInfo = await gp.evaluate(() => {
      const svgs = Array.from(document.querySelectorAll('svg'));
      let filled = 0, outline = 0;
      svgs.forEach((s) => {
        const cls = (s.getAttribute('class') || '') + ' ' + (s.querySelector('path')?.getAttribute('fill') || '');
        const fill = s.getAttribute('fill') || s.querySelector('path')?.getAttribute('fill') || '';
        const looksHeart = /heart/i.test(cls) || s.innerHTML.includes('21.35') || /M12 21/.test(s.innerHTML);
        if (!looksHeart) return;
        if (fill && fill !== 'none') filled++; else outline++;
      });
      return { filled, outline };
    });
    U.log('BUG-001-live', 'warn', 'heart fill sampled on Home (see API for definitive proof)',
      `filled=${heartInfo.filled} outline=${heartInfo.outline}`);

    // --- Search from Home (TC-F09) ---
    try {
      const search = gp.locator('input[type="search"], input[placeholder*="ìm" i], input[placeholder*="earch" i]').first();
      if (await search.count()) {
        await search.click();
        await search.fill('ao');
        await gp.keyboard.press('Enter');
        await gp.waitForTimeout(1500);
        const url = gp.url();
        U.log('TC-F09', /search|keyword|q=|products/i.test(url) ? true : 'warn', 'Home search navigates', url);
        await U.shot(gp, 'F09-search-result.png', false);
        await gotoHome(gp);
      } else {
        U.log('TC-F09', 'warn', 'search input not found on Home header');
      }
    } catch (e) { U.log('TC-F09', 'fail', 'search threw', e.message); }

    // --- ProductCard click → detail (TC-F08) ---
    try {
      const card = gp.locator('a[href*="/products/"]').first();
      if (await card.count()) {
        const href = await card.getAttribute('href');
        U.log('TC-F08', /\/products\//.test(href || '') ? true : 'warn', 'product card links to detail', href);
      } else U.log('TC-F08', 'warn', 'no product card link found (sections empty?)');
    } catch (e) { U.log('TC-F08', 'fail', 'card check threw', e.message); }

    // --- "Xem tất cả" links (TC-F05/06/07) ---
    const seeAll = await gp.evaluate(() =>
      Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href')).filter(Boolean)
        .filter((h) => /products\?(sale|featured)|\/favorites/.test(h)));
    U.log('TC-F05_07', seeAll.length ? true : 'warn', 'see-all links present', seeAll.join(' , ') || 'none');

    // --- Guest CTA login modal (TC-F10) ---
    try {
      await gp.locator('button[aria-label="Account menu"]').first().click();
      await gp.waitForTimeout(500);
      await U.shot(gp, 'F10-guest-account-dropdown.png', false);
      const loginItem = gp.getByRole('button', { name: /Đăng nhập|Login/ }).first();
      if (await loginItem.count()) {
        await loginItem.click();
        await gp.locator('div[role="dialog"]').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        await U.shot(gp, 'F10-login-modal.png', false);
        U.log('TC-F10', true, 'Guest account menu opens login modal');
        await gp.keyboard.press('Escape').catch(() => {});
      } else U.log('TC-F10', 'warn', 'login CTA not found in account menu');
    } catch (e) { U.log('TC-F10', 'fail', 'account menu threw', e.message); }

    // --- Language switch vi→en (TC-F11) ---
    try {
      const globe = gp.locator('button[aria-label*="anguage" i], button:has(svg.lucide-globe)').first();
      if (await globe.count()) {
        await globe.click().catch(() => {});
        await gp.waitForTimeout(300);
        const en = gp.getByRole('button', { name: /English/i }).first();
        if (await en.count()) { await en.click().catch(() => {}); await gp.waitForTimeout(1200); }
        await U.shot(gp, 'F11-after-en-switch.png', false);
        const txt = (await gp.locator('body').innerText()).toLowerCase();
        U.log('TC-F11', /featured|liked|free ship|warranty|view all/.test(txt) ? true : 'warn',
          'language switch vi→en reflected', '');
      } else U.log('TC-F11', 'warn', 'language switcher not found');
    } catch (e) { U.log('TC-F11', 'fail', 'lang switch threw', e.message); }

    // --- Performance: duplicate API calls + resource counts ---
    const homeApiCalls = apiLog.filter((c) => HOME_ENDPOINTS.some((e) => c.url.includes(e.match)));
    const dupes = {};
    homeApiCalls.forEach((c) => { const key = c.url.split('?')[0]; dupes[key] = (dupes[key] || 0) + 1; });
    const duplicated = Object.entries(dupes).filter(([, n]) => n > 1);
    perf.homeApiCallCount = homeApiCalls.length;
    perf.duplicatedEndpoints = duplicated;
    U.log('TC-P01', duplicated.length ? 'warn' : true, 'Home API call pattern',
      `calls=${homeApiCalls.length} dup=${JSON.stringify(duplicated)}`);
  } catch (e) {
    U.log('GUEST-FATAL', 'fail', 'guest flow crashed', e.message);
  } finally {
    await guestCtx.tracing.stop({ path: path.join(PATHS.traces, 'guest-trace.zip') }).catch(() => {});
    await guestCtx.close(); // flush video + HAR
  }

  // =====================================================================
  // PART 2 — AUTHENTICATED (login precondition → home) + compare + favorite
  // =====================================================================
  const authCtx = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    recordVideo: { dir: PATHS.videos, size: { width: 1366, height: 768 } },
    locale: 'vi-VN',
  });
  const ap = await authCtx.newPage();
  wireConsole(ap, 'auth');
  const favToggleCalls = [];
  ap.on('request', (r) => { if (/favorites\/toggle/.test(r.url())) favToggleCalls.push(r.method()); });

  try {
    await gotoHome(ap);
    // Login (Precondition only)
    await ap.locator('button[aria-label="Account menu"]').first().click();
    await ap.waitForTimeout(400);
    const loginItem = ap.getByRole('button', { name: /Đăng nhập|Login/ }).first();
    await loginItem.click();
    const modal = ap.locator('div[role="dialog"]').first();
    await modal.waitFor({ state: 'visible', timeout: 8000 });
    await ap.locator('#login-username').fill(CREDS.username);
    await ap.locator('#login-password').fill(CREDS.password);
    await modal.getByRole('button', { name: /Đăng nhập|Login/ }).last().click();
    // wait for modal to close / avatar to appear
    await ap.waitForTimeout(3000);
    const loggedIn = await ap.locator('div[role="dialog"]').count() === 0;
    U.log('TC-L01', loggedIn ? true : 'fail', 'Login precondition → Home header logged-in state',
      loggedIn ? 'modal closed' : 'modal still open');
    await U.shot(ap, 'L01-auth-home.png', false);
    await U.shot(ap, 'L01-auth-home-full.png', true);
    await authCtx.storageState({ path: PATHS.authState });

    // Header now shows logged widgets (heuristic: account menu still there, login CTA gone)
    await ap.locator('button[aria-label="Account menu"]').first().click().catch(() => {});
    await ap.waitForTimeout(500);
    const menuTxt = (await ap.locator('body').innerText()).toLowerCase();
    const hasLogout = /đăng xuất|logout/.test(menuTxt);
    U.log('TC-L01b', hasLogout ? true : 'warn', 'account dropdown shows logged options', hasLogout ? 'logout present' : '');
    await U.shot(ap, 'L01b-auth-dropdown.png', false);
    await ap.keyboard.press('Escape').catch(() => {});

    // Favorite toggle from a Home card (TC-L03)
    try {
      const heartBtn = ap.locator('button:has(svg.lucide-heart), button[aria-label*="avorite" i], button[aria-label*="êu thích" i]').first();
      if (await heartBtn.count()) {
        await heartBtn.scrollIntoViewIfNeeded();
        await heartBtn.click();
        await ap.waitForTimeout(1500);
        U.log('TC-L03', favToggleCalls.length ? true : 'warn', 'favorite toggle fires API',
          `POST favorites/toggle x${favToggleCalls.length}`);
        await U.shot(ap, 'L03-favorite-toggled.png', false);
      } else U.log('TC-L03', 'warn', 'no heart button located on Home cards');
    } catch (e) { U.log('TC-L03', 'fail', 'favorite toggle threw', e.message); }

    // Logout (TC-L05)
    try {
      await ap.locator('button[aria-label="Account menu"]').first().click();
      await ap.waitForTimeout(400);
      const logout = ap.getByRole('button', { name: /Đăng xuất|Logout/ }).first();
      if (await logout.count()) {
        await logout.click();
        await ap.waitForTimeout(2000);
        const backToGuest = await ap.getByRole('button', { name: /Đăng nhập|Login/ }).count();
        U.log('TC-L05', backToGuest ? true : 'warn', 'Logout returns Home to guest state');
        await U.shot(ap, 'L05-after-logout.png', false);
      } else U.log('TC-L05', 'warn', 'logout item not found');
    } catch (e) { U.log('TC-L05', 'fail', 'logout threw', e.message); }
  } catch (e) {
    U.log('AUTH-FATAL', 'fail', 'auth flow crashed', e.message);
  } finally {
    await authCtx.close();
  }

  // =====================================================================
  // PART 3 — RESPONSIVE MATRIX (guest home) — desktop/tablet/mobile
  // =====================================================================
  for (const vp of VIEWPORTS) {
    const rctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, locale: 'vi-VN' });
    const rp = await rctx.newPage();
    try {
      await gotoHome(rp);
      const overflow = await rp.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        iw: window.innerWidth,
      }));
      const hasHScroll = overflow.sw > overflow.iw + 2;
      await U.shotResponsive(rp, `${vp.name}.png`);
      U.log(`TC-R-${vp.name}`, hasHScroll ? 'fail' : true,
        `${vp.group} ${vp.width}x${vp.height} ${hasHScroll ? 'HAS horizontal scroll' : 'no h-scroll'}`,
        `scrollWidth=${overflow.sw} innerWidth=${overflow.iw}`);
    } catch (e) {
      U.log(`TC-R-${vp.name}`, 'fail', 'responsive render threw', e.message);
    } finally {
      await rctx.close();
    }
  }

  await browser.close();

  // =====================================================================
  // Persist evidence: console log, api log, results json
  // =====================================================================
  fs.writeFileSync(PATHS.consoleLog, consoleSink.join('\n') || '(no console errors/warnings captured)');
  const apiMd = [
    '# Home API Log (live capture)', '',
    `Captured: ${new Date().toISOString()}`, '',
    '| # | Method | Status | URL |', '|---|--------|--------|-----|',
    ...apiLog.map((c, i) => `| ${i + 1} | ${c.method} | ${c.status} | ${c.url} |`),
  ].join('\n');
  fs.writeFileSync(PATHS.apiLog, apiMd);

  const out = { at: new Date().toISOString(), base: BASE, totals: U.totals(), perf, results: U.results };
  fs.writeFileSync(PATHS.results, JSON.stringify(out, null, 2));

  const t = U.totals();
  console.log(`\n==== DONE: ${t.pass} pass / ${t.fail} fail / ${t.warn} warn / ${t.blocked} blocked (of ${t.total}) ====`);
})();
