/** Evidence-capture helpers: screenshots, console logs, network logs. */
const fs = require('fs');
const path = require('path');

const EV = path.resolve(__dirname, '../../evidence');
const dirs = {
  screenshots: path.join(EV, 'screenshots'),
  videos: path.join(EV, 'videos'),
  traces: path.join(EV, 'traces'),
  network: path.join(EV, 'network'),
  logs: path.join(EV, 'logs'),
  gifs: path.join(EV, 'gifs'),
};
Object.values(dirs).forEach((d) => fs.mkdirSync(d, { recursive: true }));

async function shot(page, name) {
  const file = path.join(dirs.screenshots, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

/** Attach console + network listeners to a page; returns a save() fn. */
function attachRecorders(page, tag) {
  const consoleLines = [];
  const netLines = [];
  page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => consoleLines.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => netLines.push(`FAILED ${r.method()} ${r.url()} — ${r.failure()?.errorText}`));
  page.on('response', async (res) => {
    const u = res.url();
    if (u.includes('/user/auth/') || u.includes('/api/')) {
      netLines.push(`${res.status()} ${res.request().method()} ${u}`);
    }
  });
  return {
    save() {
      fs.writeFileSync(path.join(dirs.logs, `console-${tag}.log`), consoleLines.join('\n') || '(no console output)');
      fs.writeFileSync(path.join(dirs.network, `network-${tag}.log`), netLines.join('\n') || '(no matching network calls)');
    },
  };
}

module.exports = { dirs, shot, attachRecorders };
