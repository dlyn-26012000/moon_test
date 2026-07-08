/**
 * Config for the standalone Login suite.
 * (Project uses raw `playwright` — no @playwright/test runner installed —
 *  so this file centralises settings consumed by run.js.)
 */
const path = require('path');
module.exports = {
  baseURL: process.env.LOGIN_BASE_URL || 'https://moon.dlyn.site',
  headless: true,
  defaultTimeout: 30000,
  video: { mode: 'on', dir: path.resolve(__dirname, '../evidence/videos') },
  trace: { mode: 'on', dir: path.resolve(__dirname, '../evidence/traces') },
  viewport: { width: 1366, height: 900 },
  // Login endpoint is throttled 5 req/min per IP — space real login attempts.
  throttleGuardMs: 13000,
};
