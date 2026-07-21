import * as SunCalc from 'suncalc';

type RGB = [number, number, number];

interface Place {
  latitude: number;
  longitude: number;
  label: string;
  /* False when the IP lookup failed and we're showing San Francisco's sky
     instead of the visitor's — the status line says so ("borrowed sky"). */
  located: boolean;
}

const FALLBACK: Place = {
  latitude: 37.7749,
  longitude: -122.4194,
  label: 'san francisco',
  located: false,
};

/* Manual override for accessibility: 'auto' follows the real sky,
   'day'/'night' pin the palette. */
type Mode = 'auto' | 'day' | 'night';
const MODE_KEY = 'sky-mode';
const MODES: Mode[] = ['auto', 'day', 'night'];
const FORCED_ALT: Record<'day' | 'night', number> = { day: 45, night: -30 };

function storedMode(): Mode {
  try {
    const m = localStorage.getItem(MODE_KEY);
    if (m === 'day' || m === 'night') return m;
  } catch {
    /* private browsing etc. */
  }
  return 'auto';
}

/* Sky palette keyed by sun altitude in degrees. */
const STOPS: { alt: number; top: RGB; bottom: RGB }[] = [
  { alt: -90, top: [7, 12, 38], bottom: [23, 34, 84] },
  { alt: -18, top: [10, 16, 48], bottom: [30, 43, 100] },
  { alt: -12, top: [16, 24, 62], bottom: [42, 55, 116] },
  { alt: -6, top: [27, 30, 75], bottom: [78, 55, 112] },
  { alt: -2, top: [56, 56, 117], bottom: [186, 104, 128] },
  { alt: 0, top: [74, 78, 148], bottom: [232, 137, 106] },
  { alt: 4, top: [84, 102, 156], bottom: [206, 150, 116] },
  { alt: 12, top: [64, 88, 134], bottom: [110, 136, 170] },
  { alt: 35, top: [52, 80, 126], bottom: [112, 140, 170] },
  { alt: 90, top: [44, 72, 118], bottom: [100, 130, 162] },
];

/* Sun glow color keyed by altitude: pale and warm overhead, unmistakably
   red at the horizon. */
const SUN_GLOW: { alt: number; rgb: RGB; a: number }[] = [
  { alt: -6, rgb: [255, 66, 34], a: 0 },
  { alt: -3, rgb: [255, 76, 40], a: 0.65 },
  { alt: 0, rgb: [255, 98, 48], a: 0.72 },
  { alt: 6, rgb: [255, 156, 90], a: 0.62 },
  { alt: 20, rgb: [255, 205, 120], a: 0.58 },
  { alt: 60, rgb: [255, 228, 158], a: 0.55 },
];

const MOONLIGHT: RGB = [126, 142, 180];
export const INK_LIGHT: RGB = [241, 238, 251];
export const INK_DARK: RGB = [26, 32, 46];
export const WHITE: RGB = [255, 255, 255];
export const BLACK: RGB = [0, 0, 0];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const css = ([r, g, b]: RGB) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

/* WCAG 2.x relative luminance and contrast ratio. */
export function relLum([r, g, b]: RGB): number {
  const f = (c: number) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: RGB, b: RGB): number {
  const la = relLum(a);
  const lb = relLum(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* The heading and links occupy the middle band of the gradient; contrast
   must hold against all of it, not just the midpoint. */
const BAND = [0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65];

function worstContrast(ink: RGB, top: RGB, bottom: RGB): number {
  return Math.min(...BAND.map((t) => contrast(ink, mix(top, bottom, t))));
}

/* Choose an ink for the heading (large text, AAA needs 4.5:1). Prefer the
   softer inks; fall back to whichever pure extreme fares best. Around
   sunset no ink can cover the whole band — scrimFor closes the gap. */
export function pickInk(top: RGB, bottom: RGB): RGB {
  const soft = [INK_LIGHT, INK_DARK].filter((c) => worstContrast(c, top, bottom) >= 5);
  if (soft.length) {
    return soft.sort((a, b) => worstContrast(b, top, bottom) - worstContrast(a, top, bottom))[0];
  }
  return worstContrast(WHITE, top, bottom) >= worstContrast(BLACK, top, bottom) ? WHITE : BLACK;
}

/* Top-of-page text (the "← home" back-link) sits on pure --sky-top, not
   the mid-gradient band pickInk is verified against — night skies get
   dark enough there that a fixed white can't be swapped for a fixed
   black. Same logic as pickInk, evaluated at a single point instead of a
   band, so it stays provably safe while still shifting color like the
   heading does. */
export function pickTopInk(top: RGB): RGB {
  const soft = [INK_LIGHT, INK_DARK].filter((c) => contrast(c, top) >= 5);
  if (soft.length) {
    return soft.sort((a, b) => contrast(b, top) - contrast(a, top))[0];
  }
  return contrast(WHITE, top) >= contrast(BLACK, top) ? WHITE : BLACK;
}

/* A soft ellipse behind the center content, darkened (or lightened) just
   enough that the ink clears 4.6:1 across the whole band. Opacity is 0
   except around sunset, when mid-luminance peach defeats every ink. */
export function scrimFor(ink: RGB, top: RGB, bottom: RGB): { color: RGB; opacity: number } {
  const toward = relLum(ink) > 0.5 ? BLACK : WHITE;
  for (let o = 0; o <= 0.45; o += 0.03) {
    const ok = BAND.every((t) => contrast(ink, mix(mix(top, bottom, t), toward, o)) >= 4.6);
    if (ok) return { color: toward, opacity: o };
  }
  return { color: toward, opacity: 0.45 };
}

/* Small text needs 7:1 for AAA, which no single ink can achieve against a
   sunset gradient. Shift the local background toward black (or white) just
   far enough — the result backs the status line and the corner buttons. */
export function chipFor(bg: RGB, inkIsLight: boolean): { bg: RGB; ink: RGB } {
  const ink = inkIsLight ? WHITE : BLACK;
  const toward = inkIsLight ? BLACK : WHITE;
  for (let t = 0; t <= 1; t += 0.05) {
    const c = mix(bg, toward, t);
    if (contrast(ink, c) >= 7.5) return { bg: c, ink };
  }
  return { bg: toward, ink };
}

export function skyColors(altDeg: number): { top: RGB; bottom: RGB } {
  if (altDeg <= STOPS[0].alt) return STOPS[0];
  for (let i = 1; i < STOPS.length; i++) {
    if (altDeg <= STOPS[i].alt) {
      const a = STOPS[i - 1];
      const b = STOPS[i];
      const t = (altDeg - a.alt) / (b.alt - a.alt);
      return { top: mix(a.top, b.top, t), bottom: mix(a.bottom, b.bottom, t) };
    }
  }
  return STOPS[STOPS.length - 1];
}

function sunGlowColor(altDeg: number): string {
  const stops = SUN_GLOW;
  if (altDeg <= stops[0].alt) {
    const s = stops[0];
    return `rgba(${s.rgb.join(', ')}, ${s.a})`;
  }
  for (let i = 1; i < stops.length; i++) {
    if (altDeg <= stops[i].alt) {
      const a = stops[i - 1];
      const b = stops[i];
      const t = (altDeg - a.alt) / (b.alt - a.alt);
      const rgb = mix(a.rgb, b.rgb, t).map(Math.round);
      return `rgba(${rgb.join(', ')}, ${lerp(a.a, b.a, t).toFixed(2)})`;
    }
  }
  const s = stops[stops.length - 1];
  return `rgba(${s.rgb.join(', ')}, ${s.a})`;
}

const MOON_PHASES = [
  'new moon',
  'waxing crescent',
  'first quarter',
  'waxing gibbous',
  'full moon',
  'waning gibbous',
  'last quarter',
  'waning crescent',
];

function moonPhaseName(phase: number): string {
  // phase: 0 = new, 0.5 = full. Snap to the nearest of 8 named phases.
  return MOON_PHASES[Math.round(phase * 8) % 8];
}

function skyLabel(altDeg: number, rising: boolean, moonPhase: number): string {
  if (altDeg < -12) return moonPhaseName(moonPhase);
  if (altDeg < -4) return rising ? 'dawn' : 'dusk';
  if (altDeg < 6) return 'golden hour';
  return 'daylight';
}

/* Deterministic PRNG (mulberry32) for per-star twinkle character. */
function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* The real sky: the ~70 brightest stars as [RA hours, Dec degrees,
   magnitude] (J2000). Which ones you see — and where — depends on your
   location and the time. */
// prettier-ignore
const STARS: [number, number, number][] = [
  [6.75, -16.72, -1.46], [6.40, -52.70, -0.74], [14.26, 19.18, -0.05],
  [18.62, 38.78, 0.03], [5.28, 45.99, 0.08], [5.24, -8.20, 0.13],
  [7.66, 5.22, 0.34], [5.92, 7.41, 0.42], [1.63, -57.24, 0.46],
  [14.06, -60.37, 0.61], [19.85, 8.87, 0.77], [12.44, -63.10, 0.76],
  [4.60, 16.51, 0.85], [16.49, -26.43, 0.96], [13.42, -11.16, 0.97],
  [7.76, 28.03, 1.14], [22.96, -29.62, 1.16], [20.69, 45.28, 1.25],
  [12.80, -59.69, 1.25], [10.14, 11.97, 1.35], [6.98, -28.97, 1.50],
  [7.58, 31.89, 1.57], [17.56, -37.10, 1.62], [12.52, -57.11, 1.64],
  [5.42, 6.35, 1.64], [5.44, 28.61, 1.65], [9.22, -69.72, 1.69],
  [5.60, -1.20, 1.69], [22.14, -46.96, 1.74], [5.68, -1.94, 1.77],
  [12.90, 55.96, 1.77], [11.06, 61.75, 1.79], [3.41, 49.86, 1.80],
  [7.14, -26.39, 1.83], [18.40, -34.38, 1.85], [8.38, -59.51, 1.86],
  [13.79, 49.31, 1.86], [6.00, 44.95, 1.90], [16.81, -69.03, 1.91],
  [6.63, 16.40, 1.92], [20.43, -56.74, 1.94], [8.75, -54.71, 1.96],
  [6.38, -17.96, 1.98], [9.46, -8.66, 1.98], [2.53, 89.26, 1.98],
  [2.12, 23.46, 2.00], [0.73, -17.99, 2.02], [13.42, 54.93, 2.04],
  [18.92, -26.30, 2.05], [1.16, 35.62, 2.05], [0.14, 29.09, 2.06],
  [14.11, -36.37, 2.06], [5.80, -9.67, 2.06], [17.58, 12.56, 2.07],
  [14.85, 74.16, 2.08], [10.33, 19.84, 2.08], [3.14, 40.96, 2.12],
  [11.82, 14.57, 2.13], [5.53, -0.30, 2.23], [20.37, 40.26, 2.23],
  [17.94, 51.49, 2.23], [0.67, 56.54, 2.24], [2.07, 42.33, 2.26],
  [0.15, 59.15, 2.27], [11.03, 56.38, 2.37], [21.74, 9.87, 2.40],
  [12.26, 57.03, 2.44], [21.31, 62.59, 2.46], [0.95, 60.72, 2.47],
  [3.79, 24.11, 2.87], [16.50, 21.49, 2.77],
];

const RAD = Math.PI / 180;

/* Local sidereal time in degrees — how far the celestial sphere has
   turned for this longitude and moment. */
function siderealDeg(at: Date, lonDeg: number): number {
  const days = (at.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000;
  return ((((280.46061837 + 360.98564736629 * days + lonDeg) % 360) + 360) % 360);
}

function starAltAz(
  raHours: number,
  decDeg: number,
  at: Date,
  latDeg: number,
  lonDeg: number,
): { altDeg: number; azDeg: number } {
  const H = (siderealDeg(at, lonDeg) - raHours * 15) * RAD;
  const lat = latDeg * RAD;
  const dec = decDeg * RAD;
  const alt = Math.asin(Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H));
  const azFromSouth = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat),
  );
  return { altDeg: alt / RAD, azDeg: (((azFromSouth / RAD + 180) % 360) + 360) % 360 };
}

/* Stars get the full sky height; the sun/moon glow stays lower. */
const starY = (altDeg: number) => 88 - (Math.max(0, altDeg) / 90) * 80;

function updateStars(place: Place, at: Date) {
  const container = document.getElementById('stars');
  if (!container) return;
  if (container.childElementCount === 0) {
    const rand = seededRandom(97);
    for (const [, , mag] of STARS) {
      const star = document.createElement('span');
      star.className = 'star';
      const size = Math.max(1, 3.4 - mag * 0.75);
      star.style.width = `${size.toFixed(1)}px`;
      star.style.height = `${size.toFixed(1)}px`;
      star.style.setProperty('--o', Math.min(0.95, Math.max(0.3, 0.9 - mag * 0.18)).toFixed(2));
      star.style.setProperty('--d', `${(2.5 + rand() * 5).toFixed(1)}s`);
      star.style.animationDelay = `${(rand() * 6).toFixed(1)}s`;
      if (mag < 0.5) star.style.boxShadow = '0 0 4px rgba(240, 244, 255, 0.7)';
      container.appendChild(star);
    }
  }
  const spans = container.children;
  STARS.forEach(([ra, dec], i) => {
    const el = spans[i] as HTMLElement;
    const { altDeg, azDeg } = starAltAz(ra, dec, at, place.latitude, place.longitude);
    if (altDeg > 2) {
      el.style.display = '';
      el.style.left = `${posX(azDeg).toFixed(2)}%`;
      el.style.top = `${starY(altDeg).toFixed(2)}%`;
    } else {
      el.style.display = 'none';
    }
  });
}

/* An occasional shooting star while the sky is dark. */
let nightNow = false;

function spawnShootingStar() {
  const container = document.getElementById('stars');
  if (!container) return;
  const s = document.createElement('span');
  s.className = 'shooting-star';
  s.style.left = `${10 + Math.random() * 65}%`;
  s.style.top = `${5 + Math.random() * 35}%`;
  s.addEventListener('animationend', () => s.remove());
  container.appendChild(s);
}

function scheduleShootingStar() {
  if (reducedMotion()) return;
  setTimeout(
    () => {
      if (nightNow && !document.hidden && !demoRunning) spawnShootingStar();
      scheduleShootingStar();
    },
    18000 + Math.random() * 25000,
  );
}

/* The fixed control chips fade while the page scrolls so bio text never
   passes under an opaque pill — occlusion is a readability bug just like
   contrast. They return ~200ms after scrolling stops. */
function fadeChipsWhileScrolling() {
  const chips = document.getElementById('sky-controls');
  if (!chips) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  addEventListener(
    'scroll',
    () => {
      chips.classList.add('is-scrolling');
      clearTimeout(timer);
      timer = setTimeout(() => chips.classList.remove('is-scrolling'), 200);
    },
    { passive: true },
  );
}

/* Tap/click anywhere (except links and buttons) leaves a tiny sparkle. */
function enableSparkles() {
  if (reducedMotion()) return;
  addEventListener('pointerdown', (e) => {
    if ((e.target as Element | null)?.closest('a, button')) return;
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.textContent = '✦';
    s.style.left = `${e.clientX}px`;
    s.style.top = `${e.clientY}px`;
    s.addEventListener('animationend', () => s.remove());
    document.body.appendChild(s);
  });
}

async function locate(): Promise<Place> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`geo lookup failed: ${res.status}`);
    const data = await res.json();
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        label: (data.city || FALLBACK.label).toLowerCase(),
        located: true,
      };
    }
  } catch {
    /* fall through to San Francisco */
  }
  return FALLBACK;
}

/* suncalc v2 returns DEGREES, with compass azimuth (0 = north, 90 = east,
   180 = south, 270 = west). Screen mimics facing south: east on the left,
   west on the right. */
const posX = (azimuthDeg: number) =>
  Math.max(4, Math.min(96, 50 - Math.sin((azimuthDeg * Math.PI) / 180) * 42));
const posY = (altitudeDeg: number) => 82 - (Math.max(0, altitudeDeg) / 90) * 62;

/* Sun/moon screen positions advance in 15-minute steps — a slow sundial
   hop rather than imperceptible drift. */
const QUARTER_HOUR = 15 * 60 * 1000;
const quantize = (d: Date) => new Date(Math.floor(d.getTime() / QUARTER_HOUR) * QUARTER_HOUR);

function formatTime(d: Date): string {
  return d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
    .replace(' ', '');
}

let demoRunning = false;

function render(place: Place, mode: Mode, at = new Date(), demo = false) {
  const { latitude, longitude } = place;

  const sun = SunCalc.getPosition(at, latitude, longitude);
  const sunAltDeg = sun.altitude;
  const moonIllum = SunCalc.getMoonIllumination(at);

  // Positions hop on the quarter hour; colors glide continuously.
  const qt = demo ? at : quantize(at);
  const qSun = SunCalc.getPosition(qt, latitude, longitude);
  const qMoon = SunCalc.getMoonPosition(qt, latitude, longitude);

  const altDeg = mode === 'auto' ? sunAltDeg : FORCED_ALT[mode];
  let { top, bottom } = skyColors(altDeg);

  // Moonlight gently lifts the night sky — brighter when the moon is
  // fuller and higher.
  if (mode === 'auto' && altDeg < -10 && qMoon.altitude > 0) {
    const strength = moonIllum.fraction * Math.min(1, qMoon.altitude / 35) * 0.16;
    top = mix(top, MOONLIGHT, strength);
    bottom = mix(bottom, MOONLIGHT, strength);
  }

  const ink = pickInk(top, bottom);
  const inkIsLight = relLum(ink) > 0.5;
  const chip = chipFor(bottom, inkIsLight);
  const scrim = scrimFor(ink, top, bottom);
  const topInk = pickTopInk(top);

  const root = document.documentElement;
  root.style.setProperty('--sky-top', css(top));
  root.style.setProperty('--sky-bottom', css(bottom));
  root.style.setProperty('--ink', css(ink));
  root.style.setProperty('--card-bg', css(chip.bg));
  root.style.setProperty('--chip-ink', css(chip.ink));
  root.style.setProperty('--top-ink', css(topInk));

  const scrimEl = document.getElementById('scrim');
  if (scrimEl) {
    scrimEl.style.backgroundColor = css(scrim.color);
    scrimEl.style.opacity = String(scrim.opacity);
  }

  for (const el of document.querySelectorAll<HTMLElement>('.sky-chip')) {
    el.style.backgroundColor = css(chip.bg);
    el.style.color = css(chip.ink);
  }

  // The stars come out as the sun drops below civil twilight.
  const starOpacity = altDeg <= -12 ? 1 : altDeg >= -6 ? 0 : (-altDeg - 6) / 6;
  nightNow = starOpacity > 0.5;
  const stars = document.getElementById('stars');
  if (stars) stars.style.opacity = String(starOpacity * 0.9);

  // One soft glow tracks whichever body is up: the sun by day (golden
  // overhead, reddening toward the horizon), cool moonlight by night. At
  // night a second, smaller luminous core sits inside the halo — the
  // sense of a moon behind thin atmosphere, brighter when fuller.
  const glow = document.getElementById('glow');
  const moonCore = document.getElementById('moon-core');
  if (glow) {
    const moonUp = qMoon.altitude > 0;
    let body: { x: number; y: number; color: string; opacity: number } | null = null;
    let moonAt: { x: number; y: number } | null = null;
    if (mode === 'day') {
      body =
        sunAltDeg > 0
          ? { x: posX(qSun.azimuth), y: posY(qSun.altitude), color: sunGlowColor(sunAltDeg), opacity: 1 }
          : { x: 66, y: 30, color: sunGlowColor(45), opacity: 1 };
    } else if (mode === 'night') {
      moonAt = moonUp
        ? { x: posX(qMoon.azimuth), y: posY(qMoon.altitude) }
        : { x: 72, y: 26 };
    } else if (sunAltDeg > -6) {
      body = { x: posX(qSun.azimuth), y: posY(qSun.altitude), color: sunGlowColor(sunAltDeg), opacity: 1 };
    } else if (moonUp) {
      moonAt = { x: posX(qMoon.azimuth), y: posY(qMoon.altitude) };
    }

    if (moonAt) {
      body = {
        ...moonAt,
        color: 'rgba(214, 224, 252, 0.3)',
        opacity: 0.35 + moonIllum.fraction * 0.5,
      };
    }

    if (body) {
      glow.style.left = `${body.x}%`;
      glow.style.top = `${body.y}%`;
      glow.style.backgroundColor = body.color;
      glow.style.opacity = String(body.opacity);
    } else {
      glow.style.opacity = '0';
    }

    if (moonCore) {
      if (moonAt) {
        moonCore.style.left = `${moonAt.x}%`;
        moonCore.style.top = `${moonAt.y}%`;
        moonCore.style.opacity = String(0.45 + moonIllum.fraction * 0.45);
      } else {
        moonCore.style.opacity = '0';
      }
    }
  }

  updateStars(place, qt);

  const status = document.getElementById('sky-status');
  if (status) {
    const inTenMinutes = SunCalc.getPosition(new Date(at.getTime() + 10 * 60 * 1000), latitude, longitude);
    const rising = inTenMinutes.altitude > sun.altitude;
    const label = skyLabel(sunAltDeg, rising, moonIllum.phase);
    // "your sky" is the one sentence of help the whole page needs: it
    // tells the visitor the gradient is computed from their real sky.
    // When geolocation failed we're honest about whose sky it is.
    const whose = place.located ? 'your sky' : 'borrowed sky';
    status.textContent = demo
      ? `${formatTime(at)} · ${label}`
      : mode === 'auto'
        ? `${whose} · ${label} · ${place.label}`
        : `${label} · ${place.label}`;
  }
}

/* Play the next 24 hours in about 14 seconds. The random real-night
   shooting stars pause during the demo (their 18s+ cadence would almost
   never land inside it), so the demo fires a couple deliberately while
   its sky is dark — the time-lapse should show them off, not hide them.
   Cancellable: clicking the button again (it reads "◼ stop" while
   running) or pressing Escape bails out and restores the real sky. */
let demoAbort = false;

async function playDemo(place: Place, mode: Mode, syncButton: () => void) {
  if (demoRunning) return;
  demoRunning = true;
  demoAbort = false;
  syncButton();
  document.documentElement.classList.add('sky-demo');
  const base = new Date();
  let nightFrames = 0;
  for (let m = 0; m <= 24 * 60; m += 10) {
    if (demoAbort) break;
    render(place, 'auto', new Date(base.getTime() + m * 60 * 1000), true);
    // A few frames into darkness and again deeper in — position is
    // random, timing is guaranteed so every run shows one.
    if (nightNow && !reducedMotion()) {
      nightFrames++;
      if (nightFrames === 4 || nightFrames === 22) spawnShootingStar();
    }
    await new Promise((r) => setTimeout(r, 95));
  }
  document.documentElement.classList.remove('sky-demo');
  demoRunning = false;
  syncButton();
  render(place, mode);
}

async function start() {
  let mode = storedMode();
  let place = FALLBACK;

  enableSparkles();
  scheduleShootingStar();
  fadeChipsWhileScrolling();

  const button = document.getElementById('sky-mode');
  // Monochrome text glyphs, not color emoji — they read at chip size and
  // stay in the site's single-ink voice.
  const MODE_LABELS: Record<Mode, string> = { auto: 'auto', day: '☀︎ day', night: '☾ night' };
  const syncButton = () => {
    if (!button) return;
    button.textContent = `sky: ${MODE_LABELS[mode]}`;
    button.setAttribute('aria-label', `Sky theme: ${mode}. Click to change.`);
  };

  button?.addEventListener('click', () => {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* fine to not persist */
    }
    syncButton();
    if (!demoRunning) render(place, mode);
  });

  const demoButton = document.getElementById('sky-demo');
  const syncDemoButton = () => {
    if (!demoButton) return;
    demoButton.textContent = demoRunning ? '◼ stop' : '▶ 24h';
    demoButton.setAttribute(
      'aria-label',
      demoRunning ? 'Stop the sky time-lapse' : 'Play a 24-hour sky time-lapse',
    );
  };
  demoButton?.addEventListener('click', () => {
    if (demoRunning) {
      demoAbort = true;
    } else {
      playDemo(place, mode, syncDemoButton);
    }
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && demoRunning) demoAbort = true;
  });

  // Dev console hook: preview the sky at any moment, e.g.
  // __skyAt('2026-07-16T20:30'). Call with no argument to return to now.
  (window as unknown as Record<string, unknown>).__skyAt = (iso?: string) =>
    render(place, mode, iso ? new Date(iso) : new Date(), Boolean(iso));

  // Paint immediately with the San Francisco fallback, then refine once
  // the IP lookup resolves.
  syncButton();
  render(place, mode);
  place = await locate();
  if (!demoRunning) render(place, mode);
  setInterval(() => {
    if (!demoRunning) render(place, mode);
  }, 60 * 1000);
}

if (typeof document !== 'undefined') start();
