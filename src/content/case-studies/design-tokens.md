---
title: 'the sky is the palette'
description: 'How youthphase.dev computes its design from your actual sky: the why, the accessibility engine underneath, and the craft in between.'
publishDate: 2026-07-24
draft: true
---

<!-- Working draft. draft: true keeps this off /case-studies until it's ready. -->

Most personal sites pick a palette. Mine computes one.

The background of youthphase.dev is your actual sky. Sun and moon positions are calculated for your location, the seventy brightest stars are placed for your latitude and the hour, and every color the interface wears is derived from that sky at runtime. Visit at golden hour and the page is pink and peach. Visit at midnight and it is deep midnight blue with real constellations. The line I want a visitor to remember is not "nice site." It is "the site was showing me my own sky."

## why a sky

I had two audiences and one minute: hiring managers deciding fast from a resume link, and fellow engineers who notice details. Both have seen a thousand dev portfolios, and that template (hero, skills grid, project cards, testimonial slider) was my anti-reference, along with corporate polish and the over-animated showreel. I wanted one person's living artifact instead, and the most alive thing a screen can do is reflect the actual world outside your window. Not a dark mode toggle. Weather.

That framing came with a rule that sounds absurd until you commit to it: nothing on this site is themed, so almost nothing gets a fixed color. Colors are never picked. They are computed.

## the constraint that designed the system

A palette that changes every frame has an obvious problem: contrast. A designer normally checks text against a known background once, at design time. I had every sun altitude from midnight through noon. So accessibility became the engine of the design rather than a checklist at the end. Body ink is chosen per frame to hold at least 4.5:1 against the gradient band it sits on. Card surfaces are computed to guarantee 7:1, so anything on them is AAA before it loads. And a script sweeps every sun altitude in CI and fails the build if any pairing drops below AAA. Not a warning. A failed build.

The constraint was not limiting the design; it was the design. The pretty part, the gradient itself, was almost free by comparison.

## real, not rendered

The sky's honesty is load-bearing, so the engineering keeps it honest. Location comes from the geolocation headers my host already attaches to every request, echoed back by a tiny serverless function: no third-party lookup, no tracking. When that fails, the site shows San Francisco and the status line says "borrowed sky" instead of "your sky," honest about whose sky you are looking at. The stars are the real brightest seventy for your coordinates and the hour. Everything advances in quarter-hour hops, a sundial tick rather than imperceptible drift.

And because delight should be discovered, not performed: every tap on open sky lands a small sparkle, shooting stars visit on clear nights, and three quick taps play a secret show that fits the moment, the moon running through its month of phases (terminator accurate) or a sudden shower and a rainbow by day. Every animation has a `prefers-reduced-motion` alternative. All of it is static files plus that one function; the sky is computed in your browser, not on a server.

## objects under the sky

One family of things refuses to participate in the weather: photographs. Photos render as physical prints on warm ivory stock, and a real print does not change color at dusk, so ivory is the system's one named exception. Everything else tracks the sky.

The prints get two mountings, on purpose. On the about page they are polaroids: caption written in the bottom margin, and on a phone they swipe like a print in your hand, drag-follow with resistance and a settle-back. On the contact page, the photo of my grandfather's dinghy (the site's namesake) is the same ivory stock but taped into the page at all four corners, a scrapbook gesture. Polaroids are my life now; the taped print is an inherited memory. Same paper, different verb.

## one source of truth

Even a computed system has fixed values: the ivory, the moonlight family, the type scale, the radii. Those started as raw color values copied into whichever component needed them, the ivory living in three files at once. Now they live in a single theme block (in oklch), flow from the same source the written design doc describes, and are usable as utility classes or CSS variables. A redesign edits the numbers once. The boundary matters as much as the tokens: the sky's own colors stay a runtime layer that can never be static, and the docs say so. A design system is not just what you systematize; it is knowing what you must not.

The proof is a live, unlisted page rendering every token, type style, and rule from the real site under the real sky: [/design-system](/design-system). This case study links there instead of embedding screenshots, because screenshots of this site are out of date by definition. The sky moved.

## why it's public

Every rule above is written down with its reason attached, because the test of a design system is not whether it looks coherent today but whether a change made months from now comes out coherent by default. I have spent years doing this work inside companies, behind NDAs. This one runs in the open: public repo, enforced accessibility, visual regression on every PR, inspectable down to the commit history. That is the point of it.
