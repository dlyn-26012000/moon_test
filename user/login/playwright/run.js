/**
 * Standalone E2E UI/UX runner for User Login (Playwright, raw chromium).
 *
 * Drives https://moon.dlyn.site login modal in Vietnamese + English + a mobile
 * pass, capturing screenshots, video, trace, console log and network log into
 * ../evidence/. Assertion outcomes are written to ../evidence/logs/ui-results.json.
 *
 * Run:  node run.js         (from this folder; needs playwright installed)
 * Env:  LOGIN_BASE_URL to override target.
 *
 * NOTE: login API is throttled 5 req/min per IP. To stay safe the runner performs
 * at most ONE real login attempt per language and spaces them.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const cfg = require('./playwright.config');
const data = require('./fixtures/test-data');
const { LoginPage } = require('./pages/LoginPage');
const { dirs, shot, attachRecorders } = require('./helpers/evidence');

const results = [];
const rec = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runLocale(browser, lang, { doLogin }) {
  const L = data.i18n[lang];
  const ctx = await browser.newContext({
    viewport: cfg.viewport,
    recordVideo: { dir: dirs.videos, size: cfg.viewport },
    locale: lang === 'en' ? 'en-US' : 'vi-VN',
  });
  await ctx.tracing.start({ screenshots: true, snapshots: true, title: `login-${lang}` });
  const page = await ctx.newPage();
  const recorders = attachRecorders(page, lang);
  const lp = new LoginPage(page);
  const P = (n) => `${lang}-${n}`;

  try {
    await lp.goto(cfg.baseURL);
    if (lang === 'en') await lp.switchLanguage('en');
    await shot(page, P('01-homepage'));

    // Open modal
    try {
      await lp.openModal(L.loginMenu);
      rec(`[${lang}] open login modal`, await lp.isModalOpen());
      await shot(page, P('02-modal-open'));
    } catch (e) {
      rec(`[${lang}] open login modal`, false, e.message);
    }

    // i18n labels
    try {
      const title = await lp.modal.locator('h2').first().innerText();
      rec(`[${lang}] title = "${L.title}"`, title.trim() === L.title, title.trim());
      const bodyText = await lp.modal.innerText();
      rec(`[${lang}] username label present`, bodyText.includes(L.username));
      rec(`[${lang}] password label present`, bodyText.includes(L.password));
      rec(`[${lang}] forgot-password link present`, bodyText.includes(L.forgot));
    } catch (e) {
      rec(`[${lang}] i18n labels`, false, e.message);
    }

    // Accessibility: dialog role + autofocus username
    try {
      const role = await lp.modal.getAttribute('role');
      const ariaModal = await lp.modal.getAttribute('aria-modal');
      rec(`[${lang}] role=dialog + aria-modal`, role === 'dialog' && ariaModal === 'true', `role=${role} aria-modal=${ariaModal}`);
      const focused = await page.evaluate(() => document.activeElement?.id);
      rec(`[${lang}] username auto-focused`, focused === 'login-username', `activeElement=${focused}`);
    } catch (e) {
      rec(`[${lang}] a11y checks`, false, e.message);
    }

    // Empty form -> submit disabled (no API call)
    try {
      await lp.fill('', '');
      rec(`[${lang}] submit disabled when empty`, await lp.isSubmitDisabled());
      await shot(page, P('03-empty-disabled'));
      await lp.fill('user001', '');
      rec(`[${lang}] submit disabled when password empty`, await lp.isSubmitDisabled());
      await lp.fill('   ', 'password');
      rec(`[${lang}] submit disabled when username all-spaces`, await lp.isSubmitDisabled());
    } catch (e) {
      rec(`[${lang}] disabled-button validation`, false, e.message);
    }

    // Password show/hide toggle
    try {
      await lp.fill('user001', 'password');
      const before = await lp.passwordInput.getAttribute('type');
      await lp.togglePwBtn.first().click();
      const after = await lp.passwordInput.getAttribute('type');
      rec(`[${lang}] password toggle text<->password`, before === 'password' && after === 'text', `${before}->${after}`);
      await shot(page, P('04-password-visible'));
      await lp.togglePwBtn.first().click();
    } catch (e) {
      rec(`[${lang}] password toggle`, false, e.message);
    }

    if (doLogin === 'invalid') {
      try {
        await lp.fill('user001', data.wrong.password);
        await lp.submit();
        const err = await lp.errorText();
        rec(`[${lang}] wrong password shows error`, !!err, err);
        // BUG-003 FIXED: message phải là câu đã dịch, KHÔNG còn mã thô kỹ thuật.
        const localised = data.i18n[lang].invalidCredentials;
        const isRawCode = /CREDENTIALS_INCORRECT|INVALID_CREDENTIALS|USER_INACTIVE|USER_NOT_FOUND/.test(err || '');
        rec(`[${lang}] BUG-003 fixed: error is localised (not raw code)`,
          !isRawCode && (err === localised || /không đúng|Incorrect|thử lại|try again|too many|quá nhiều/i.test(err || '')), err);
        // BUG-004 FIXED: hộp lỗi có role="alert".
        const alertRole = await lp.errorBox.getAttribute('role').catch(() => null);
        rec(`[${lang}] BUG-004 fixed: error box has role=alert`, alertRole === 'alert', `role=${alertRole}`);
        await shot(page, P('05-login-error'));
      } catch (e) {
        rec(`[${lang}] invalid login`, false, e.message);
      }
    }

    if (doLogin === 'valid') {
      try {
        await lp.fill('user001', data.valid.password);
        await lp.submit();
        // success = modal closes AND token stored
        await page.waitForTimeout(2500);
        const closed = !(await lp.isModalOpen());
        const token = await page.evaluate(() => localStorage.getItem('auth_token'));
        rec(`[${lang}] valid login closes modal`, closed);
        rec(`[${lang}] valid login stores auth_token`, !!token, token ? token.slice(0, 12) + '…' : 'null');
        await shot(page, P('06-login-success'));
      } catch (e) {
        rec(`[${lang}] valid login`, false, e.message);
      }
    }
  } finally {
    recorders.save();
    const tracePath = path.join(dirs.traces, `trace-${lang}.zip`);
    await ctx.tracing.stop({ path: tracePath });
    const pages = ctx.pages();
    await ctx.close();
    // rename the recorded video to a stable name
    try {
      const vids = fs.readdirSync(dirs.videos).filter((f) => f.endsWith('.webm'));
      const newest = vids.map((f) => ({ f, t: fs.statSync(path.join(dirs.videos, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t)[0];
      if (newest && !newest.f.startsWith('login-')) {
        fs.renameSync(path.join(dirs.videos, newest.f), path.join(dirs.videos, `login-${lang}.webm`));
      }
    } catch { /* ignore */ }
  }
}

async function runMobile(browser) {
  const ctx = await browser.newContext({
    viewport: data.viewports.mobile,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    recordVideo: { dir: dirs.videos, size: data.viewports.mobile },
  });
  const page = await ctx.newPage();
  const lp = new LoginPage(page);
  try {
    await lp.goto(cfg.baseURL);
    await shot(page, 'mobile-01-homepage');
    await lp.openModal(data.i18n.vi.loginMenu);
    rec('[mobile] modal opens on 390x844', await lp.isModalOpen());
    // check no horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    rec('[mobile] no horizontal overflow', !overflow);
    await shot(page, 'mobile-02-modal');
  } catch (e) {
    rec('[mobile] pass', false, e.message);
  } finally {
    await ctx.close();
    try {
      const vids = fs.readdirSync(dirs.videos).filter((f) => f.endsWith('.webm') && !f.startsWith('login-'));
      const newest = vids.map((f) => ({ f, t: fs.statSync(path.join(dirs.videos, f)).mtimeMs })).sort((a, b) => b.t - a.t)[0];
      if (newest) fs.renameSync(path.join(dirs.videos, newest.f), path.join(dirs.videos, 'login-mobile.webm'));
    } catch { /* ignore */ }
  }
}

(async () => {
  const browser = await chromium.launch({ headless: cfg.headless });
  // vi first: one VALID login. Wait for throttle window. en: one INVALID login.
  await runLocale(browser, 'vi', { doLogin: 'valid' });
  await sleep(cfg.throttleGuardMs);
  await runLocale(browser, 'en', { doLogin: 'invalid' });
  await runMobile(browser);
  await browser.close();

  const summary = {
    at: new Date().toISOString(),
    target: cfg.baseURL,
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
  fs.writeFileSync(path.join(dirs.logs, 'ui-results.json'), JSON.stringify(summary, null, 2));
  console.log(`\n${summary.passed}/${summary.total} UI checks passed. Evidence in ../evidence/`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
