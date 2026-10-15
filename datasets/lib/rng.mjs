/** Deterministic randomness for synthetic generators. Never use Math.random in dataset code. */
export function createRng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    /** Uniform float in [min, max). */
    float: (min = 0, max = 1) => min + (max - min) * next(),
    /** Uniform integer in [min, max]. */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: p => next() < p,
    pick: items => items[Math.floor(next() * items.length)],
    /** Weighted choice from [[value, weight], ...]. */
    weighted: pairs => {
      let total = 0;
      for (const [, w] of pairs) total += w;
      let r = next() * total;
      for (const [value, w] of pairs) { r -= w; if (r < 0) return value; }
      return pairs[pairs.length - 1][0];
    },
    normal: (mean = 0, sd = 1) => {
      const u = 1 - next(), v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    /** Log-normal with the given median and multiplicative spread. */
    lognormal: (median, sigma) => median * Math.exp(sigma * rng.normal()),
    poisson: lambda => {
      if (lambda > 30) return Math.max(0, Math.round(rng.normal(lambda, Math.sqrt(lambda))));
      const l = Math.exp(-lambda);
      let k = 0, p = 1;
      do { k++; p *= next(); } while (p > l);
      return k - 1;
    },
    exponential: mean => -mean * Math.log(1 - next()),
    shuffle: items => {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
      return out;
    },
    /** Independent child stream so adding draws in one entity does not shift every other entity. */
    fork: label => createRng(hash32(`${seed}:${label}`)),
  };
  return rng;
}

/** FNV-1a 32-bit. Stable across platforms; used for deterministic sampling. */
export function hash32(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

const pad = n => String(n).padStart(2, '0');
/** 'YYYY-MM-DD HH:MM:SS' from epoch milliseconds, interpreted in UTC. */
export function ts(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
export function day(ms) { return ts(ms).slice(0, 10); }
export function ms(text) { return Date.parse(text.replace(' ', 'T') + (text.length === 10 ? 'T00:00:00Z' : 'Z')); }
export const MINUTE = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
export const round2 = x => Math.round(x * 100) / 100;
