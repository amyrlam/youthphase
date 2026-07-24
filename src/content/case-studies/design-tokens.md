---
title: 'the sky is the palette'
description: 'Why my personal site has no color scheme, and what it took to make the sky itself into a design system with AAA contrast enforced at build time.'
publishDate: 2026-07-24
draft: true
---

<!-- Working draft. draft: true keeps this off /case-studies until it's ready. -->

Most personal sites pick a palette. Mine computes one.

The background of youthphase.dev is your actual sky. Sun and moon positions are calculated for your location, the seventy brightest stars are placed for your latitude and the hour, and every color the interface wears is derived from that sky at runtime. Visit at golden hour and the page is pink and peach. Visit at midnight and it is deep midnight blue with real constellations. The line I want a visitor to remember is not "nice site." It is "the site was showing me my own sky."

This is a case study in what it takes to make that real: the design decisions behind it, the accessibility constraint that shaped everything, and how a system where color is weather still ends up needing ordinary design tokens.

## why a sky

I had two audiences and one minute. Hiring managers and recruiters arrive from a resume link and decide fast. Fellow engineers and designers arrive from a DM and notice details. Both have seen a thousand dev portfolios: hero, skills grid, project cards, testimonial slider. That template was my anti-reference. So was corporate polish, and so was the over-animated showreel that buries a person under WebGL.

What I wanted instead was a site that felt like one person's living artifact. Natural, organic, alive. The sky idea came from that: the most alive thing a screen can do is reflect the actual world outside your window. Not a dark mode toggle, not a theme. Weather.

That framing became the design system's north star, and it came with a rule that sounds absurd until you commit to it: nothing on this site is themed, so almost nothing gets to have a fixed color. Colors are never picked. They are computed.

## the constraint that designed the system

A palette that changes every frame has an obvious problem: contrast. A designer normally checks text contrast once, at design time, against a known background. I did not have a known background. I had every sun altitude from midnight through noon.

So accessibility became the engine of the whole design, not a checklist at the end:

- Body ink is chosen per frame to hold at least 4.5:1 against the sky gradient.
- Chip and card surfaces are computed to guarantee at least 7:1, so anything sitting on them is AAA before it even loads.
- A contrast script sweeps every sun altitude and fails the build if any pairing ever drops below AAA. Not a warning. A failed build.

This inverted the usual relationship between design and accessibility. The constraint was not limiting the design; it was the design. Deciding how ink gets picked, which surfaces guarantee what ratio, and what the build refuses to ship is where the actual design work happened. The pretty part, the gradient itself, was almost free by comparison.

## two kinds of color

Committing to computed color forced a question I never had to ask on a themed site: which colors are weather, and which are fixed?

Most of the palette is weather. The sky gradient, the text ink, the card surfaces all track the sun and change over a slow 1.6 second transition, the speed of light shifting outside.

But a few things refused to participate, and the interesting design work was noticing why. The polaroid is the clearest case. When you open a photo, it renders as a physical print: warm ivory card, dark ink caption written in the bottom margin. A real polaroid does not change color at dusk. Making it track the sky would have broken the object metaphor that makes it feel like a print in your hand. So it became the system's one named exception, written into the docs as a rule: polaroid ivory is the only surface allowed to ignore the sky. Everything else participates in the weather.

Once I saw that split clearly, the rest of the fixed colors revealed themselves: the moonlight family, starlight, the near-black backdrop behind an expanded photo. Ten colors total. Everything else is computed.

## from documented to enforced

Those ten fixed colors had a mundane problem: they existed as hex literals copied into whichever component needed them. The polaroid's ivory lived in three files. The design docs said one thing; the components each said their own thing.

The fix was ordinary design-token work, which is exactly why I wanted to do it properly on my own site: the values now live in one Tailwind theme block, flow from the same source that the human-readable design doc describes, and are usable both as utility classes and as CSS variables inside component styles. One source of truth. A redesign edits the numbers once.

The part I care about most is the boundary. The token layer holds only the fixed accents. The sky's own colors stay a separate runtime layer, computed every frame, and the docs say plainly that they can never be static tokens. A design system is not just what you systematize; it is knowing what you must not.

There is a live, unlisted page that renders all of it, swatches, type scale, spacing, elevation, straight from the real tokens on the real site, under the real sky: [/design-system](/design-system). It is the proof this case study links to instead of screenshots, because screenshots of this site are always out of date by definition. The sky moved.

## the quiet layer

The sky gets the attention, but the system underneath is deliberately quiet. One typeface in two registers: lowercase for the site's chrome, because a nav link should read like handwriting on a nametag, and sentence case for prose, because paragraphs are for reading. Depth comes from light, glows and halos and the horizon gradient, never gray drop shadows; the polaroid keeps the system's single true shadow because it is the only thing pretending to be a physical object. Motion runs at two speeds, slow for weather and quick for feedback, so the site feels alive without ever feeling animated.

Every one of those is written down as a named rule with a reason attached, because the test of a design system is not whether it looks coherent today. It is whether the next change, made months later on a tired evening, comes out coherent by default.

## what transfers

This site is small and personal, but nothing about the method is:

- Let a real constraint design the system. Build-enforced AAA shaped better decisions than taste alone would have.
- Decide what is dynamic and what is fixed before tokenizing anything. The boundary is the architecture.
- Prove the system where it actually runs. A living styleguide on real infrastructure beats a static artifact.
- Write down the why, not just the value. A hex code tells you what; a named rule tells the next person what not to break.

I have spent years doing this work inside companies, where the systems stay behind NDAs. This one is public, running, and inspectable down to the commit history. That is the point of it.
