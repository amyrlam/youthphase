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

const MOONLIGHT: RGB = [126, 142, 180];
const INK_LIGHT: RGB = [241, 238, 251];
const INK_DARK: RGB = [26, 32, 46];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const css = ([r, g, b]: RGB) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
const luminance = ([r, g, b]: RGB) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

function skyColors(altDeg: number): { top: RGB; bottom: RGB } {
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

function render(place: Place, mode: Mode) {
  const now = new Date();
  const { latitude, longitude } = place;

  const sun = SunCalc.getPosition(now, latitude, longitude);
  const sunAltDeg = (sun.altitude * 180) / Math.PI;
  const moon = SunCalc.getMoonPosition(now, latitude, longitude);
  const moonIllum = SunCalc.getMoonIllumination(now);

  const altDeg = mode === 'auto' ? sunAltDeg : FORCED_ALT[mode];
  let { top, bottom } = skyColors(altDeg);

  // Moonlight gently lifts the night sky — brighter when the moon is
  // fuller and higher.
  if (mode === 'auto' && altDeg < -10 && moon.altitude > 0) {
    const strength = moonIllum.fraction * Math.min(1, moon.altitude / 0.6) * 0.16;
    top = mix(top, MOONLIGHT, strength);
    bottom = mix(bottom, MOONLIGHT, strength);
  }

  const ink = luminance(mix(top, bottom, 0.4)) > 0.55 ? INK_DARK : INK_LIGHT;

  const root = document.documentElement;
  root.style.setProperty('--sky-top', css(top));
  root.style.setProperty('--sky-bottom', css(bottom));
  root.style.setProperty('--ink', css(ink));

  // The stars come out as the sun drops below civil twilight.
  const stars = document.getElementById('stars');
  if (stars) {
    const starOpacity = altDeg <= -12 ? 1 : altDeg >= -6 ? 0 : (-altDeg - 6) / 6;
    stars.style.opacity = String(starOpacity * 0.9);
  }

  // A soft glow that tracks whichever body is up: the sun by day, the
  // moon by night. Only meaningful when following the real sky.
  const glow = document.getElementById('glow');
  if (glow) {
    const body =
      mode !== 'auto'
        ? null
        : sunAltDeg > -6
          ? { pos: sun, color: 'rgba(255, 236, 200, 0.5)', opacity: 1 }
          : moon.altitude > 0
            ? { pos: moon, color: 'rgba(226, 233, 255, 0.4)', opacity: 0.4 + moonIllum.fraction * 0.6 }
            : null;

    if (body) {
      // Azimuth 0 = due south; map east→west onto left→right.
      const x = 50 + (body.pos.azimuth / (Math.PI / 2)) * 42;
      const y = 82 - (Math.max(0, (body.pos.altitude * 180) / Math.PI) / 90) * 62;
      glow.style.left = `${Math.max(4, Math.min(96, x))}%`;
      glow.style.top = `${y}%`;
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

start();
