// Olostep website audit: crawls nav/footer/sitemap pages, captures desktop + mobile
// screenshots, SEO/OG/structured data, headers, page weight, CWV-ish timings, axe-lite checks,
// broken links, and verifies specific suspected issues. Usage:
//   npm i playwright   (or use a global install)
//   node audit.mjs [outDir]
// Output: <outDir>/report.json, <outDir>/suspects.json, <outDir>/shots/*.png
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv[2] || 'out';
const ORIGIN = 'https://www.olostep.com';
const SEED = [
  '/', '/pricing', '/about', '/blog/about-olostep', '/api-endpoints', '/endpoints',
  '/use-cases', '/use-cases/ai-platforms', '/use-cases/power-ai-platforms',
  '/integrations', '/orbit', '/blog', '/glossary', '/playground',
  '/this-page-should-404-' + Date.now(),
];
const EXTRA_HOSTS = ['https://docs.olostep.com/'];
const MAX_PAGES = Number(process.env.MAX_PAGES || 150);
const SEC_HEADERS = ['strict-transport-security', 'content-security-policy', 'x-frame-options',
  'x-content-type-options', 'referrer-policy', 'permissions-policy'];

await fs.mkdir(path.join(OUT, 'shots'), { recursive: true });

async function fetchText(url) {
  try {
    const r = await fetch(url, { redirect: 'manual' });
    return { status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() };
  } catch (e) { return { status: 0, error: String(e) }; }
}

// 1. robots / sitemap / llms
const meta = {};
for (const f of ['robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt']) {
  meta[f] = await fetchText(`${ORIGIN}/${f}`);
}
const sitemapUrls = [];
async function readSitemap(url, depth = 0) {
  const r = depth === 0 ? meta['sitemap.xml'] : await fetchText(url);
  const locs = [...(r.body || '').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m => m[1]);
  for (const l of locs) {
    if (l.endsWith('.xml') && depth < 2) await readSitemap(l, depth + 1);
    else sitemapUrls.push(l);
  }
}
await readSitemap(`${ORIGIN}/sitemap.xml`);

// 2. crawl
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const queue = [...new Set([...SEED.map(p => ORIGIN + p), ...EXTRA_HOSTS, ...sitemapUrls])];
const seen = new Set();
const pages = [];
const allLinks = new Set();

const slug = u => u.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_').slice(0, 120);

async function auditPage(url) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  let bytes = 0, requests = 0;
  page.on('response', async r => { requests++; const l = r.headers()['content-length']; if (l) bytes += +l; });
  await page.addInitScript(() => {
    window.__cwv = { lcp: 0, cls: 0 };
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__cwv.lcp = e.startTime; })
      .observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cwv.cls += e.value; })
      .observe({ type: 'layout-shift', buffered: true });
  });
  const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => null);
  const status = resp ? resp.status() : 0;
  const headers = resp ? resp.headers() : {};
  await page.waitForTimeout(1500);
  const data = await page.evaluate(() => {
    const q = s => document.querySelector(s);
    const m = n => q(`meta[name="${n}"]`)?.content ?? q(`meta[property="${n}"]`)?.content ?? null;
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const imgs = [...document.images];
    const txt = document.body?.innerText || '';
    const grab = re => [...new Set(txt.match(re) || [])].slice(0, 30);
    return {
      finalUrl: location.href,
      title: document.title, description: m('description'), robots: m('robots'),
      canonical: q('link[rel=canonical]')?.href ?? null,
      lang: document.documentElement.lang || null,
      og: Object.fromEntries(['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'twitter:card', 'twitter:image'].map(k => [k, m(k)])),
      jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { const j = JSON.parse(s.textContent); return [].concat(j['@graph'] || j).map(x => x['@type']); } catch { return 'INVALID_JSON'; } }).flat(),
      h1: [...document.querySelectorAll('h1')].map(h => h.innerText.trim()).slice(0, 5),
      imgsNoAlt: imgs.filter(i => !i.hasAttribute('alt')).length, imgCount: imgs.length,
      buttonsNoName: [...document.querySelectorAll('button,a')].filter(b => !b.innerText.trim() && !b.getAttribute('aria-label') && !b.querySelector('img[alt]:not([alt=""]),svg title')).length,
      inputsNoLabel: [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(i => !i.labels?.length && !i.getAttribute('aria-label') && !i.getAttribute('placeholder')).length,
      links: [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith('http')),
      ttfb: nav.responseStart, domContentLoaded: nav.domContentLoadedEventEnd, load: nav.loadEventEnd,
      transferSize: performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), nav.transferSize || 0),
      cwv: window.__cwv,
      // strings relevant to suspected inconsistencies
      mentions: {
        credits: grab(/[^.\n]{0,60}\bcredits?\b[^.\n]{0,60}/gi),
        requests: grab(/[^.\n]{0,60}\brequests?\b[^.\n]{0,60}/gi),
        trial: grab(/[^.\n]{0,60}\b(free trial|trial|free credits|free requests)\b[^.\n]{0,60}/gi),
        concurrency: grab(/[^.\n]{0,60}\b(concurren\w+|parallel)\b[^.\n]{0,60}/gi),
        yearly: grab(/[^.\n]{0,40}\b(yearly|annual)\b[^.\n]{0,40}/gi),
        orbit: grab(/[^.\n]{0,80}\borbit\b[^.\n]{0,80}/gi),
        y2027: grab(/[^.\n]{0,80}\b2027\b[^.\n]{0,80}/gi),
      },
      textLen: txt.length,
    };
  }).catch(e => ({ error: String(e) }));
  const s = slug(url);
  await page.screenshot({ path: path.join(OUT, 'shots', `${s}__desktop.png`), fullPage: true }).catch(() => {});
  await ctx.close();

  // mobile pass: screenshot + horizontal overflow check
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const mp = await mctx.newPage();
  await mp.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await mp.waitForTimeout(1000);
  const mobile = await mp.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
    overflowing: [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 5).map(e => e.tagName + '.' + (e.className?.toString?.() || '').slice(0, 40)),
    smallTapTargets: [...document.querySelectorAll('a,button')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 24 || r.height < 24); }).length,
  })).catch(() => ({}));
  await mp.screenshot({ path: path.join(OUT, 'shots', `${s}__mobile.png`), fullPage: true }).catch(() => {});
  await mctx.close();

  const secHeaders = Object.fromEntries(SEC_HEADERS.map(h => [h, headers[h] ?? null]));
  return { url, status, server: headers.server, cache: headers['cache-control'], secHeaders, bytesApprox: bytes, requests, mobile, ...data };
}

while (queue.length && pages.length < MAX_PAGES) {
  const url = queue.shift().split('#')[0];
  if (seen.has(url)) continue;
  seen.add(url);
  process.stdout.write(`audit ${url}\n`);
  const r = await auditPage(url);
  pages.push(r);
  for (const l of r.links || []) {
    allLinks.add(l.split('#')[0]);
    const u = new URL(l);
    if (u.origin === ORIGIN && !seen.has(l.split('#')[0]) && pages.length + queue.length < MAX_PAGES) queue.push(l.split('#')[0]);
  }
}
await browser.close();

// 3. broken-link check (HEAD, fallback GET)
const linkStatus = {};
for (const l of allLinks) {
  if (/^mailto:|^tel:/.test(l)) continue;
  let r = await fetch(l, { method: 'HEAD', redirect: 'follow' }).catch(() => null);
  if (!r || r.status >= 400) r = await fetch(l, { redirect: 'follow' }).catch(() => null);
  linkStatus[l] = r ? r.status : 0;
}
const broken = Object.entries(linkStatus).filter(([, s]) => s === 0 || s >= 400);

// 4. duplicate detection: same title/description/canonical across URLs
const byKey = {};
for (const p of pages) for (const k of ['title', 'description', 'canonical']) {
  if (!p[k]) continue;
  (byKey[`${k}::${p[k]}`] ||= []).push(p.url);
}
const duplicates = Object.entries(byKey).filter(([, v]) => v.length > 1);

// 5. suspect verification
const get = p => pages.find(x => x.url === ORIGIN + p || x.url === ORIGIN + p + '/');
const pair = (a, b) => { const A = get(a), B = get(b); return A && B && {
  [a]: { status: A.status, finalUrl: A.finalUrl, canonical: A.canonical, title: A.title, robots: A.robots },
  [b]: { status: B.status, finalUrl: B.finalUrl, canonical: B.canonical, title: B.title, robots: B.robots },
  verdict: A.finalUrl === B.finalUrl ? 'redirects to same URL (OK)'
    : (A.canonical && A.canonical === B.canonical) ? 'both live, share canonical (acceptable)'
    : 'both indexable with different canonicals: DUPLICATE' }; };
const pricing = get('/pricing');
const suspects = {
  aboutDup: pair('/about', '/blog/about-olostep'),
  endpointsDup: pair('/api-endpoints', '/endpoints'),
  useCaseDup: pair('/use-cases/ai-platforms', '/use-cases/power-ai-platforms'),
  pricingRequestsVsCredits: pricing && { credits: pricing.mentions.credits, requests: pricing.mentions.requests },
  yearlyComingSoon: pricing?.mentions.yearly,
  orbit2027: { aboutPost: get('/blog/about-olostep')?.mentions.y2027, about: get('/about')?.mentions.y2027, orbitPage: get('/orbit')?.mentions.orbit?.slice(0, 8) },
  trialAndConcurrencyAcrossSite: pages.map(p => ({ url: p.url, trial: p.mentions?.trial, concurrency: p.mentions?.concurrency }))
    .filter(x => x.trial?.length || x.concurrency?.length),
  notFoundPage: pages.find(p => p.url.includes('this-page-should-404')),
};

await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify({ meta: Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, { status: v.status, body: v.body?.slice(0, 20000) }])), sitemapCount: sitemapUrls.length, pages, broken, duplicates }, null, 2));
await fs.writeFile(path.join(OUT, 'suspects.json'), JSON.stringify(suspects, null, 2));
console.log(`done: ${pages.length} pages, ${broken.length} broken links, ${duplicates.length} duplicate groups -> ${OUT}`);
