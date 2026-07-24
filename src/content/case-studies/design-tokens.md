---
title: 'from hex codes to a real design system'
description: 'How youthphase.dev went from scattered hex literals to a token pipeline that flows from DESIGN.md through Tailwind into every component.'
publishDate: 2026-07-24
draft: true
---

<!--
  Placeholder — scaffolding only, not the real writeup. Draft: true keeps
  this out of the /case-studies listing until it's ready.

  Rough outline to flesh out:
  - The problem: hex literals duplicated across Lightbox.astro, contact.astro,
    global.css — one color living in three places with no shared name.
  - The constraint: this site's sky (--sky-top, --ink, --card-bg) is computed
    at runtime every frame (src/scripts/sky.ts) and can't be a static token —
    only the *fixed* accents (polaroid ivory, chip fallback, etc.) could move
    into @theme. Distinguishing "this is fixed" from "this changes with the
    sun" was the actual design work, not the token syntax.
  - The pipeline: DESIGN.md's frontmatter -> Tailwind v4 @theme block in
    global.css -> usable as both utility classes (rounded-card) and
    var(--color-...) inside plain <style> blocks.
  - Proof: link to the live /design-system page, and to PR #40's before/after.
  - What it's for: not just tidiness — one source of truth so a redesign
    only requires editing DESIGN.md's numbers once.
-->
