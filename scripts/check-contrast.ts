/* Verifies WCAG AAA contrast across the entire sky gradient:
   - heading (large text) ink vs mid-gradient: ≥ 4.5:1
   - status/button ink vs computed chip background: ≥ 7:1
   Run: node scripts/check-contrast.ts */
import {
  skyColors,
  pickInk,
  chipFor,
  scrimFor,
  contrast,
  relLum,
  mix,
} from '../src/scripts/sky.ts';

let worstHeading = Infinity;
let worstChip = Infinity;
let worstTopWhite = Infinity;
let failures = 0;

const WHITE_INK: [number, number, number] = [255, 255, 255];

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

  // Back-links are white large-class text on the top of the sky — the top
  // must stay dark enough for 4.5:1 at every altitude.
  const topWhiteRatio = contrast(WHITE_INK, top);

  worstHeading = Math.min(worstHeading, headingRatio);
  worstChip = Math.min(worstChip, chipRatio);
  worstTopWhite = Math.min(worstTopWhite, topWhiteRatio);

  if (headingRatio < 4.5 || chipRatio < 7 || topWhiteRatio < 4.5) {
    failures++;
    console.error(
      `FAIL alt=${alt.toFixed(1)}° heading=${headingRatio.toFixed(2)} chip=${chipRatio.toFixed(2)} topWhite=${topWhiteRatio.toFixed(2)}`,
    );
  }
}

console.log(`worst heading contrast   (needs ≥ 4.5): ${worstHeading.toFixed(2)}`);
console.log(`worst chip contrast      (needs ≥ 7.0): ${worstChip.toFixed(2)}`);
console.log(`worst white-on-sky-top   (needs ≥ 4.5): ${worstTopWhite.toFixed(2)}`);
if (failures > 0) {
  console.error(`${failures} altitude(s) failed AAA`);
  process.exit(1);
}
console.log('AAA contrast holds for every sun altitude ✓');
