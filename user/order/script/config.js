/**
 * Central config for the User → Order E2E suite.
 * Everything (UI + API) points at the shared staging environment.
 */
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

module.exports = {
  baseURL: process.env.ORDER_BASE_URL || 'https://moon.dlyn.site',
  apiURL: process.env.ORDER_API_URL || 'https://api-moon.dlyn.site/api',
  creds: {
    username: process.env.ORDER_USER || 'user001',
    password: process.env.ORDER_PASS || 'password',
  },
  // SePay webhook shared secret (from api/.env — allowed by the test brief).
  webhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY || 'd2c92f983497660e380832869e93465b1184f39b2db3aa26',
  // Known-good fixtures discovered from the DB during analysis.
  fixtures: {
    // Simple product priced in VND (system token), sale price 63315, stock ~100.
    vndProduct: { id: 49, slug: 'doloribus-velit-consequatur-ea1fh5', token_id: 1, symbol: 'VND' },
    // Simple product priced in MOON (token_id 2).
    moonProduct: { id: 40, slug: 'ut-omnis-itaque-q3z0in', token_id: 2, symbol: 'MOON' },
    coupons: {
      publicPercent: 'SALE10',      // 10%, no min
      minOrder: 'SAVE20',           // 20%, min 200k, cap 50k
      privatePercent: 'VIP30',      // 30%, private (not assigned to user001)
      fixedVnd: 'FLAT50K',          // fixed 50k VND, min 150k
      notStarted: 'COMING15',       // starts 2026-07-12 (future)
    },
  },
  dirs: {
    root: ROOT,
    shots: path.join(ROOT, 'evidence', 'ui_ux', 'screenshots'),
    responsive: path.join(ROOT, 'evidence', 'ui_ux', 'responsive'),
    videos: path.join(ROOT, 'evidence', 'ui_ux', 'videos'),
    console: path.join(ROOT, 'evidence', 'console'),
    network: path.join(ROOT, 'evidence', 'network'),
    apiReq: path.join(ROOT, 'evidence', 'api', 'request'),
    apiRes: path.join(ROOT, 'evidence', 'api', 'response'),
    db: path.join(ROOT, 'evidence', 'db'),
    bug: path.join(ROOT, 'evidence', 'bug'),
  },
  viewports: {
    desktop_1920: { width: 1920, height: 1080 },
    desktop_1366: { width: 1366, height: 768 },
    ipad: { width: 820, height: 1180 },
    iphone14: { width: 390, height: 844 },
    iphoneSE: { width: 375, height: 667 },
  },
  defaultTimeout: 30000,
};
