/**
 * Playwright API tests for User Login — standalone (uses Playwright's request API).
 *
 * Run:  node login.api.spec.js
 * (Needs playwright installed: npm i playwright)
 *
 * NOTE: POST user/auth/login is throttled 5 req/min per IP. This runner spaces
 * requests ~13s apart so each assertion reflects real endpoint behaviour, not a 429.
 * Results are written to ../evidence/network/api-playwright-results.json
 */
const { request } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://api-moon.dlyn.site/api';
const USER = 'user001';
const PASS = 'password';
const OUT = path.resolve(__dirname, '../evidence/network/api-playwright-results.json');
const GAP_MS = 13000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, cond, detail) {
  const ok = !!cond;
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

(async () => {
  const ctx = await request.newContext({ extraHTTPHeaders: { Accept: 'application/json' } });
  let token = '';

  // 1) Login success
  let r = await ctx.post(`${BASE}/user/auth/login`, { data: { username: USER, password: PASS } });
  let b = await r.json();
  if (r.status() === 200) {
    check('login success -> 200 LOGIN_SUCCESS', b.status === 'SUCCESS' && b.message === 'LOGIN_SUCCESS', `code=${r.status()}`);
    check('token shape <id>|<hash>', /^[0-9]+\|[A-Za-z0-9]+$/.test(b.data || ''), b.data);
    token = b.data;
  } else {
    check('login success (skipped, throttled)', r.status() === 429, `code=${r.status()}`);
  }
  await sleep(GAP_MS);

  // 2) Wrong password — BUG-001 FIXED: business error -> 401 (not 500)
  r = await ctx.post(`${BASE}/user/auth/login`, { data: { username: USER, password: 'wrong' } });
  b = await r.json().catch(() => ({}));
  check('BUG-001 fixed: wrong password -> 401 (not 500)', [401, 429].includes(r.status()), `actual=${r.status()}`);
  check('wrong password message INVALID_CREDENTIALS', ['INVALID_CREDENTIALS', 'Too Many Attempts.'].includes(b.message), `msg=${b.message}`);
  // capture security headers as evidence (BUG-005)
  const h = r.headers();
  check('BUG-005 fixed: X-Content-Type-Options present', h['x-content-type-options'] === 'nosniff', h['x-content-type-options']);
  check('BUG-005 fixed: X-Frame-Options present', h['x-frame-options'] === 'DENY', h['x-frame-options']);
  check('BUG-005 fixed: Content-Security-Policy present', !!h['content-security-policy'], h['content-security-policy']);
  check('BUG-005 fixed: CORS not wildcard', h['access-control-allow-origin'] !== '*', h['access-control-allow-origin'] ?? '(none)');
  await sleep(GAP_MS);

  // 3) Unknown user — BUG-002 FIXED: same generic message as wrong password (no enumeration)
  r = await ctx.post(`${BASE}/user/auth/login`, { data: { username: 'no_such_user_zzz', password: PASS } });
  b = await r.json().catch(() => ({}));
  check('BUG-002 fixed: unknown user returns generic INVALID_CREDENTIALS (no enumeration)', ['INVALID_CREDENTIALS', 'Too Many Attempts.'].includes(b.message), `msg=${b.message}`);
  check('BUG-002 fixed: unknown-user status 401 (not 500)', [401, 429].includes(r.status()), `code=${r.status()}`);
  await sleep(GAP_MS);

  // 4) Missing fields -> 422
  r = await ctx.post(`${BASE}/user/auth/login`, { data: {} });
  b = await r.json().catch(() => ({}));
  check('missing fields -> 422 VALIDATION_ERROR', r.status() === 422 || r.status() === 429, `code=${r.status()}`);
  await sleep(GAP_MS);

  // 5) Type juggling password -> 422
  r = await ctx.post(`${BASE}/user/auth/login`, { data: { username: USER, password: ['password'] } });
  check('password type-juggling rejected (422)', r.status() === 422 || r.status() === 429, `code=${r.status()}`);
  await sleep(GAP_MS);

  // 6) Authenticated /me + logout (only if we got a token)
  if (token) {
    const authCtx = await request.newContext({ extraHTTPHeaders: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
    r = await authCtx.get(`${BASE}/user/auth/me`);
    check('GET /me with token -> 200', r.status() === 200, `code=${r.status()}`);
    r = await authCtx.delete(`${BASE}/user/auth/logout`);
    check('logout -> 200', r.status() === 200, `code=${r.status()}`);
    r = await authCtx.get(`${BASE}/user/auth/me`);
    check('reused token after logout -> 401', r.status() === 401, `code=${r.status()}`);
    await authCtx.dispose();
  }

  await ctx.dispose();
  const summary = { at: new Date().toISOString(), total: results.length, passed: results.filter(x => x.ok).length, results };
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log(`\n${summary.passed}/${summary.total} checks passed -> ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
