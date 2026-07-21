/* Verifies WCAG AAA contrast across the entire sky gradient:
   - heading (large text) ink vs mid-gradient: ≥ 4.5:1
   - status/button ink vs computed chip background: ≥ 7:1
   - top-of-page link ink (pickTopInk) vs --sky-top: ≥ 4.5:1
   Run: node scripts/check-contrast.ts */
import {
  skyColors,
  pickInk,
  pickTopInk,
  chipFor,
  scrimFor,
  contrast,
  relLum,
  mix,
} from '../src/scripts/sky.ts';

let worstHeading = Infinity;
let worstChip = Infinity;
let worstTopInk = Infinity;
let failures = 0;

for (let alt = -90; alt <= 90; alt += 0.1) {
  const { top, bottom } = skyColors(alt);
  const ink = pickInk(top, bottom);
  const scrim = scrimFor(ink, top, bottom);
  // The heading occupies roughly the middle band of the gradient — the
  // chosen ink must clear 4.5:1 against all of it (scrim included), not
  // just the midpoint.
  let headingRatio = Infinity;
  for (let t = 0.35; t <= 0.6501; t += 0.05) {
    const bg = mix(mix(top, bottom, t), scrim.color, scrim.opacity);
    headingRatio = Math.min(headingRatio, contrast(ink, bg));
  }
  const chip = chipFor(bottom, relLum(ink) > 0.5);
  const chipRatio = contrast(chip.ink, chip.bg);

  // The top-of-page back-link sits on pure --sky-top, a different point
  // in the gradient than the heading band above — pickTopInk is chosen
  // specifically for it and must clear 4.5:1 there.
  const topInk = pickTopInk(top);
  const topInkRatio = contrast(topInk, top);

  worstHeading = Math.min(worstHeading, headingRatio);
  worstChip = Math.min(worstChip, chipRatio);
  worstTopInk = Math.min(worstTopInk, topInkRatio);

  if (headingRatio < 4.5 || chipRatio < 7 || topInkRatio < 4.5) {
    failures++;
    console.error(
      `FAIL alt=${alt.toFixed(1)}° heading=${headingRatio.toFixed(2)} chip=${chipRatio.toFixed(2)} topInk=${topInkRatio.toFixed(2)}`,
    );
  }
}

console.log(`worst heading contrast   (needs ≥ 4.5): ${worstHeading.toFixed(2)}`);
console.log(`worst chip contrast      (needs ≥ 7.0): ${worstChip.toFixed(2)}`);
console.log(`worst top-link contrast  (needs ≥ 4.5): ${worstTopInk.toFixed(2)}`);
if (failures > 0) {
  console.error(`${failures} altitude(s) failed AAA`);
  process.exit(1);
}
console.log('AAA contrast holds for every sun altitude ✓');
