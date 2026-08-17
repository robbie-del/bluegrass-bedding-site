# Bluegrass Bedding — Website Agent Rules

Shared instructions for AI coding agents (Claude Code, Codex, and others) working in
this repository. `CLAUDE.md` points at this file, so both tools read the same rules.

---

## What this repo is

`bluegrassbedding.com` — a **static, hand-written HTML site**. There is no framework,
no bundler, and no build step. Netlify publishes the repository root exactly as it is.

```
index.html               Thoroughbred racing landing page (also the segment gate)
show.html                Show & sport horses landing page
boarding.html            Boarding & training landing page
products.html            Product lineup
science.html             "Why It Matters" — dust/respiratory science
straw-vs-shavings.html   SEO page + interactive cost calculator
events.html              Events & gallery (rendered at runtime from JSON)
faq.html                 FAQ accordion
contact.html             Contact form
quote.html               Quote request form
assets/site.css          The entire stylesheet
assets/events.js         Events & gallery renderer (vanilla IIFE)
assets/events-data.json  Events/gallery content, edited through Pages CMS
assets/gallery/          Gallery images, uploaded through Pages CMS
.pages.yml               Pages CMS schema for the events page
```

Third-party CSS/JS (Bootstrap 5.3.3, Font Awesome 6.5.1, Google Fonts) loads from
CDNs via `<link>`/`<script src>`. **Do not add a bundler or vendor these locally**
without being asked — the no-build-step property is deliberate and keeps Netlify
deploys instant.

---

## Hard rules

### Tests are required for every change

**Any change to site behavior must ship with tests in the same pull request.**
This is not optional and applies to agents and humans equally.

- **New or changed JavaScript** (`assets/events.js`, any inline `<script>`) → add or
  update unit tests in `tests/unit/`.
- **New or changed page structure, navigation, forms, or interactive UI** → add or
  update an end-to-end test in `tests/e2e/`.
- **New page** → at minimum, add it to the navigation/smoke coverage in
  `tests/e2e/navigation.spec.js` and give it its own spec if it has behavior.
- **Bug fix** → add a test that fails before the fix and passes after it. Write the
  failing test first.
- **Content-only edits** (copy, prices, images, `events-data.json`) do not need new
  tests, but the existing suite must still pass.

If a change genuinely cannot be tested, say so explicitly in the PR description and
explain why. "It's a small change" is not a reason.

Before opening a PR, run the full suite locally:

```bash
npm run verify
```

### Never submit the real forms from a test

All three forms (`index.html` order modal, `contact.html`, `quote.html`) POST to
Formspree endpoint `https://formspree.io/f/mgoqkpoj`, which emails
`info@bluegrassbedding.com`. **E2E tests must intercept that request with
`page.route()` and fulfill it locally.** A test that submits for real sends spam to
the business inbox. The helper in `tests/e2e/helpers.js` does this — use it.

### Main is protected

`main` requires a pull request with passing status checks. Never commit or push
directly to `main`. Branch, push, open a PR, let CI go green.

---

## Working conventions

### HTML

- Every page is standalone and repeats its own top bar, audience banner, navbar, and
  footer. When you change navigation or the footer, **change it on all ten pages** —
  there is no template or include to edit. `tests/e2e/navigation.spec.js` enforces this.
- Keep `<html lang="en">`, the `charset`, and the `viewport` meta on every page.
- Every page needs a unique `<title>` and `<meta name="description">`.
- All `<img>` elements need meaningful `alt` text.
- Bootstrap 5 utility classes are the default styling tool; reach for `site.css` only
  when utilities can't express it.

### CSS

- One stylesheet: `assets/site.css`. Do not create additional CSS files.
- Brand colors are CSS custom properties on `:root` — use them, never hardcode hex:

  | Variable | Value | Use |
  |---|---|---|
  | `--navy` | `#0a1628` | Deep background |
  | `--green` | `#0C7479` | Primary brand green |
  | `--gold` | `#c9a84c` | Accents, CTAs, badges |
  | `--gold-light` | `#e8c97a` | Hover/highlight gold |
  | `--cream` | `#f5f0e8` | Page background |
  | `--dark` | `#111820` | Top bar, dark sections |
  | `--mid` | `#1e2d3d` | Mid-tone panels |

- Fonts: `Assistant` for headings, `Roboto` for body, `Playfair Display` for
  `.display-heading` only.
- The existing file leans on `!important` for the global type scale. Don't add new
  `!important` declarations unless you are overriding Bootstrap and there is no
  alternative.

### JavaScript

- **ES5-compatible vanilla JS, no dependencies.** `assets/events.js` is an IIFE using
  `var` and function declarations — match that style when editing it.
- Inline `<script>` blocks in pages may use modern syntax (`const`, `async/await`),
  matching what's already there.
- **Always escape user/CMS-supplied strings before inserting them into HTML.** Use the
  `esc()` helper in `events.js`. Everything in `events-data.json` is authored through
  Pages CMS and must be treated as untrusted.
- The bottom of `events.js` has a test-only export shim. It is inert in the browser.
  Keep it in sync when you add or rename a pure helper.

### Events & gallery content

- `assets/events-data.json` is **edited through the Pages CMS admin panel**
  (app.pagescms.org → `robbie-del/bluegrass-bedding-site`), which commits directly to
  `main`. Hand-edits to this file can be clobbered by a CMS save, and CMS saves have
  dropped entries before — see commit `15af534`.
- If you change the shape of `events-data.json`, you **must** update `.pages.yml` to
  match, or the CMS will silently drop the new fields on the next save.
- `events.js` sorts events into upcoming/past automatically from `date`/`endDate`.
  Never sort or move entries by hand.
- Dates are `YYYY-MM-DD` strings, parsed at **noon local time** to dodge timezone
  drift. Preserve that when touching date code.

### Business facts that appear on the site

Keep these consistent everywhere; they are asserted in tests:

- Phone: **502-650-1208** · Email: **info@bluegrassbedding.com** · Goshen, KY
- Positioning: HISA-aligned, full chain of custody, triple-screened, ultra low dust
- The `straw-vs-shavings.html` calculator constants: 30-day month, `$45` per 8 yd³
  dumpster haul, `75` muck tubs per haul. These drive public savings claims — if you
  change them, update `tests/unit/calculator.test.js` and be deliberate about it.

---

## Commands

```bash
npm install              # install dev dependencies
npm run dev              # serve the site at http://localhost:8742
npm test                 # unit tests (Vitest + jsdom)
npm run test:e2e         # end-to-end tests (Playwright)
npm run lint             # ESLint + Stylelint + HTMLHint
npm run lint:fix         # auto-fix what can be auto-fixed
npm run verify           # lint + unit + e2e — run this before every PR
```

`node_modules/`, `test-results/`, and `playwright-report/` are gitignored and are
never deployed — Netlify serves only the static files.

---

## Testing layout

```
tests/unit/    Vitest + jsdom. Pure helpers from events.js, plus inline page
               scripts exercised by loading the real HTML into jsdom.
tests/e2e/     Playwright. Real Chromium against the served site.
tests/fixtures/ Deterministic events-data.json used so tests don't break when
               real content changes.
```

- Unit tests must not hit the network.
- E2E tests must be deterministic: stub `assets/events-data.json` with the fixture
  rather than asserting against live CMS content, and never assert on embedded
  Facebook/Instagram/YouTube iframe internals — those are third-party and will flake.
- Assert on user-visible behavior and accessible roles/text, not on internal class
  names, wherever practical.

---

## CI

`.github/workflows/ci.yml` runs lint, unit tests, and E2E on every pull request to
`main`. All three must pass before merge. If CI fails, fix the code — do not disable
the check, add a lint ignore, or mark a test `.skip` to get green.
