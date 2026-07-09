// Shared helpers: evidence dirs, screenshot, recorders (console + network HAR-ish).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EV = path.join(ROOT, 'evidence');
const dirs = {
  screenshots: path.join(EV, 'ui_ux', 'screenshots'),
  videos: path.join(EV, 'ui_ux', 'videos'),
  responsive: path.join(EV, 'ui_ux', 'responsive'),
  logs: path.join(EV, 'ui_ux'),
  bug: path.join(EV, 'bug'),
};
Object.values(dirs).forEach((d) => fs.mkdirSync(d, { recursive: true }));

async function shot(page, name) {
  try {
    await page.screenshot({ path: path.join(dirs.screenshots, `${name}.png`), fullPage: false });
  } catch (e) { /* page may be closing */ }
}
async function shotResponsive(page, name) {
  try { await page.screenshot({ path: path.join(dirs.responsive, `${name}.png`), fullPage: true }); } catch {}
}
async function shotBug(page, bug, name) {
  const d = path.join(dirs.bug, bug);
  fs.mkdirSync(d, { recursive: true });
  try { await page.screenshot({ path: path.join(d, `${name}.png`), fullPage: false }); } catch {}
}

// Attach console + network recorders; returns a flush() that writes logs to disk.
function attachRecorders(page, tag) {
  const console_ = [];
  const network = [];
  page.on('console', (msg) => console_.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => console_.push(`[pageerror] ${err.message}`));
  page.on('requestfinished', async (reqst) => {
    const url = reqst.url();
    if (!/\/api\//.test(url)) return;
    let status = null;
    try { const resp = await reqst.response(); status = resp && resp.status(); } catch {}
    network.push({ method: reqst.method(), url, status, post: reqst.postData() || null });
  });
  page.on('requestfailed', (reqst) => {
    if (/\/api\//.test(reqst.url())) network.push({ method: reqst.method(), url: reqst.url(), status: 'FAILED', error: reqst.failure()?.errorText });
  });
  return {
    flush() {
      fs.appendFileSync(path.join(dirs.logs, 'console.log'), `\n===== ${tag} =====\n` + console_.join('\n') + '\n');
      fs.writeFileSync(path.join(EV, 'api', `network-${tag}.json`), JSON.stringify(network, null, 2));
      return { console_, network };
    },
  };
}

module.exports = { dirs, EV, ROOT, shot, shotResponsive, shotBug, attachRecorders };
