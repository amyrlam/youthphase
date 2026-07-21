# Product

## Register

brand

## Platform

web

## Users

Two audiences, equally weighted: hiring managers and recruiters (Amy is looking for her next frontend role and relocating back to the San Francisco Bay Area), and fellow engineers and designers — peers who will notice the sky engine and the interaction details. Both arrive from a link (LinkedIn, a resume, a DM) and decide within a minute whether to keep reading.

## Product Purpose

The personal site of Amy Lam, frontend software engineer with a design-systems focus. Success is a visitor leaving with a memorable moment (the site that matched their actual sky), the impression that she sweats the details, and — for the right visitor — reaching out. A direct contact path (mailto vs. spam-safe contact form, undecided) is planned in [issue #30](https://github.com/amyrlam/youthphase/issues/30).

## Positioning

A personal site that is natural, organic, and alive — warmth and personhood over professional polish. The background is your real sky with real stars; the photos are polaroids of a real life. Every page should feel like one person's living artifact, not a professional's static brochure.

## Conversion & proof

- Primary CTA: reach out — today via the LinkedIn icon; a mailto or contact form is planned ([issue #30](https://github.com/amyrlam/youthphase/issues/30); Amy prefers mailto but is weighing spam, so a form may win).
- Secondary: follow on GitHub / Twitter.
- The line a visitor remembers after 10 seconds: the site was showing me my own sky.
- Belief ladder: this site is alive and unlike other personal sites → the person who built it is warm and meticulous → she'd be great to work with → reach out.
- Proof on hand: the site itself is the proof; no separate testimonials or press collected.

## Brand Personality

warm · alive · meticulous. Lowercase, human voice throughout. Whimsy (squiggle underlines, jumbomoji captions, a sky that hops stars on the quarter hour) delivered with engineering rigor.

## Anti-references

- The dev-portfolio template: hero + skills grid + project cards + testimonial slider.
- Corporate/LinkedIn energy: Title-Case professionalism, buzzwords, resume voice.
- AI-generated slop: cream backgrounds, eyebrow kickers, gradient text, generic card grids.
- The over-animated showreel: scroll-jacked, WebGL-heavy award-bait that buries the person under effects.
- Instagram is an interaction reference for the photo carousel only, not an aesthetic one — and its newer interaction patterns are explicitly not wanted. No other standing references; the site is its own reference point for now.

## Design Principles

1. Warmth and personhood over professional polish.
2. Alive, not static — the site reflects the real world (sun, moon, stars, weather of a moment).
3. Demonstrate craft, don't claim it — the details are the resume.
4. Lowercase, human voice — never corporate.
5. Whimsy with restraint — delight never tips into showreel.

## Accessibility & Inclusion

Practiced in the codebase and to be preserved: automated axe checks on every page in the Playwright suite, `prefers-reduced-motion` alternatives for all motion, aria-live announcements for silent state changes, 44px (WCAG AAA) touch targets via invisible hit-area expansion, and a contrast-check script (`npm run check:contrast`).
