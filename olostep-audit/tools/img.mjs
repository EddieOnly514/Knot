import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const out=[]; p.on('response', async r => { if (r.request().resourceType()==='image') { try { const s=(await r.request().sizes()).responseBodySize; out.push([s, r.headers()['content-type'], r.url().slice(-70)]); } catch {} } });
await p.goto('https://www.olostep.com/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
out.sort((a,b)=>b[0]-a[0]); console.log(out.length, 'images'); for (const o of out.slice(0,8)) console.log(Math.round(o[0]/1024)+'KB', o[1], o[2]);
const types={}; for (const o of out) types[o[1]]=(types[o[1]]||0)+o[0]; console.log(Object.fromEntries(Object.entries(types).map(([k,v])=>[k,Math.round(v/1024)+'KB'])));
await b.close();
