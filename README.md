# youthphase.dev

Personal site of Amy Lam. Built with [Astro](https://astro.build) and
[Tailwind CSS](https://tailwindcss.com).

The background reflects the current sky: [suncalc](https://github.com/mourner/suncalc)
computes the sun and moon position for your location (looked up from your IP via
ipapi.co, falling back to San Francisco), and the page tints itself accordingly —
deep midnight blue at night (brightened by a full moon), pink and peach at golden
hour, moody slate blue at midday. A soft glow tracks whichever body is up, and the
stars are real: the ~70 brightest stars, placed for your latitude, longitude, and
the time, hopping along on the quarter hour.

## Development

```sh
npm install
npm run dev      # dev server at localhost:4321
npm run build    # static build to dist/
```

Key files:

- `src/scripts/sky.ts` — sun/moon color logic
- `src/styles/global.css` — registered CSS properties that animate the sky
- `src/layouts/Layout.astro` — shared shell (glow element + sky script)
- `src/pages/index.astro` — homepage

## Blog

Posts are Markdown files in `src/content/blog/`. Two frontmatter shapes:

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

The site is fully static — suncalc computes sun/moon positions in the
browser, so there is no server-side work and the free tier is plenty:

1. Push this repo to GitHub
2. [vercel.com/new](https://vercel.com/new) → import the repo — Vercel
   auto-detects Astro; no configuration needed
3. Add `youthphase.dev` under Project → Settings → Domains

(Netlify and Cloudflare Pages work identically.) The only runtime request
is the IP geolocation lookup to ipapi.co, which is free up to 1,000
lookups/day; if traffic ever exceeds that, swap in the host's own geo
headers or fall back to San Francisco.

## About page

`/about` holds a short bio and a photo grid. Both are placeholders right
now: edit the prose in `src/pages/about.astro`, drop real photos into
`src/assets/about/`, and update the `photos` array (each entry needs an
`alt` describing the picture — the images are optimized by `astro:assets`
at build time).

## Later

- Replace the placeholder photos on /about
- Write the first real post(s) and delete the two examples
