# youthphase.dev

Personal site of Amy Lam. Built with [Astro](https://astro.build) and
[Tailwind CSS](https://tailwindcss.com).

The background reflects the current sky: [suncalc](https://github.com/mourner/suncalc)
computes the sun and moon position for your location (looked up from your IP via
ipapi.co, falling back to San Francisco), and the page tints itself accordingly —
deep indigo at night (brightened by a full moon), pink and peach at golden hour,
blue at midday. A soft glow tracks whichever body is up.

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

## Later

- Pick a font: compare candidates at `/fonts`, then delete that page
- Short bio on the homepage
- Blog: link reposts first, original posts after (Astro content collections)
