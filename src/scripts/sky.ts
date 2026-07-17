import * as SunCalc from 'suncalc';

type RGB = [number, number, number];

interface Place {
  latitude: number;
  longitude: number;
  label: string;
}

const FALLBACK: Place = { latitude: 37.7749, longitude: -122.4194, label: 'san francisco' };

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
  { alt: 4, top: [111, 136, 201], bottom: [242, 179, 128] },
  { alt: 12, top: [127, 168, 221], bottom: [207, 224, 239] },
  { alt: 35, top: [110, 163, 232], bottom: [188, 217, 245] },
  { alt: 90, top: [79, 151, 232], bottom: [168, 212, 242] },
];

/* Sun glow color keyed by altitude: pale and warm overhead, deep
   red-orange at the horizon. */
const SUN_GLOW: { alt: number; rgb: RGB; a: number }[] = [
  { alt: -5, rgb: [255, 92, 56], a: 0 },
  { alt: -2, rgb: [255, 106, 64], a: 0.55 },
  { alt: 0, rgb: [255, 128, 78], a: 0.6 },
  { alt: 6, rgb: [255, 178, 110], a: 0.6 },
  { alt: 20, rgb: [255, 224, 168], a: 0.55 },
  { alt: 60, rgb: [255, 246, 220], a: 0.5 },
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
   far enough — the result backs the status line and mode button. */
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

/* Deterministic PRNG (mulberry32) so the star field is identical on every
   visit. */
function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function plantStars() {
  const container = document.getElementById('stars');
  if (!container || container.childElementCount > 0) return;
  const rand = seededRandom(97);
  for (let i = 0; i < 70; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    const size = 1 + rand() * 1.6;
    star.style.left = `${(rand() * 100).toFixed(1)}%`;
    star.style.top = `${(rand() * 100).toFixed(1)}%`;
    star.style.width = `${size.toFixed(1)}px`;
    star.style.height = `${size.toFixed(1)}px`;
    star.style.setProperty('--o', (0.35 + rand() * 0.65).toFixed(2));
    star.style.setProperty('--d', `${(2.5 + rand() * 5).toFixed(1)}s`);
    star.style.animationDelay = `${(rand() * 6).toFixed(1)}s`;
    if (size > 2.2) star.style.boxShadow = '0 0 4px rgba(240, 244, 255, 0.7)';
    container.appendChild(star);
  }
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

function render(place: Place, mode: Mode) {
  const now = new Date();
  const { latitude, longitude } = place;

  const sun = SunCalc.getPosition(now, latitude, longitude);
  const sunAltDeg = sun.altitude;
  const moon = SunCalc.getMoonPosition(now, latitude, longitude);
  const moonIllum = SunCalc.getMoonIllumination(now);

  const altDeg = mode === 'auto' ? sunAltDeg : FORCED_ALT[mode];
  let { top, bottom } = skyColors(altDeg);

  // Moonlight gently lifts the night sky — brighter when the moon is
  // fuller and higher.
  if (mode === 'auto' && altDeg < -10 && moon.altitude > 0) {
    const strength = moonIllum.fraction * Math.min(1, moon.altitude / 35) * 0.16;
    top = mix(top, MOONLIGHT, strength);
    bottom = mix(bottom, MOONLIGHT, strength);
  }

  const ink = pickInk(top, bottom);
  const inkIsLight = relLum(ink) > 0.5;
  const chip = chipFor(bottom, inkIsLight);
  const scrim = scrimFor(ink, top, bottom);

  const root = document.documentElement;
  root.style.setProperty('--sky-top', css(top));
  root.style.setProperty('--sky-bottom', css(bottom));
  root.style.setProperty('--ink', css(ink));

  const scrimEl = document.getElementById('scrim');
  if (scrimEl) {
    scrimEl.style.backgroundColor = css(scrim.color);
    scrimEl.style.opacity = String(scrim.opacity);
  }

  for (const id of ['sky-status', 'sky-mode']) {
    const el = document.getElementById(id);
    if (el) {
      el.style.backgroundColor = css(chip.bg);
      el.style.color = css(chip.ink);
    }
  }

  // The stars come out as the sun drops below civil twilight.
  const stars = document.getElementById('stars');
  if (stars) {
    const starOpacity = altDeg <= -12 ? 1 : altDeg >= -6 ? 0 : (-altDeg - 6) / 6;
    stars.style.opacity = String(starOpacity * 0.9);
  }

  // A soft glow that tracks whichever body is up: the sun by day
  // (reddening toward the horizon), the moon by night.
  const glow = document.getElementById('glow');
  if (glow) {
    let body: { x: number; y: number; color: string; opacity: number } | null = null;
    if (mode === 'day') {
      body =
        sunAltDeg > 0
          ? { x: posX(sun.azimuth), y: posY(sun.altitude), color: sunGlowColor(sunAltDeg), opacity: 1 }
          : { x: 68, y: 30, color: sunGlowColor(45), opacity: 1 };
    } else if (mode === 'auto') {
      if (sunAltDeg > -5) {
        body = { x: posX(sun.azimuth), y: posY(sun.altitude), color: sunGlowColor(sunAltDeg), opacity: 1 };
      } else if (moon.altitude > 0) {
        body = {
          x: posX(moon.azimuth),
          y: posY(moon.altitude),
          color: 'rgba(226, 233, 255, 0.4)',
          opacity: 0.4 + moonIllum.fraction * 0.6,
        };
      }
    }

    if (body) {
      glow.style.left = `${body.x}%`;
      glow.style.top = `${body.y}%`;
      glow.style.backgroundColor = body.color;
      glow.style.opacity = String(body.opacity);
    } else {
      glow.style.opacity = '0';
    }
  }

  const status = document.getElementById('sky-status');
  if (status) {
    const inTenMinutes = SunCalc.getPosition(new Date(now.getTime() + 10 * 60 * 1000), latitude, longitude);
    const rising = inTenMinutes.altitude > sun.altitude;
    status.textContent = `${skyLabel(sunAltDeg, rising, moonIllum.phase)} · ${place.label}`;
  }
}

async function start() {
  let mode = storedMode();
  let place = FALLBACK;

  plantStars();

  const button = document.getElementById('sky-mode');
  const syncButton = () => {
    if (!button) return;
    button.textContent = `sky: ${mode}`;
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
    render(place, mode);
  });

  // Paint immediately with the San Francisco fallback, then refine once
  // the IP lookup resolves.
  syncButton();
  render(place, mode);
  place = await locate();
  render(place, mode);
  setInterval(() => render(place, mode), 60 * 1000);
}

if (typeof document !== 'undefined') start();
