# youthphase.dev

Personal site of Amy Lam. Built with [Astro](https://astro.build) and
[Tailwind CSS](https://tailwindcss.com), package-managed with
[pnpm](https://pnpm.io). This README exists to explain how the site
works, because the fun is in the details.

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
- `/design-system` — unlisted page showing the live shared patterns.
  [PRODUCT.md](PRODUCT.md) (voice, audience) and [DESIGN.md](DESIGN.md)
  (the visual system) are the written half.
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
```

`.github/workflows/ci.yml` runs the build, the contrast check, and the
Playwright suite on every push and pull request.

Key files:

- `src/scripts/sky.ts` — the whole sky engine
- `src/styles/global.css` — registered CSS properties that animate the sky
- `src/layouts/Layout.astro` — shared shell (glow element, sky controls, sky script)
- `api/geo.ts` — the geolocation endpoint (Vercel-only; absent in dev)

## Deploying (Vercel)

The site is a static Astro build plus that one serverless function —
Vercel picks up a root-level `api/` directory alongside any static
build, no adapter needed. Import the repo at
[vercel.com/new](https://vercel.com/new) (Astro is auto-detected) and
add the domain under Project → Settings → Domains. On other hosts
(Netlify, Cloudflare Pages) the static site works as-is, but `/api/geo`
would need porting to that host's functions and geo headers — until
then every visitor just gets the borrowed sky.
