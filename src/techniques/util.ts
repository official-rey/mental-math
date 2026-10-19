import type { Problem, Rng } from './types';

/** Seeded PRNG (mulberry32). Pass no seed for a time-based one. */
export function makeRng(seed = (Date.now() ^ (Math.random() * 2 ** 32)) >>> 0): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
  };
}

/** Integer with thousands separators: 4387 → "4,387". Decimals keep their digits. */
export function fmt(n: number | string): string {
  const s = typeof n === 'number' ? numStr(n) : n;
  const neg = s.startsWith('-');
  const [int, frac] = (neg ? s.slice(1) : s).split('.');
  const grouped = int.length > 3 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : int;
  return (neg ? '−' : '') + grouped + (frac !== undefined ? '.' + frac : '');
}

/** Plain decimal string without float noise: 12.600000000000001 → "12.6". */
export function numStr(n: number, maxDecimals = 10): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toFixed(maxDecimals)));
}

/** Exact decimal string for p / 10^k with integer p (no float error). */
export function scaled(p: number, k: number): string {
  if (k === 0) return String(p);
  const neg = p < 0;
  const digits = String(Math.abs(p)).padStart(k + 1, '0');
  let int = digits.slice(0, digits.length - k);
  let frac = digits.slice(digits.length - k).replace(/0+$/, '');
  int = int.replace(/^0+(?=\d)/, '');
  return (neg ? '-' : '') + int + (frac ? '.' + frac : '');
}

/** Canonical form for comparing typed answers: no separators, no redundant zeros. */
export function normalize(raw: string): string {
  let s = raw.trim().replace(/[\s,  ≈…]/g, '').replace(/^\+/, '').replace(/[−–]/g, '-');
  const neg = s.startsWith('-');
  if (neg) s = s.slice(1);
  if (s.startsWith('.')) s = '0' + s;
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  s = s.replace(/^0+(?=\d)/, '');
  if (s === '' ) return '';
  return (neg && s !== '0' ? '-' : '') + s;
}

export function isCorrect(p: Problem, input: string): boolean {
  const got = normalize(input);
  if (got === '' || !/^-?\d+(\.\d+)?$/.test(got)) return false;
  if (p.tolerance !== undefined) {
    return Math.abs(Number(got) - Number(p.answer)) <= p.tolerance + 1e-9;
  }
  return got === normalize(p.answer);
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** Exponent as superscript digits: 13 → "¹³". */
export function sup(n: number): string {
  return String(n).replace(/\d/g, (d) => SUPERSCRIPT[Number(d)]);
}

export function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return Math.abs(a);
}

/** Digits of a non-negative integer, most significant first. */
export function digits(n: number): number[] {
  return String(Math.abs(Math.trunc(n))).split('').map(Number);
}

export function roundTo(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** Random integer in [lo, hi] whose last digit is not 0. */
export function nonRound(rng: Rng, lo: number, hi: number): number {
  for (;;) {
    const n = rng.int(lo, hi);
    if (n % 10 !== 0) return n;
  }
}
