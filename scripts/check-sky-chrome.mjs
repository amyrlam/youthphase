/* End-to-end check that iOS Safari's chrome (status bar + toolbar)
   actually tracks the sky through in-page day/night switches — the half
   of issue #60 that no Playwright test can see, because Safari paints
   its bars outside the web view.

   Drives real Safari in the iOS Simulator via the dev server's
   ?skyseq= harness (sky.ts, dev builds only), screenshots each state,
   and pixel-samples the status-bar strip and toolbar region.

   Prereqs: full Xcode with an iOS runtime, a booted simulator
   (`xcrun simctl boot "iPhone 17 Pro"`), and the dev server running
   (`astro dev`). Usage:

     node scripts/check-sky-chrome.mjs [base-url]   # default http://localhost:4321
*/
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const base = process.argv[2] ?? 'http://localhost:4321';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (cmd) => execSync(cmd, { encoding: 'utf8' });

// Expected chrome families, from sky.ts's palette: the day ground is a
// light slate, the night ground a deep navy. Safari lays translucent
// glass over them, so assert family membership, not exact values.
const looksDay = ([r, , b]) => r > 80 && b > 120;
const looksNight = ([r, , b]) => r < 45 && b > 70;

let udid;
try {
  const booted = JSON.parse(sh('xcrun simctl list devices booted -j')).devices;
  udid = Object.values(booted)
    .flat()
    .find((d) => d.state === 'Booted')?.udid;
} catch {
  /* fall through to the guidance below */
}
if (!udid) {
  console.error('No booted simulator. Boot one first, e.g.:\n  xcrun simctl boot "iPhone 17 Pro"');
  process.exit(2);
}

const dir = mkdtempSync(join(tmpdir(), 'sky-chrome-'));

// Capture on an absolute schedule (decode later): the skyseq switches
// fire every 5s from page load, and doing image work between shots
// drifts the sampling window into the wrong state.
const capture = (name) => {
  const file = join(dir, `${name}.png`);
  sh(`xcrun simctl io ${udid} screenshot ${file} 2>/dev/null`);
  return { name, file };
};

const sample = async ({ name, file }) => {
  const img = sharp(file);
  const { width, height, channels } = await img.metadata();
  const raw = await img.raw().toBuffer();
  const px = (x, y) => {
    const i = (y * width + x) * channels;
    return [raw[i], raw[i + 1], raw[i + 2]];
  };
  // Status-bar strip (clock height), and the toolbar band near the
  // bottom edge — both left of center, clear of clock/URL text.
  return { name, statusbar: px(150, 70), toolbar: px(150, height - 120) };
};

// Fresh Safari so no tint latched by a previous page taints the run.
sh(`xcrun simctl terminate ${udid} com.apple.mobilesafari 2>/dev/null || true`);
await sleep(2000);
sh(`xcrun simctl openurl ${udid} "${base}/?r=${Date.now()}&sky=day&skyseq=night,day,night"`);

const start = Date.now();
const shots = [];
// skyseq switches land at +5s/+10s/+15s after the page's JS starts;
// sample each state ~3.5s after its switch settles (page JS starts
// roughly a second after openurl).
for (const [name, at] of [
  ['day-load', 4500],
  ['night', 9500],
  ['day', 14500],
  ['night-again', 19500],
]) {
  await sleep(Math.max(0, start + at - Date.now()));
  shots.push(capture(name));
}
const states = [];
for (const s of shots) states.push(await sample(s));

let failed = false;
const check = (state, predicate, family) => {
  for (const region of ['statusbar', 'toolbar']) {
    const ok = predicate(state[region]);
    console.log(
      `${ok ? '✓' : '✗'} ${state.name.padEnd(12)} ${region.padEnd(10)} rgb(${state[region].join(', ')}) ${
        ok ? 'is' : 'is NOT'
      } ${family}`,
    );
    if (!ok) failed = true;
  }
};
check(states[0], looksDay, 'day');
check(states[1], looksNight, 'night');
check(states[2], looksDay, 'day');
check(states[3], looksNight, 'night');

console.log(failed ? `\nFAILED — screenshots kept in ${dir}` : '\nSafari chrome tracks the sky ✓');
process.exit(failed ? 1 : 0);
