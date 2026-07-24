# youthphase.dev

![Lighthouse Performance](https://img.shields.io/badge/Lighthouse%20Performance-100-brightgreen)
![Lighthouse Accessibility](https://img.shields.io/badge/Lighthouse%20Accessibility-100-brightgreen)
![Lighthouse Best Practices](https://img.shields.io/badge/Lighthouse%20Best%20Practices-100-brightgreen)
![Lighthouse SEO](https://img.shields.io/badge/Lighthouse%20SEO-100-brightgreen)

Personal site of Amy Lam. Built with [Astro](https://astro.build) and
[Tailwind CSS](https://tailwindcss.com), package-managed with
[pnpm](https://pnpm.io), linted with Prettier/ESLint/Stylelint. This
README exists to explain how the site works, because the fun is in
the details.

## The sky

The background is your actual sky, computed in the browser:

- **Location** comes from a same-origin call to `/api/geo`
  ([api/geo.ts](api/geo.ts)), a tiny Vercel serverless function that
  echoes the geolocation headers Vercel attaches to every request
  (`x-vercel-ip-latitude`, `-longitude`, `-city`). No third-party
  lookup, no rate limits. If it fails (or you're running `astro dev`,
  which doesn't serve the function), the site shows San Francisco's sky
  and the status line says "borrowed sky" instead of "your sky" —
  honest about whose sky you're looking at.
- **Sun and moon positions** come from
  [suncalc](https://github.com/mourner/suncalc), computed for your
  coordinates. The palette is keyed to sun altitude: deep midnight blue
  at night (brightened by a full moon), pink and peach at golden hour,
  moody slate blue at midday. A soft glow tracks whichever body is up.
  The gradient lives in registered CSS custom properties
  (`@property --sky-top` / `--sky-bottom` in
  [global.css](src/styles/global.css)), which is what lets plain CSS
  transitions animate the colors smoothly.
- **Text color is proven, not eyeballed.** For every sky,
  [sky.ts](src/scripts/sky.ts) computes WCAG contrast for candidate
  inks against the whole band of gradient the text sits on and picks
  one that clears the bar — WCAG AAA (7:1) on the chip surfaces where
  small text lives, 4.5:1 for the large center ink; around sunset, when
  no single ink can cover the band, a scrim closes the gap.
  `pnpm check:contrast` verifies the system across the full range of
  skies, and even the contact form's coral error text keeps the ink's
  computed lightness so it stays AAA under any sky.
- **The stars are real**: the ~70 brightest stars, placed for your
  latitude, longitude, and the time. Sun, moon, and stars advance in
  quarter-hour hops — a slow sundial tick rather than imperceptible
  drift. Shooting stars visit occasionally at night.
- **Every tap sparkles.** Tap or click anywhere on the open sky (not on
  links, buttons, or cards) and a small ✦ lands where you touched —
  desktop and mobile both, every tap, no counting required.
- **There's a secret show.** Three quick taps anywhere on the home
  page's sky (touch only) play whatever fits the moment: the moon's
  month of phases in eight seconds when it's up (its terminator is
  phase-accurate), a sudden shower and a rainbow by day, a scatter of
  shooting stars on a moonless night. Everything respects
  `prefers-reduced-motion`.
- **Controls**: the `▶︎ 24h` chip plays the whole day as a time-lapse;
  the `sky:` chip pins day or night (persisted in localStorage) for
  anyone who'd rather not read on a sunset. In the dev console,
  `__skyAt('2026-07-16T20:30')` previews any moment.

The page paints immediately with the fallback sky, then refines once
the geo lookup resolves, and re-renders every minute.

## The rest

- `/about` — bio and a polaroid photo grid with a lightbox
  ([lightbox.ts](src/scripts/lightbox.ts)); videos autoplay muted when
  swiped to.
- The 404 page follows the sky too: lost pages drift into whatever the
  sky is doing right now.
- `/design-system` — unlisted page showing the live shared patterns:
  color, radius, and spacing tokens, the type scale, elevation, and
  do's/don'ts, alongside the components. The fixed tokens themselves
  live in an `@theme` block in [global.css](src/styles/global.css) —
  usable as Tailwind utilities (`rounded-card`, `bg-polaroid-ivory`) or
  as `var(--color-polaroid-ivory)` in plain CSS.
  [PRODUCT.md](PRODUCT.md) (voice, audience) and [DESIGN.md](DESIGN.md)
  (the visual system) are the written half.
- Page views are tracked with [Vercel Web Analytics](https://vercel.com/docs/analytics),
  enabled via the `@astrojs/vercel` adapter — no cookies, no third-party
  script.
- Design work happens in [Claude Code](https://claude.com/claude-code)
  with the Impeccable plugin (its commands read PRODUCT.md and DESIGN.md
  as context), with the Mobbin MCP on hand for interaction reference.

## Development

```sh
pnpm install
pnpm dev                 # dev server at localhost:4321
pnpm build               # static build to dist/
pnpm check:contrast      # verify ink contrast across all skies
pnpm test                # Playwright (a11y, lightbox)
pnpm format              # Prettier, writes
pnpm format:check        # Prettier, checks only (what CI runs)
pnpm lint                # ESLint — JS/TS, Astro, jsx-a11y
pnpm lint:css            # Stylelint — global.css and .astro <style> blocks
```

Key files:

- `src/scripts/sky.ts` — the whole sky engine
- `src/styles/global.css` — registered CSS properties that animate the sky
- `src/layouts/Layout.astro` — shared shell (glow element, sky controls, sky script)
- `api/geo.ts` — the geolocation endpoint (Vercel-only; absent in dev)

## Testing

`pnpm test` runs the Playwright suite in `tests/`:

- **Accessibility**: [`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm)
  scans every page (plus the lightbox in its open state) for violations.
  Axe can't judge contrast against the animated sky gradient — that's
  what `check:contrast` is for — so a few guarantees axe doesn't cover
  get their own assertions: small controls (icon links, lightbox
  buttons) still expose a 44×44px hit area, the lightbox never hands
  keyboard focus to the page behind it, and `prefers-reduced-motion`
  actually disables the star twinkle animation.
- **Regression tests** for the lightbox (arrow-key focus, long captions
  wrapping instead of stretching the polaroid) and the contact form
  (inline validation, error states).
- **Link hygiene**: every external link on every page opens in a new
  tab with the `rel` that makes `target="_blank"` safe.

`check:contrast` is a separate script (not Playwright) that sweeps
every sun altitude and fails if any ink/background pairing drops below
WCAG AAA — see [the sky section](#the-sky) above.

[Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) runs
against every page in the built `dist/` output and fails the build if
Performance drops below 90, Best Practices drops below 95, or
Accessibility or SEO drop below 100 — thresholds set in
[lighthouserc.json](lighthouserc.json). Performance gets a lower floor
because build-to-build timing variance on CI runners is real; Best
Practices gets one because testing the static `dist/` directly (rather
than a deployed Vercel environment) makes `/api/geo` and the Vercel
Analytics script 404, which they don't in production. The badges above
reflect an actual production run, which hits neither issue.

The same Playwright run also feeds [Chromatic](https://www.chromatic.com)
visual regression testing via
[`@chromatic-com/playwright`](https://www.chromatic.com/docs/playwright/) —
CI publishes a snapshot of every page after each test, so a UI change
shows an actual visual diff on the PR instead of only a pass/fail.
Needs a `CHROMATIC_PROJECT_TOKEN` repo secret from a Chromatic project
to actually publish.

## Linting

- **Prettier** (`prettier-plugin-astro` for `.astro` files) — `singleQuote`,
  `printWidth: 100`. `.claude/` and `.impeccable/` are excluded; they're
  tool-internal config/output, not site source.
- **ESLint** (flat config) — `@eslint/js` + `typescript-eslint` recommended,
  plus `eslint-plugin-astro`'s recommended and `jsx-a11y-recommended`
  configs, so a chunk of accessibility checking happens statically
  alongside the axe-core runtime checks above. `eslint-plugin-better-tailwindcss`
  adds Tailwind-specific correctness checks — unknown/typo'd classes,
  conflicting utilities, canonical simplifications (`h-7 w-7` →
  `size-7`) — scoped to `.astro` `class="..."` attributes; this
  project's own custom classes (`sky-*`, `lightbox-*`, ...) are
  allowlisted rather than flagged as unknown. Ordering/line-wrapping
  are left off — that's Prettier's job, not this plugin's opinion.
- **Stylelint** (`stylelint-config-standard` + `stylelint-config-tailwindcss`)
  — covers `global.css` and every `.astro` file's `<style>` block
  (via `postcss-html`). `:global(...)` (Astro's scoped-style escape
  hatch) and `--modifier`-suffixed BEM class names are allowlisted;
  everything else is standard modern CSS.

[GitHub Actions](https://github.com/features/actions)
(`.github/workflows/ci.yml`) runs the build, `check:contrast`, the full
Playwright suite, Lighthouse CI, and all three linters on every push to
`main` and on every pull request.

## Blog

`/blog` is live but unlisted — nothing on the site links to it yet, same
as `/design-system`. Posts are Markdown files in `src/content/blog/`. Two
frontmatter shapes:

```yaml
# original writing
title: string
description: string (optional)
publishDate: date
draft: boolean (optional, defaults to false)
```

```yaml
# a repost — mirrors an article published elsewhere so the link never
# rots. The post page automatically shows an "originally posted on
# {source}" callout linking back to the source.
title: string
description: string (optional)
publishDate: date
draft: boolean (optional)
original:
  url: string
  source: string
```

`src/content/blog/example-post.md` and `example-repost.md` demonstrate both
shapes — delete them once real posts replace them. `/blog` lists all
non-draft posts newest-first; `/blog/[slug]` renders one. Both reuse the
same computed-contrast system as the rest of the site (`.sky-card`), so
long-form text stays AAA-compliant at any sun position, not just the
homepage's centered hero.

## Deploying (Vercel)

The site is a static Astro build plus that one serverless function,
built with the `@astrojs/vercel` adapter (in `output: 'static'` mode).
Vercel still picks up the root-level `api/` directory as its own
serverless function alongside the static build, independent of the
adapter. Import the repo at [vercel.com/new](https://vercel.com/new)
(Astro is auto-detected) and add the domain under Project → Settings
→ Domains. On other hosts (Netlify, Cloudflare Pages) the static site
works as-is, but `/api/geo` would need porting to that host's functions
and geo headers, and analytics would need a different provider — until
then every visitor just gets the borrowed sky.
