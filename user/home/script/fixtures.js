/**
 * Fixtures / test data for the User Home E2E suite.
 * Central config consumed by home.spec.js (raw Playwright — no @playwright/test runner).
 */
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

module.exports = {
  BASE: process.env.HOME_BASE_URL || 'https://moon.dlyn.site',
  API_HOST: 'api-moon.dlyn.site',

  // Provided test account (Login is a Precondition only — NOT under test).
  CREDS: { username: 'user001', password: 'password' },

  // Home SSR endpoints (see logic-analysis.md §8). Used to snapshot request/response.
  HOME_ENDPOINTS: [
    { id: 'banners', match: '/user/banners' },
    { id: 'products-sale', match: 'filters[is_sale]' },
    { id: 'products-featured', match: 'filters[is_featured]' },
    { id: 'top-favorites', match: '/user/products/top-favorites' },
    { id: 'campaigns-active', match: '/user/campaigns/active' },
    { id: 'seo-settings', match: '/user/seo-settings' },
    { id: 'categories', match: '/user/categories' },
  ],

  // Responsive matrix mandated by test/rule.md §5.
  VIEWPORTS: [
    { group: 'desktop', name: 'desktop-1920x1080', width: 1920, height: 1080 },
    { group: 'desktop', name: 'desktop-1440x900', width: 1440, height: 900 },
    { group: 'desktop', name: 'desktop-1366x768', width: 1366, height: 768 },
    { group: 'tablet', name: 'tablet-ipad-768x1024', width: 768, height: 1024 },
    { group: 'tablet', name: 'tablet-ipad-air-820x1180', width: 820, height: 1180 },
    { group: 'mobile', name: 'mobile-iphone14-390x844', width: 390, height: 844 },
    { group: 'mobile', name: 'mobile-iphone-se-375x667', width: 375, height: 667 },
    { group: 'mobile', name: 'mobile-pixel7-412x915', width: 412, height: 915 },
    { group: 'mobile', name: 'mobile-galaxy-s23-360x780', width: 360, height: 780 },
  ],

  PATHS: {
    root: ROOT,
    ss: path.join(ROOT, 'evidence', 'ui_ux', 'screenshots'),
    responsive: path.join(ROOT, 'evidence', 'ui_ux', 'responsive'),
    videos: path.join(ROOT, 'evidence', 'ui_ux', 'videos'),
    consoleLog: path.join(ROOT, 'evidence', 'ui_ux', 'console.log'),
    apiReq: path.join(ROOT, 'evidence', 'api', 'request'),
    apiRes: path.join(ROOT, 'evidence', 'api', 'response'),
    apiLog: path.join(ROOT, 'evidence', 'api', 'api-log.md'),
    har: path.join(ROOT, 'evidence', 'api', 'network.har'),
    traces: path.join(ROOT, 'evidence', 'traces'),
    authState: path.join(ROOT, 'assets', 'test-data', 'auth-state.json'),
    results: path.join(ROOT, 'assets', 'test-data', 'run-results.json'),
  },
};
