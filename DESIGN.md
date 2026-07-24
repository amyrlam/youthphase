---
name: youthphase.dev
description: Amy Lam's personal site — a living sky with real stars, and a life in polaroids
colors:
  sky-top-midnight: 'oklch(19.04% 0.064 271.04)'
  sky-bottom-midnight: 'oklch(31.28% 0.094 269.05)'
  ink-default: 'oklch(95.52% 0.0176 296.63)'
  chip-bg-fallback: 'oklch(23.43% 0.067 272.85)'
  polaroid-ivory: 'oklch(96.75% 0.0098 87.47)'
  polaroid-ink: 'oklch(27.09% 0.0123 78.08)'
  moonlight: 'oklch(97.62% 0.0111 269.55)'
  moonlight-low: 'oklch(95.47% 0.0445 82.61)'
  starlight: 'oklch(96.73% 0.0153 269.99)'
  backdrop-night: 'oklch(12.42% 0.0152 274.63)'
typography:
  display:
    fontFamily: 'Space Grotesk Variable, system-ui, sans-serif'
    # Stepped (text-6xl -> sm:text-8xl), not the fluid --text-display
    # clamp defined in global.css's @theme -- the hero jump at the sm
    # breakpoint reads better here than a continuous vw-scaled size.
    fontSize: '3.75rem, sm: 6rem'
    fontWeight: 500
    letterSpacing: '-0.025em'
  headline:
    fontFamily: 'Space Grotesk Variable, system-ui, sans-serif'
    fontSize: '2.25rem'
    fontWeight: 500
    letterSpacing: '-0.025em'
  title:
    fontFamily: 'Space Grotesk Variable, system-ui, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 500
  body:
    fontFamily: 'Space Grotesk Variable, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: 'Space Grotesk Variable, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 400
    letterSpacing: '0.1em'
rounded:
  polaroid: '0.25rem'
  card: '1rem'
  pill: '9999px'
spacing:
  card-pad: '1.5rem'
  page-gutter: '1.5rem'
  section-gap: '2rem'
components:
  chip-sky:
    backgroundColor: '{colors.chip-bg-fallback}'
    textColor: '{colors.ink-default}'
    rounded: '{rounded.pill}'
    padding: '0.375rem 0.75rem'
  card-sky:
    backgroundColor: '{colors.chip-bg-fallback}'
    textColor: '{colors.ink-default}'
    rounded: '{rounded.card}'
    padding: '1.5rem 1.5rem'
  card-polaroid:
    backgroundColor: '{colors.polaroid-ivory}'
    textColor: '{colors.polaroid-ink}'
    rounded: '{rounded.polaroid}'
    padding: '1rem 1rem 1.25rem'
---

# Design System: youthphase.dev

## 1. Overview

**Creative North Star: "The Living Sky"**

Nothing on this site is a theme; it is weather. The background is the visitor's actual sky — sun and moon positions computed for their location, the ~70 brightest stars placed for their latitude and the hour — and every color the interface wears is derived from that sky at runtime. Colors are never picked, they are _computed_, with accessibility as a hard constraint: ink is chosen per frame for ≥4.5:1, chip surfaces for ≥7:1, and `pnpm check:contrast` sweeps every sun altitude and fails the build if any pairing drops below AAA. The system's aliveness is engineered, not decorated.

Under that sky sits a warm, lowercase, human voice: squiggle-underlined links, polaroid photo cards, jumbomoji captions, tap sparkles, a moon with a face if you know where to press. Interactive elements are **quietly eager** — small and unassuming at rest, but everything lifts 2px to meet your cursor. The system explicitly rejects the dev-portfolio template, corporate/LinkedIn energy, AI-slop scaffolding (cream backgrounds, eyebrow kickers, gradient text, card grids), and the over-animated showreel. Warmth and personhood over professional polish.

**Key Characteristics:**

- Sky-computed palette with build-enforced AAA contrast; fixed colors are rare, named exceptions
- One typeface (Space Grotesk), two registers: lowercase chrome, sentence-case prose
- Depth from light (glows, halos, the horizon gradient), not shadow
- Motion at two speeds: weather (1.6–2s) and feedback (0.3s)
- Delight hidden in plain sight: shooting stars, sparkles, the moon's face

## 2. Colors: The Sky Is the Palette

The palette is an engine, not a swatch list — `src/scripts/sky.ts` computes every surface and ink from the live sun/moon position; the frontmatter values are defaults and fixed accents only. Those fixed accents are wired into code as real design tokens, in the `@theme` block at the top of `src/styles/global.css` (`--color-polaroid-ivory`, `--color-moonlight`, etc.) — usable as Tailwind utilities (`bg-polaroid-ivory`) or as `var(--color-polaroid-ivory)` in plain CSS, one source of truth instead of hex literals copied per component.

### Primary

- **The Sky Gradient** (`--sky-top` / `--sky-bottom`, defaults oklch(19.04% 0.064 271.04) / oklch(31.28% 0.094 269.05)): the page background, deep midnight blue at night through pink and peach at golden hour to moody slate at midday. Never hardcode a color that's meant to track the sky; use the variables.
- **Computed Ink** (`--ink`, default oklch(95.52% 0.0176 296.63)): all body text, chosen per frame for ≥4.5:1 against the mid-gradient band.
- **The Chip Surface** (`--card-bg` / `--chip-ink`, fallback oklch(23.43% 0.067 272.85)): the guaranteed-7:1 background used by `.sky-chip`, `.sky-card`, `.sky-caption`, and the horizon band.

### Secondary

- **Polaroid Ivory** (oklch(96.75% 0.0098 87.47)) with **Polaroid Ink** (oklch(27.09% 0.0123 78.08)): the one deliberately sky-independent surface — the expanded photo card in the lightbox, warm like a real print.

### Neutral

- **Moonlight** (oklch(97.62% 0.0111 269.55), warming to oklch(95.47% 0.0445 82.61) when the moon rides low): the moon's core and halo family.
- **Starlight** (oklch(96.73% 0.0153 269.99)): stars, shooting stars.
- **Night Backdrop** (rgba(5, 6, 12, 0.82) over the page): the lightbox dimming layer.

### Named Rules

**The No-Hardcode Rule.** Any color that should track the sky comes from the custom properties (`--sky-top`, `--sky-bottom`, `--ink`, `--card-bg`, `--chip-ink`, `--top-ink`). A fixed hex on sky-tracking content is a bug, and `check:contrast` exists to catch the consequences.

**The One Warm Exception Rule.** Polaroid Ivory is the only surface allowed to ignore the sky. Everything else participates in the weather.

## 3. Typography

**Display Font:** Space Grotesk Variable (with system-ui, sans-serif)
**Body Font:** Space Grotesk Variable — one family, multiple registers

**Character:** A single geometric-grotesque family carrying two voices: lowercase, wide-tracked chrome that reads as handwriting on a nametag, and normal sentence-case prose that reads comfortably.

### Hierarchy

- **Display** (500, text-6xl → sm:text-8xl ≈ 3.75–6rem, tracking-tight): the homepage name. Lowercase.
- **Headline** (500, text-4xl → sm:text-5xl, tracking-tight): page titles ("about"). Lowercase.
- **Title** (500, text-xl, lowercase): section headings within cards.
- **Body** (400, text-sm–base, sentence case): bio paragraphs, prose. Prose tracks `--ink` via the retheme of Tailwind Typography.
- **Label** (400, text-xs–sm, tracking-widest, lowercase): bylines, chips, captions, nav links.

### Named Rules

**The Two Registers Rule.** UI chrome (nav, buttons, captions, headings) is lowercase by design; body prose uses normal sentence case for readability. Don't lowercase prose to force consistency with the chrome — they're different registers on purpose.

Headline, title, body, and label are also `@theme` tokens in `global.css` (`text-headline`, `text-title`, etc.), each bundling font-size with its paired weight/tracking/line-height so a page picks up the whole rule in one utility class rather than restating it. Display stays a stepped `text-6xl`/`sm:text-8xl` pair on the homepage hero rather than the fluid `--text-display` token — the breakpoint jump reads better there than a continuous vw-scaled size — so `text-display` exists as a token but isn't forced onto that one hero.

## 4. Elevation: Light, Not Shadow

Depth on this site comes from luminosity, not box-shadow. The sun's glow, the moon's layered halo rings, the twinkle of stars, and the horizon gradient (`#horizon` — the sky settling into the solid chip color at ground level, like dusk gathering) do the work shadows would do elsewhere. Surfaces are flat; the sky behind them provides the atmosphere.

### Shadow Vocabulary

- **The Polaroid Float** (`box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.6)`): the single true drop shadow in the system, lifting the expanded photo off the dimmed sky.
- **The Moon Halo** (layered `box-shadow` rings at 6/18/40px in the moonlight family): a luminous point, not a shape.

### Named Rules

**The Glow-Over-Shadow Rule.** New elements that need depth get light (a halo, a gradient toward the horizon, a brightened border) — never a gray drop shadow. The polaroid keeps its float because it is a physical object; nothing else earns one without that justification.

## 5. Components

Shape and spacing are also `@theme` tokens: `rounded-card` (1rem) and `rounded-polaroid` (0.25rem) for radius, `p-card-pad`/`px-page-gutter`/`gap-section-gap` (1.5rem/1.5rem/2rem) for the recurring paddings and gaps below. `rounded-full` stays a plain Tailwind utility for pills — 9999px needs no named token.

### Chips (buttons)

- **Style:** `.sky-chip` — bordered pill (9999px), `border-current/30`, computed 7:1 background, text-xs lowercase tracking-widest.
- **Hover:** lifts (`-translate-y-0.5`, 300ms) and brightens the border to `current/80`. Content color never shifts on hover/focus — only decorative chrome does, so the AAA guarantee never depends on interaction state.
- **Focus:** 2px current-color outline, offset 2.

### Links

- **Style:** `.link-squiggle` — wavy underline, 1px thickness, 4px offset. The one trait every inline text link carries, everywhere, so clickable text is never confused with adjacent captions. Pair with the context's color treatment (`.sky-caption` on the horizon band, `.sky-top-ink` for back-links).
- **Hover:** the same 2px lift as chips and icons.

### Icon buttons & touch targets

- **Rule:** visible element may be small; the real hit area is expanded to ≥44×44px with an invisible `::after` at negative inset. Never shrink the clickable region to match the visual.

### Cards / Containers

- **`.sky-card`:** rounded-2xl (1rem), computed chip background, px-6 py-6 — for any content block sitting directly on the sky.
- **`.sky-top-card`:** same shape, but backed by `--sky-top` itself for content whose ink is verified against that exact color.
- **Border:** none; the computed background separates it from the sky.

### The Polaroid (signature component)

The expanded photo view: ivory card (oklch(96.75% 0.0098 87.47)), 1rem padding with a deeper 1.25rem bottom margin, 0.25rem radius, caption written in the bottom margin in Polaroid Ink. Emoji-only captions render at 1.75rem (jumbomoji). On touch phones, it swipes like a physical print — drag-follow with resistance and a capped ±3° tilt, toss-off past 40px, settle-back under it — with Instagram-style position dots below.

### Navigation

- Lowercase, tracking-widest, squiggle-underlined text links anchored to the bottom of the viewport (desktop) or page (mobile), vertically centered against the corner chips, with safe-area insets respected.

## 6. Do's and Don'ts

### Do:

- **Do** source every sky-tracking color from the custom properties and run `pnpm check:contrast` after touching sky.ts or the palette.
- **Do** give every inline text link the squiggle underline (1px wavy, 4px offset) — no exceptions.
- **Do** keep interactive feedback at 300ms and sky transitions at 1.6–2s; weather is slow, feedback is quick.
- **Do** expand touch targets to 44px with invisible `::after` hit areas.
- **Do** provide a `prefers-reduced-motion` alternative for every animation — twinkle, sparkles, swipes, and shows all collapse gracefully.
- **Do** keep chrome lowercase and prose sentence-case (The Two Registers Rule).

### Don't:

- **Don't** build the dev-portfolio template: hero + skills grid + project cards + testimonial slider (PRODUCT.md anti-reference).
- **Don't** introduce corporate/LinkedIn energy: Title-Case professionalism, buzzwords, resume voice.
- **Don't** ship AI-slop scaffolding: cream page backgrounds, eyebrow kickers, gradient text, generic identical card grids.
- **Don't** tip into the over-animated showreel: no scroll-jacking, no WebGL award-bait burying the person under effects.
- **Don't** hardcode a hex on anything meant to track the sky, and don't add gray drop shadows where a glow belongs.
- **Don't** add a second typeface or uppercase the chrome; one family, two registers, is the voice.
