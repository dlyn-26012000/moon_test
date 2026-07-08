/**
 * Shared helpers for the Home E2E suite: result logging, evidence capture,
 * network snapshotting.
 */
const fs = require('fs');
const path = require('path');
const { PATHS } = require('./fixtures');

// Ensure every evidence dir exists.
function ensureDirs() {
  [
    PATHS.ss, PATHS.responsive, PATHS.videos, PATHS.apiReq, PATHS.apiRes,
    PATHS.traces, path.dirname(PATHS.authState),
  ].forEach((d) => fs.mkdirSync(d, { recursive: true }));
}

// ---- Result collector ---------------------------------------------------
const results = [];
let pass = 0, fail = 0, warn = 0, blocked = 0;

function log(id, ok, msg, extra = '') {
  const tag = ok === true ? '✅' : ok === 'warn' ? '⚠️' : ok === 'blocked' ? '⬜' : '❌';
  if (ok === true) pass++;
  else if (ok === 'warn') warn++;
  else if (ok === 'blocked') blocked++;
  else fail++;
  // eslint-disable-next-line no-console
  console.log(`${tag} ${id} — ${msg}${extra ? ' | ' + extra : ''}`);
  results.push({ id, status: ok === true ? 'pass' : ok === 'warn' ? 'warn' : ok === 'blocked' ? 'blocked' : 'fail', msg, extra });
}

function totals() {
  return { total: results.length, pass, fail, warn, blocked };
}

// ---- Evidence -----------------------------------------------------------
const shot = (page, name, full = false) =>
  page.screenshot({ path: path.join(PATHS.ss, name), fullPage: full }).catch((e) => console.log('shot err', name, e.message));

const shotResponsive = (page, name) =>
  page.screenshot({ path: path.join(PATHS.responsive, name), fullPage: false }).catch((e) => console.log('resp shot err', name, e.message));

function saveJSON(dir, name, obj) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), JSON.stringify(obj, null, 2));
}

// Attach a listener that snapshots home API request/response bodies + builds an api log.
function attachApiCapture(page, apiHost, endpoints, apiLogLines) {
  page.on('response', async (res) => {
    try {
      const url = res.url();
      if (!url.includes(apiHost)) return;
      const req = res.request();
      const method = req.method();
      const status = res.status();
      const timing = res.request().timing ? res.request().timing() : null;
      apiLogLines.push({ method, url, status, ts: Date.now() });
      // snapshot only the home endpoints of interest
      const ep = endpoints.find((e) => url.includes(e.match));
      if (!ep) return;
      const safe = ep.id;
      // request
      saveJSON(PATHS.apiReq, `${safe}.json`, {
        method, url, headers: req.headers(), postData: req.postData() || null,
      });
      // response (guard non-JSON / huge)
      let body = null;
      const ct = (res.headers()['content-type'] || '');
      if (ct.includes('json')) {
        body = await res.json().catch(() => null);
      } else {
        body = (await res.text().catch(() => '')).slice(0, 2000);
      }
      saveJSON(PATHS.apiRes, `${safe}.json`, { status, contentType: ct, body });
    } catch (_) { /* swallow — capture is best-effort */ }
  });
}

module.exports = {
  ensureDirs, log, totals, results, shot, shotResponsive, saveJSON, attachApiCapture,
};
