#!/usr/bin/env node
/**
 * Home API suite — live against api-moon.dlyn.site.
 * Zero deps (node18+ global fetch). Saves raw responses to ../evidence/network.
 * Run: node home.api.spec.js
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.HOME_API_BASE || 'https://api-moon.dlyn.site/api';
const NET = path.resolve(__dirname, '../evidence/network');
fs.mkdirSync(NET, { recursive: true });

const PROD_INC = 'thumbnail.file,images.file,tags,translations,prices.token';
let pass = 0, fail = 0, warn = 0;
const results = [];

function log(id, ok, msg, extra = '') {
  const tag = ok === true ? '✅' : ok === 'warn' ? '⚠️' : '❌';
  if (ok === true) pass++; else if (ok === 'warn') warn++; else fail++;
  console.log(`${tag} ${id} — ${msg}${extra ? ' | ' + extra : ''}`);
  results.push({ id, ok, msg, extra });
}

async function req(pathq, { method = 'GET', headers = {}, save } = {}) {
  const url = `${BASE}${pathq}`;
  const t0 = Date.now();
  let res, text, json = null;
  try {
    res = await fetch(url, { method, headers: { accept: 'application/json', language: 'vi', ...headers } });
    text = await res.text();
    try { json = JSON.parse(text); } catch {}
  } catch (e) {
    return { error: String(e), ms: Date.now() - t0 };
  }
  const ms = Date.now() - t0;
  if (save) fs.writeFileSync(path.join(NET, save), text);
  return { status: res.status, headers: Object.fromEntries(res.headers), json, text, ms, url };
}

const len = (r) => Array.isArray(r?.json?.data) ? r.json.data.length : (r?.json?.data?.items?.length ?? null);

(async () => {
  console.log(`\n=== Home API suite @ ${BASE} ===\n`);

  // ---------- C. API endpoints / schema ----------
  const banners = await req('/user/banners?includes=file', { save: 'A01-banners.json' });
  log('TC-A01', banners.status === 200 && Array.isArray(banners.json?.data), `banners HTTP ${banners.status}`,
    `items=${len(banners)} ${banners.ms}ms`);
  {
    const b = banners.json?.data || [];
    const orders = b.map((x) => x.order);
    const sortedAsc = orders.every((v, i) => i === 0 || orders[i - 1] <= v);
    const allActive = b.every((x) => x.is_active === true);
    const hasFile = b.every((x) => x.file && x.file.url);
    log('TC-B-banner', allActive && sortedAsc && hasFile ? true : 'warn',
      `banners is_active=${allActive} sortedByOrderAsc=${sortedAsc} file.url=${hasFile}`,
      `types=${[...new Set(b.map((x) => x.type))].join(',')}`);
  }

  const sale = await req(`/user/products?includes=${PROD_INC}&filters[is_sale]=1&per_page=4`, { save: 'A02-sale.json' });
  log('TC-A02', sale.status === 200, `products is_sale HTTP ${sale.status}`, `items=${len(sale)} (≤4?) ${sale.ms}ms`);

  const feat = await req(`/user/products?includes=${PROD_INC}&filters[is_featured]=1&per_page=4`, { save: 'A03-featured.json' });
  log('TC-A03', feat.status === 200, `products is_featured HTTP ${feat.status}`, `items=${len(feat)} ${feat.ms}ms`);

  const tf = await req('/user/products/top-favorites?limit=8', { save: 'A04-topfav.json' });
  {
    const arr = tf.json?.data || [];
    const counts = arr.map((x) => x.favorites_count);
    const allPos = arr.every((x) => Number(x.favorites_count) > 0);
    const desc = counts.every((v, i) => i === 0 || Number(counts[i - 1]) >= Number(v));
    log('TC-A04', tf.status === 200 && allPos && desc ? true : 'warn',
      `top-favorites HTTP ${tf.status} count>0=${allPos} sortedDesc=${desc}`, `items=${arr.length}`);
  }

  const camp = await req('/user/campaigns/active', { save: 'A05-campaigns.json' });
  log('TC-A05', camp.status === 200 && Array.isArray(camp.json?.data), `campaigns/active HTTP ${camp.status}`,
    `items=${len(camp)} (empty ⇒ FlashSale dùng is_sale)`);

  // TC-A06 envelope + content-type
  {
    const ct = banners.headers['content-type'] || '';
    const env = banners.json && 'status' in banners.json && 'message' in banners.json && 'data' in banners.json;
    log('TC-A06', env && /application\/json/.test(ct) ? true : 'warn',
      `envelope keys=${Object.keys(banners.json || {}).join(',')}`, `content-type=${ct}`);
  }

  // ---------- D. Validation ----------
  // BUG-C1 / TC-V01: does ?limit actually apply?
  const l2 = await req('/user/products/top-favorites?limit=2', { save: 'V01-limit2.json' });
  const l8 = await req('/user/products/top-favorites?limit=8', { save: 'V01-limit8.json' });
  const l50 = await req('/user/products/top-favorites?limit=50', { save: 'V01-limit50.json' });
  {
    const n2 = len(l2), n8 = len(l8), n50 = len(l50);
    const ignored = n2 === n8 && n8 === n50; // same regardless of limit
    log('BUG-C1', ignored ? false : true,
      `top-favorites limit param ${ignored ? 'IGNORED (bug confirmed)' : 'respected'}`,
      `limit2=${n2} limit8=${n8} limit50=${n50}`);
  }

  const pp0 = await req(`/user/products?filters[is_sale]=1&per_page=0`, { save: 'V02-perpage0.json' });
  log('TC-V02', pp0.status === 422 ? true : 'warn', `per_page=0 HTTP ${pp0.status} (mong 422 min:1)`);

  const ppAbc = await req(`/user/products?filters[is_sale]=1&per_page=abc`, { save: 'V03-perpageabc.json' });
  log('TC-V03', ppAbc.status !== 500 ? true : false, `per_page=abc HTTP ${ppAbc.status} (không được 500)`);

  // BUG-C2 / TC-V04: array filter -> trim(array) TypeError 500?
  const arrFilter = await req(`/user/products?filters[is_sale][]=1&per_page=4`, { save: 'V04-arrayfilter.json' });
  log('BUG-C2', arrFilter.status === 500 ? false : true,
    `filters[is_sale][]=1 HTTP ${arrFilter.status} ${arrFilter.status === 500 ? '(500 — bug confirmed)' : '(no crash)'}`);
  log('TC-V04', arrFilter.status === 500 ? false : true, `array filter graceful=${arrFilter.status !== 500}`);

  const ordBad = await req(`/user/products?orders[password]=asc&per_page=4`, { save: 'V05-orders-badcol.json' });
  log('TC-V05', ordBad.status === 200 ? true : 'warn', `orders[password]=asc HTTP ${ordBad.status} (whitelist ⇒ 200, bỏ qua cột)`);

  const ordInj = await req(`/user/products?${encodeURI('orders[id]=;DROP TABLE products')}&per_page=4`, { save: 'V06-orders-sqli.json' });
  log('TC-V06', ordInj.status !== 500 ? true : false, `orders SQLi HTTP ${ordInj.status} (không thực thi ⇒ không 500)`);

  // ---------- E. Security ----------
  log('TC-S01', banners.status === 200 && sale.status === 200 && tf.status === 200 && camp.status === 200 ? true : false,
    `5 endpoint public không cần token`);

  // TC-S04 top-favorites không lộ PII người like
  {
    const raw = tf.text || '';
    const leaks = /"email"|"phone"|"password"|"user_id"/.test(raw);
    log('TC-S04', leaks ? false : true, `top-favorites PII leak=${leaks}`);
  }
  // TC-S02 IDOR / dữ liệu user riêng trong response guest
  {
    const raw = (banners.text || '') + (sale.text || '') + (tf.text || '');
    const priv = /"is_favorited"|"email"|"phone"/.test(raw);
    log('TC-S02', priv ? 'warn' : true, `guest response chứa field riêng tư=${priv}`);
  }
  // TC-S06 security headers
  {
    const h = banners.headers;
    const present = ['x-content-type-options', 'x-frame-options', 'content-security-policy', 'strict-transport-security']
      .filter((k) => h[k]);
    log('TC-S06', present.length ? true : 'warn', `security headers present: ${present.join(',') || 'NONE'}`);
  }
  // TC-S07 wrong method
  const post = await req('/user/banners', { method: 'POST', save: 'S07-wrongmethod.json' });
  log('TC-S07', post.status === 405 ? true : 'warn', `POST vào GET endpoint HTTP ${post.status} (mong 405)`);

  // BUG-C6 SSR language: does language header change response? (en vs vi)
  const vi = await req('/user/products?filters[is_featured]=1&per_page=1', { headers: { language: 'vi' } });
  const en = await req('/user/products?filters[is_featured]=1&per_page=1', { headers: { language: 'en' } });
  {
    const same = (vi.text || '') === (en.text || '');
    log('BUG-C6', 'warn', `language header vi vs en cho response ${same ? 'GIỐNG (i18n có thể không đổi qua header)' : 'KHÁC'}`);
  }

  console.log(`\n=== DONE: ${pass} pass, ${warn} warn, ${fail} fail ===`);
  fs.writeFileSync(path.join(NET, '_summary.json'), JSON.stringify(results, null, 2));
})();
