import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const axeSrc = await fs.readFile(require.resolve('axe-core/axe.min.js'), 'utf8');

const OUT = process.argv[2];
const O = 'https://www.olostep.com';
const PAGES = ['/', '/pricing', '/about', '/blog/about-olostep', '/api-endpoints',
  ...['answers', 'scrapes', 'maps', 'crawls', 'batches', 'searches', 'monitors'].map(e => '/api-endpoints/' + e),
  '/use-cases', '/use-cases/power-ai-platforms', '/use-cases/sales-lead-enrichment', '/use-cases/deep-research',
  '/use-cases/competitive-intelligence', '/use-cases/seo-teams',
  '/integrations', '/integrations/mcp-server', '/orbit', '/orbit/cloud', '/orbit/webstore', '/orbit/extension-launcher',
  '/blog', '/glossary', '/playground', '/customers', '/frequently-asked-questions', '/contact-sales', '/changelog',
  '/careers', '/store', '/store/bing-search', '/scrapers/bing-search', '/apis/web-scraping-api', '/de/pricing', '/tools',
  '/this-page-does-not-exist-xyz'].map(p => O + p).concat(['https://docs.olostep.com/', 'https://docs.olostep.com/get-started/welcome']);

await fs.mkdir(`${OUT}/shots`, { recursive: true });
await fs.mkdir(`${OUT}/text`, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const slug = u => u.replace(/^https?:\/\/(www\.)?/, '').replace(/[^a-z0-9]+/gi, '_').replace(/_$/, '') || 'home';

const initCWV = () => {
  window.__m = { lcp: 0, lcpEl: '', cls: 0, tbt: 0, longtasks: 0 };
  new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__m.lcp = e.startTime; window.__m.lcpEl = (e.element?.tagName || '') + ' ' + (e.url || '').slice(0, 80); } }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__m.longtasks++; window.__m.tbt += Math.max(0, e.duration - 50); } }).observe({ type: 'longtask', buffered: true });
};

async function run(url, mode) {
  const mobile = mode === 'mobile';
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }
    : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [], failed = [];
  let bytes = 0; const byType = {}; const thirdParty = new Set();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + String(e).slice(0, 200)));
  page.on('requestfailed', r => failed.push(r.url().slice(0, 150) + ' ' + r.failure()?.errorText));
  page.on('response', async r => {
    try {
      const s = (await r.request().sizes()).responseBodySize + (await r.request().sizes()).responseHeadersSize;
      bytes += s; const t = r.request().resourceType(); byType[t] = (byType[t] || 0) + s;
      const h = new URL(r.url()).hostname; if (!h.endsWith('olostep.com')) thirdParty.add(h);
      if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 150)}`);
    } catch {}
  });
  await page.addInitScript(initCWV);
  const t0 = Date.now();
  const resp = await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(e => null);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const res = { url, mode, status: resp?.status() ?? 0, loadMs: Date.now() - t0 };
  Object.assign(res, await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime;
    return { ...window.__m, fcp, ttfb: nav.responseStart, dcl: nav.domContentLoadedEventEnd,
      domNodes: document.getElementsByTagName('*').length,
      scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
      scripts: document.scripts.length, title: document.title };
  }).catch(e => ({ evalError: String(e) })));
  if (mobile) {
    res.overflowEls = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > window.innerWidth + 2 && getComputedStyle(e).position !== 'fixed'; })
      .slice(0, 6).map(e => `${e.tagName}.${String(e.className).slice(0, 50)} right=${Math.round(e.getBoundingClientRect().right)}`)).catch(() => []);
    res.smallTargets = await page.evaluate(() => [...document.querySelectorAll('a,button,[role=button]')].filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && (r.width < 24 || r.height < 24); }).length).catch(() => null);
  } else {
    // axe + rendered text (desktop only)
    await page.addScriptTag({ content: axeSrc }).catch(() => {});
    res.axe = await page.evaluate(async () => {
      const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'], resultTypes: ['violations'] });
      return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') }));
    }).catch(e => 'axe error ' + e);
    const text = await page.evaluate(() => document.body.innerText).catch(() => '');
    await fs.writeFile(`${OUT}/text/${slug(url)}.txt`, text);
    res.links = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map(a => a.href))]).catch(() => []);
    res.navLinks = await page.evaluate(() => [...document.querySelectorAll('header a[href], nav a[href]')].map(a => `${a.innerText.trim().replace(/\s+/g, ' ')} -> ${a.getAttribute('href')}`)).catch(() => []);
    res.footerLinks = await page.evaluate(() => [...document.querySelectorAll('footer a[href]')].map(a => `${a.innerText.trim().replace(/\s+/g, ' ')} -> ${a.getAttribute('href')}`)).catch(() => []);
  }
  res.bytesKB = Math.round(bytes / 1024); res.byTypeKB = Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024)]));
  res.thirdParty = [...thirdParty]; res.consoleErrors = consoleErrors.slice(0, 10); res.failed = failed.slice(0, 10);
  await page.screenshot({ path: `${OUT}/shots/${slug(url)}__${mode}_fold.png` }).catch(() => {});
  await page.screenshot({ path: `${OUT}/shots/${slug(url)}__${mode}_full.jpg`, fullPage: true, type: 'jpeg', quality: 55 }).catch(() => {});
  await ctx.close();
  return res;
}

const results = [];
const jobs = PAGES.flatMap(u => [[u, 'desktop'], [u, 'mobile']]);
async function worker() { while (jobs.length) { const [u, m] = jobs.shift(); try { results.push(await run(u, m)); console.log('ok', m, u); } catch (e) { console.log('ERR', m, u, String(e).slice(0, 120)); } } }
await Promise.all([1, 2, 3, 4].map(worker));
await browser.close();
await fs.writeFile(`${OUT}/pw.json`, JSON.stringify(results, null, 1));
