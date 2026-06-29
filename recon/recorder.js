// DEHú API recon recorder.
// Launches your installed Chrome with a fresh profile, opens DEHú, and records
// ONLY the STRUCTURE of API calls (URLs, param names, JSON field names, auth
// scheme, cookie names). Every string value is masked so tokens/cookies/NIF/
// notification content never leave your machine or enter the transcript.
//
// You log in yourself in the window. This script never touches credentials.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'capture.jsonl');
const USER_DATA = path.join(__dirname, 'chrome-profile');
const START_URL = 'https://dehu.redsara.es/es/home-view';

// fresh log each run
try { fs.unlinkSync(OUT); } catch (_) {}
function out(o) { fs.appendFileSync(OUT, JSON.stringify(o) + '\n'); }

const DATE_RE = /^\d{4}-\d{2}-\d{2}([T ].*)?$|^\d{2}\/\d{2}\/\d{4}$/;

// Mask a scalar: keep dates (to learn the format) and small ints (page/size),
// otherwise reveal only the type + length, never the content.
function redactScalar(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v;
  const s = String(v);
  if (DATE_RE.test(s)) return s;
  if (/^-?\d+$/.test(s) && s.length <= 6) return Number(s);
  if (/^(true|false)$/i.test(s)) return s.toLowerCase();
  return `<str:${s.length}>`;
}

// Recursively reduce a JSON value to its KEY structure, masking all leaf values.
function structure(v, depth = 0) {
  if (depth > 7) return '…';
  if (Array.isArray(v)) {
    return { __array_len: v.length, __item: v.length ? structure(v[0], depth + 1) : null };
  }
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = structure(v[k], depth + 1);
    return o;
  }
  return redactScalar(v);
}

function redactUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    const params = {};
    for (const [k, val] of u.searchParams) params[k] = redactScalar(val);
    return { endpoint: u.origin + u.pathname, params };
  } catch (_) {
    return { endpoint: urlStr, params: {} };
  }
}

function authInfo(headers) {
  const info = {};
  const auth = headers['authorization'];
  if (auth) info.authorization_scheme = String(auth).split(' ')[0]; // scheme only
  const cookie = headers['cookie'];
  if (cookie) info.cookie_names = cookie.split(';').map(c => c.split('=')[0].trim());
  const ct = headers['content-type'];
  if (ct) info.request_content_type = ct;
  return info;
}

(async () => {
  const context = await chromium.launchPersistentContext(USER_DATA, {
    channel: 'chrome',
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });

  let count = 0;
  const seen = new Set(); // dedupe by method+endpoint+sorted-param-names

  context.on('response', async (response) => {
    try {
      const req = response.request();
      const type = req.resourceType();
      if (!['xhr', 'fetch', 'document'].includes(type)) return;

      const url = response.url();
      if (!/redsara\.es|gob\.es|dehu/i.test(url)) return; // only the gov hosts

      const reqHeaders = await req.allHeaders();
      const ru = redactUrl(url);

      let reqBody = null;
      const post = req.postData();
      if (post) {
        try { reqBody = structure(JSON.parse(post)); }
        catch (_) { reqBody = `<non-json:${post.length}>`; }
      }

      const respCT = (response.headers()['content-type'] || '');
      let respStruct = null;
      if (respCT.includes('json')) {
        try { respStruct = structure(await response.json()); }
        catch (_) {}
      }

      const key = req.method() + ' ' + ru.endpoint + ' ?' +
        Object.keys(ru.params).sort().join(',');
      const firstTime = !seen.has(key);
      if (firstTime) seen.add(key);

      out({
        method: req.method(),
        status: response.status(),
        resourceType: type,
        ...ru,
        auth: authInfo(reqHeaders),
        response_content_type: respCT.split(';')[0],
        requestBody: reqBody,
        responseStructure: respStruct,
        firstTimeSeen: firstTime,
      });
      count++;
      if (count % 5 === 0) console.log(`[recorder] captured ${count} API calls (${seen.size} unique)`);
    } catch (_) { /* ignore individual failures */ }
  });

  console.log('[recorder] Chrome launching… opening DEHú. Log in and browse Notificaciones + Comunicaciones.');
  try { await context.pages()[0].goto(START_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
  catch (_) { console.log('[recorder] (navigation slow — log in manually if the page is up)'); }

  // Stay alive until killed.
  process.on('SIGTERM', async () => { await context.close().catch(() => {}); process.exit(0); });
  await new Promise(() => {});
})();
