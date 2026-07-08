// Focused probe: capture 404 resources, inspect header search, verify logout.
const { chromium } = require('playwright');
const { BASE, CREDS } = require('./fixtures');

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, locale: 'vi-VN' });
  const p = await ctx.newPage();
  const notFound = [];
  p.on('response', (r) => { if (r.status() === 404) notFound.push(r.url()); });
  await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.locator('button[aria-label="Account menu"]').first().waitFor({ state: 'visible', timeout: 30000 });
  await p.waitForTimeout(2000);

  console.log('=== 404 resources ===');
  [...new Set(notFound)].forEach((u) => console.log(' 404:', u));

  // Search structure
  console.log('\n=== header search inputs ===');
  const inputs = await p.$$eval('input', (els) => els.map((e) => ({
    type: e.type, ph: e.placeholder, id: e.id, name: e.name,
    visible: !!(e.offsetWidth || e.offsetHeight),
  })));
  console.log(JSON.stringify(inputs, null, 1));
  // Try search flow explicitly
  const s = p.locator('input[type="search"], input[placeholder*="ìm" i], input[placeholder*="earch" i]').first();
  if (await s.count()) {
    await s.click(); await s.fill('ao'); await p.keyboard.press('Enter');
    await p.waitForTimeout(2000);
    console.log('after search URL =', p.url());
  } else console.log('no search input matched');

  // Logout verify
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.locator('button[aria-label="Account menu"]').first().click();
  await p.waitForTimeout(500);
  await (await p.getByRole('button', { name: /Đăng nhập|Login/ }).first()).click().catch(()=>{});
  await p.locator('div[role="dialog"]').first().waitFor({ state: 'visible', timeout: 8000 });
  await p.locator('#login-username').fill(CREDS.username);
  await p.locator('#login-password').fill(CREDS.password);
  await p.locator('div[role="dialog"]').getByRole('button', { name: /Đăng nhập|Login/ }).last().click();
  await p.waitForTimeout(3500);
  await p.locator('button[aria-label="Account menu"]').first().click();
  await p.waitForTimeout(600);
  const menuItems = await p.$$eval('[role="dialog"] button, header button, [role="menu"] *', (els) =>
    els.map((e) => e.textContent.trim()).filter(Boolean).slice(0, 30));
  console.log('\n=== logged-in account menu items ===');
  console.log(JSON.stringify([...new Set(menuItems)]));
  await b.close();
})();
