# olostep.com: website review

Audit run 2026-10-19. What I did:
- **Fetched every page with curl:** all 853 URLs (849 from the sitemaps plus the test URLs I added) for status, redirects, headers and metadata.
- **Rendered 42 key pages in Playwright** (Chromium), desktop 1440px and mobile 390px, with screenshots, page weight, lab LCP/CLS/TBT and axe-core WCAG 2 A/AA checks.
- **Checked 688 links** found on those pages.
- **Signed-out playground test:** ran one real scrape.

Raw data: `pw-metrics.json`. Scripts: `tools/`. Evidence: `shots/`.

> Speed caveat: the speed numbers come from one unthrottled run on a datacenter Chromium. Use them to compare pages, not as real-user Core Web Vitals. For field data, use PageSpeed Insights or the Chrome UX Report.

---

## 1. Suspected issues: verified or refuted

| # | Suspicion | Verdict | Evidence |
|---|---|---|---|
| 1 | `/about` vs `/blog/about-olostep` duplicate | **Confirmed (two competing pages, not a copy).** | Both return 200, both canonicalize to themselves, and both are titled "About Olostep". The text is different: `/about` is the "web has a second user now" letter, the blog post is a May 2026 founder essay. The home-page banner ("read more") links to the **blog** version. The pages compete for the same query, and the blog post carries outdated product claims (see #5). |
| 2 | `/api-endpoints` vs `/endpoints` | **Refuted.** | `/endpoints` returns **301 → /api-endpoints**, and only `/api-endpoints` is in the sitemap. |
| 3 | `/use-cases/ai-platforms` vs `/use-cases/power-ai-platforms` | **Refuted.** | **301 → /use-cases/power-ai-platforms**. |
| 4 | Pricing mixes "requests" and "credits" | **Confirmed, and it goes beyond wording.** | `/pricing`: plans are sold in "successful requests" and top-ups in "credits", and the FAQ on the same page says the $9 plan "include[s] 5,000 credits". Elsewhere, Answers "costs 20 credits per request" (`/api-endpoints/answers`) and Search "5 credits per request". `/scrapers/*` says "One request equals one webpage". The docs billing API (`/user/credits/info`) is credits-only. So a "500 request" trial covers **25 Answers calls**, and the pricing page never says so. |
| 5 | "Yearly (coming soon)" toggle | **Refuted (not live today).** | No "yearly", "annual" or "coming soon" text in the rendered `/pricing` page or its raw HTML (`shots/olostep_com_pricing__desktop_full.jpg`). Likely already removed. |
| 6 | About post says Orbit launches in 2027 vs `/orbit` live | **Confirmed, with nuance.** | `/blog/about-olostep` (dated May 4, 2026): "Olostep Orbit is the right solution. **We are going to launch it in 2027.**" `/orbit` says "**Coming soon**" on its install buttons (disabled), but the copy is present tense ("Ready to ship", "Port it in 5 minutes"). Meanwhile **`/orbit/webstore` is public, in the sitemap, and renders empty**, because its API calls to `api.olostep.com/v1/api/extensions` are blocked by CORS (9 console errors, CLS 0.57–0.66). That gives three different launch messages. |
| 7 | Inconsistent trial and concurrency numbers | **Confirmed. Several conflicts, all on Olostep's own pages.** | See the table below. |

### Conflicting numbers (Olostep's own claims only; competitor numbers in blog posts excluded)

| Fact | Values found | Where |
|---|---|---|
| Free allowance | 500 requests · 500 credits · **1,000 free API calls** | `/pricing` & 17 pages · `/integrations/*`, `/api-endpoints/answers` · CTA at bottom of `/scrapers/bing-search` (same page says "500 successful scrapes" in its plan table) |
| Starter concurrency | **150** · **500** · **100** | `/pricing` · `/scrapers/*` plan table and the Firecrawl-vs-Olostep post ("500 concurrent on all paid plans") · `/frequently-asked-questions` |
| Standard concurrency | **500** · **5,000** | `/pricing` · `/scrapers/*` plan table |
| Scale concurrency | not stated · 5,000+ · "up to 5,000" | `/pricing` · `/scrapers/*` · blog |
| Free-tier rate limit | "Low rate limits" · "10 requests per minute" | `/pricing` · FAQ |
| Batch capability | "100k URLs in 5–7 min" · "10k URLs in one batch, 5–8 min" | both on the home page; llms.txt says 100,000 |
| Reliability | "99% reliability" · "99.5% uptime" | llms.txt · `/scrapers/*` FAQ |
| Plan naming | "Trial" card, but Starter says "Everything in **Free**, plus" | `/pricing` |

---

## 2. User and non-technical view

**What works**
- **Clear hero:** "Web Data Infrastructure for AI" with an interactive Scrape/Crawl/Map/Search/Answer selector right in the hero.
- **The playground runs a real scrape with no signup:** example.com came back in 1.19s with Markdown/JSON output, Copy/Download and run history (`shots/playground_after_click.png`). This is the best onboarding asset on the site.
- **Simple signup:** email, Google or GitHub (`/auth`).
- **Visible social proof:** a customer logo strip on most pages, plus a /customers page.

**What to improve**
1. **Pricing isn't decision-ready.** The unit problem above means a buyer can't estimate their bill. There's no per-endpoint cost table, and no concurrency figure for Scale, the top plan. "Most cost-effective web data API on the market" is asserted with no comparison. "COST/1K" sits above the plan name, so it reads like a label for the previous card. The 10k-credit top-up ($2.00/1K) costs more than Starter ($1.80/1K) and nothing says so.
2. **Contradictions erode trust.** A developer comparing tabs sees 150, 500 and 100 concurrency and 500 vs 1,000 free calls. For an infrastructure API, inconsistent numbers suggest inconsistent operations.
3. **Too many overlapping pages for one product.** Bing search alone has `/apis/bing-search-api`, `/scrapers/bing-search` and `/store/bing-search`. Each has a different title and a different pricing presentation, and none canonicalizes to another. Users (and Google) can't tell which is the real product page.
4. **Orbit messaging.** "Coming soon" buttons sit next to "Ready to ship" copy, and the webstore is empty. Either hide the store behind a waitlist or mark the whole section as a preview.
5. **The playground's empty state.** On a cold visit the page is a lone input with a large empty area (`shots/olostep_com_playground__*`). Pre-filling a sample URL or showing an example response would let visitors see value without having to think of a URL.
6. **Dead-end 404.** It's the bare Next.js default: "404 | This page could not be found." No nav, no search, no link home or to docs (`shots/olostep_com_this_page_does_not_exist_xyz__*`). Common guesses such as `/login`, `/signup`, `/api` and `/about-us` all land there, while the real routes are `/auth` and `/api-endpoints`.

---

## 3. Technical view

### Crawlability and SEO
- **robots.txt:** good. It explicitly allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…), blocks parameter noise (`?_rsc=`, `?ref=`…), declares the sitemap, and adds a non-standard `LLM-policy:` line.
- **Sitemap:** a sitemap index with 16 child sitemaps and 849 URLs, all returning 200, no redirects inside. The German sitemap has 113 URLs, the Italian one 139. German is missing all `/scrapers/*`, `/store/*` and several tools.
- **llms.txt:** present (17 KB), well structured. **`/llms-full.txt` returns 404**, and on docs.olostep.com there's a working `llms.txt` with an index of `.md` pages.
- **Titles, descriptions, canonicals:** all 846 pages have a title and description, and every canonical self-references its final URL. No noindex accidents.
- **Duplicate and cannibalizing content:**
  - Two identical glossary pages: `/glossary/web-extraction-apis/what-is-web-scraping-api` and `/glossary/web-scraping-apis/what-is-web-scraping-api` (same title, H1 and description, both self-canonical).
  - The `/apis/*` ↔ `/scrapers/*` ↔ `/store/*` triplets.
  - `/about` ↔ `/blog/about-olostep`.
- **Localization:** hreflang is correct (en/de/it + x-default, reciprocal). However, **19 `/de/apis/*` pages have English `<title>` and meta descriptions over German body copy**. Italian has 0 such pages.
- **Open Graph and structured data:**
  - **415 of 846 pages have no `og:image`.** These include `/ai-*` tools, `/affiliate`, `/agent-integration` and many blog posts, so shared links show no preview card.
  - All 128 glossary pages lack `og:title` and `twitter:card`.
  - JSON-LD is broad: Organization, WebSite, SoftwareApplication, FAQPage, BlogPosting, BreadcrumbList. None is invalid, but 227 pages have no JSON-LD at all (careers, legal, some tools).
- **Headings:** 13 pages have no H1, including `/playground`, `/ai-instructions` and `/de/orbit/webstore`. 24 pages have more than one H1 (several glossary and IT scraper pages).

### Two stacks, two security and caching postures
The site runs a **Webflow** layer (89 pages: home, pricing, about, use-cases, glossary index, api-endpoints, and the DE/IT copies of those) and a **Next.js** layer (757 pages: blog, glossary entries, store, scrapers, apis, orbit, playground, 404), both behind CloudFront.

| | Webflow pages | Next.js pages |
|---|---|---|
| HSTS / CSP / X-Frame-Options / nosniff | **none** | present |
| Cache-Control | `max-age=5, stale-while-revalidate` | `private, no-cache, no-store` |
| Mean TTFB (curl, 846 pages) | 0.32s | **0.59s** |

- **The highest-value pages (home, pricing) send no security headers.** There's no clickjacking protection, for example.
- **The Next.js CSP is weak:** `'unsafe-inline' 'unsafe-eval'`, any `https:` script source, and **`connect-src … http://localhost:* ws://localhost:*`**, which is a dev leftover in production. It also sends `X-Powered-By: Next.js`.
- **The CDN can't cache the Next.js pages:** `no-store` on static marketing pages and blog posts means every hit goes to origin, which roughly doubles TTFB.
- `olostep.com` → 301 → `www`, correct. Trailing slashes 308 to the slash-less URL.
- The `/privacy-policy/` link in the footer causes an extra 308 on every page.

### Performance (lab, unthrottled; use for relative comparison)
| Page | Transfer | Lab LCP | TBT | Notes |
|---|---|---|---|---|
| `/` | **4.4 MB** (3.4 MB images) | 1.8s | **~950 ms** | 6 cloud background **PNGs, 286–645 KB each** (3.3 MB). One variant is already AVIF at 82 KB, so converting the rest saves about 3 MB. Loads jQuery and Webflow JS from 8 third-party hosts. `ReferenceError: ScrollTrigger is not defined`. |
| `/about` | 4.1 MB | 2.2s | ~900 ms | Same PNGs. Two JS errors (`slidesToShow` of undefined, `addEventListener` of null). |
| `/scrapers/bing-search` | 1.5 MB | 1.5s | **~4,000 ms** | Heaviest main-thread work found. Two 404 assets (`/images/olostep_logo.png`, `GumLoop-_-Logo-_-Long.svg`). Hotlinks `randomuser.me` and Unsplash. |
| `/orbit/webstore` | 0.7 MB | 1.4s | low | **CLS 0.57 (desktop) / 0.66 (mobile)**, which fails the 0.1 target, plus CORS failures. |
| `/pricing` | 1.3 MB | 1.0s | ~770 ms | |
| `/blog` (HTML alone) | 922 KB of HTML | | | The largest blog-post HTML is 852 KB; serialized RSC payload is probably duplicating the content. |

Everything else sits at 0.7–2 MB with lab LCP under 2s.

### Accessibility (axe-core, WCAG 2 A/AA, 40 pages)
- **color-contrast** (serious): 350 nodes on all 40 pages. The light-grey body and sub-copy is the main source.
- **frame-title** (serious): an untitled `<iframe>` on 38 pages, probably a chat or analytics widget.
- **link-in-text-block** (serious): links on 38 pages are distinguishable only by color.
- **link-name** (serious): 18 nodes. Logo links (`.nav-logo_link`) have no accessible name.
- One-offs:
  - critical: `select` with no label
  - critical: `button` with no name (Radix trigger)
  - critical: invalid `aria-*` value on the hero tabs
  - serious: focusable elements inside the `aria-hidden` logo ticker
- **Mobile:** no horizontal overflow on any of the 42 pages. About 40 tap targets per page are under 24×24 px (WCAG 2.2 AA 2.5.8), mostly footer and nav links.

### Broken links (688 checked)
- `/glossary` index → `/glossary/web-extraction-apis/difference-between-web-crawling-and-web-scraping` → **404**.
- `/scrapers/bing-search` renders sample SERP breadcrumbs as real links (`https://www.reuters.com › technology`) that resolve to invalid IDN hosts.
- `/blog/about-olostep` links to `http://www.olostep.com/`, which is not HTTPS.
- The Slack invite link returned 403 to a script. **Check it manually**, since stale Slack invites are a common silent failure.
- (GitHub links returned 403 because of this environment's proxy, so they weren't counted.)

---

## 4. Top 3 priorities (interview framing)

### 1. Make pricing a single source of truth, in one unit
**Why first:** pricing is where intent turns into revenue, and it's where the contradictions are concentrated:
- requests vs credits, with no per-endpoint multiplier shown
- three different Starter concurrency numbers
- 500 vs 1,000 free calls

**Fix:**
- Pick one unit (credits, since that's what billing and the API use).
- Add a per-endpoint credit table (Scrape 1 · Search 5 · Answers 20 · LLM extract 20).
- Render every plan card, FAQ answer and `/scrapers/*` table from one config shared by Webflow and Next.js.
- Add concurrency to Scale.

**Measure:**
- Pricing → signup conversion and pricing → "Purchase" click-through, before vs after.
- Share of support or sales tickets tagged billing or credits confusion.
- Week-1 "credits exhausted" surprise rate (users who hit zero credits sooner than the request count implied).
- Guardrail: a CI check that greps the build for plan numbers that don't come from the config (should be zero).

### 2. Consolidate overlapping pages and close the SEO hygiene gaps
**Why:** the site splits ranking signals across near-duplicates, and the leftovers make it look stale. Examples:
- the `/apis` + `/scrapers` + `/store` triplets
- two "About Olostep" pages
- two identical glossary entries
- English titles on German pages
- 415 pages without OG images

**Fix:**
- 301 or canonicalize each triplet to one product page per data source.
- Make `/about` canonical. Update or retire the blog post, including the "launch in 2027" line.
- Merge the glossary duplicate and fix the 404 link.
- Translate the 19 German meta tags.
- Default `og:image` and `twitter:card` in both layouts.
- Add `/llms-full.txt` or drop the reference to it.

**Measure:**
- Search Console: indexed-page count, "Duplicate without user-selected canonical" count → 0, impressions and clicks for the consolidated pages, and average position for "bing search api", "web scraping api" and similar queries.
- Count of pages missing `og:image` → 0 in a weekly crawl, using this repo's script.
- Click-through rate on social and Slack shares.

### 3. Close the gap between the two stacks: home-page performance, security headers and error states
**Why:**
- The home page is the heaviest page on the site: 4.4 MB, mostly PNG textures, about 1 s of main-thread blocking, and a JS error on load.
- The highest-traffic pages send no security headers.
- The Next.js pages are uncacheable (`no-store`), which doubles TTFB.
- The 404 and the empty Orbit webstore are dead ends.

**Fix:**
- Convert the cloud PNGs to AVIF/WebP with `srcset`.
- Defer GSAP, jQuery and Webflow scripts, and fix the `ScrollTrigger` error.
- Set HSTS, CSP, XFO and nosniff at CloudFront for all paths, and remove `localhost` from `connect-src`.
- Cache static Next.js routes with `s-maxage` + SWR.
- Build a branded 404 with search and links to Docs, Playground and Pricing.
- Fix the CORS on `/v1/api/extensions`, or hide the webstore until launch.

**Measure:**
- Core Web Vitals (p75 LCP, INP, CLS) from Chrome UX Report / Search Console for the home and pricing pages.
- Home page weight under 1.5 MB, enforced as a Lighthouse CI budget in the deploy pipeline.
- TTFB p75 on blog pages, and CloudFront cache-hit ratio.
- securityheaders.com grade (F → A) on `/` and `/pricing`.
- 404 exit rate, and click-through from the 404 page, in PostHog.
- JS error rate per page view in PostHog or Sentry.

---

### 30-second version for the interview
> The product story is strong, and the playground runs a real scrape without signup in about a second. That's the best thing on the site. The biggest problem is trust in the numbers: pricing sells "requests" while billing uses credits, Answers costs 20 credits, and I found three different concurrency figures for the same plan. I'd fix that first and measure it on pricing-to-signup conversion and billing tickets. Second, the site runs on two stacks with different SEO, security and caching postures, which has left overlapping pages, missing OG images, and no security headers on home and pricing. Third, the home page is 4.4 MB, mostly PNG background textures that would be about 400 KB as AVIF. I'd track field Core Web Vitals and enforce a page-weight budget in CI.
