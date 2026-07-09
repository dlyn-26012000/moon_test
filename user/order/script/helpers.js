/**
 * Shared helpers: HTTP client, DB access, evidence logging.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const cfg = require('./config');

// ---- DB access (uses local mysql CLI + api/.env creds) --------------------
function dbPass() {
  const env = fs.readFileSync(path.resolve(__dirname, '../../../../api/.env'), 'utf8');
  const m = env.match(/^DB_PASSWORD=(.*)$/m);
  return m ? m[1].trim() : '';
}
function db(sql) {
  const out = execFileSync(
    'mysql',
    ['-u', 'dlyn', `-p${dbPass()}`, 'moon', '-N', '--batch', '-e', sql],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  );
  return out.trim();
}
function dbRows(sql) {
  const out = db(sql);
  if (!out) return [];
  return out.split('\n').map((line) => line.split('\t'));
}

// ---- HTTP client -----------------------------------------------------------
let apiLog = [];
async function api(method, endpoint, { token, body, headers = {}, raw } = {}) {
  const url = endpoint.startsWith('http') ? endpoint : cfg.apiURL + endpoint;
  const h = { Accept: 'application/json', ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  let payload;
  if (body !== undefined) {
    h['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const t0 = Date.now();
  const res = await fetch(url, { method, headers: h, body: payload });
  const ms = Date.now() - t0;
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) { /* non-json */ }
  const entry = {
    ts: new Date().toISOString(),
    method, url, status: res.status, ms,
    request: body ?? null,
    response: raw ? text.slice(0, 2000) : json,
  };
  apiLog.push(entry);
  return { status: res.status, json, text, ms, headers: res.headers };
}

function saveApiLog(file) {
  fs.writeFileSync(file, JSON.stringify(apiLog, null, 2));
  return apiLog.length;
}
function resetApiLog() { apiLog = []; }

// ---- evidence --------------------------------------------------------------
function ensureDirs() {
  Object.values(cfg.dirs).forEach((d) => fs.mkdirSync(d, { recursive: true }));
}
function saveJSON(dir, name, obj) {
  const f = path.join(dir, name);
  fs.writeFileSync(f, JSON.stringify(obj, null, 2));
  return f;
}

// ---- login -----------------------------------------------------------------
async function login() {
  const r = await api('POST', '/user/auth/login', {
    body: { username: cfg.creds.username, password: cfg.creds.password },
  });
  if (r.status !== 200 || !r.json?.data) {
    throw new Error('Login failed: ' + r.status + ' ' + r.text.slice(0, 200));
  }
  return r.json.data; // sanctum token
}

// ---- assertions ------------------------------------------------------------
const results = [];
function record(id, name, group, passed, detail, evidence) {
  results.push({ id, name, group, status: passed ? 'PASS' : 'FAIL', detail, evidence: evidence || null });
  const tag = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${tag} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
  return passed;
}
function getResults() { return results; }

module.exports = {
  cfg, db, dbRows, api, saveApiLog, resetApiLog, ensureDirs, saveJSON,
  login, record, getResults,
};
