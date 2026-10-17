import type { Problem } from './types';

const num = (s: string) => Number(s.replace(/,/g, ''));

const SQUARES = ['square-5', 'square-near-50', 'square-updown', 'square-3digit'];
const NEAR_BASE = ['nikhilam', 'close-together'];

/**
 * The technique that suits this problem better than the one that produced it, if any.
 * Drills re-roll such problems, so a general method never serves a number a dedicated
 * trick handles faster (35 × 11, 48 × 25, 45 × 45, 97 × 94…).
 */
export function betterTechnique(p: Problem): string | null {
  const self = p.technique;
  const product = /^(\d[\d,]*) × (\d[\d,]*)$/.exec(p.text);
  if (product) {
    const a = num(product[1]), b = num(product[2]);
    if (a === b) return SQUARES.includes(self) ? null : a % 10 === 5 ? 'square-5' : 'square-updown';
    if ((a === 11 || b === 11) && self !== 'times-11') return 'times-11';
    if ([5, 25, 50, 125].some((m) => a === m || b === m) && self !== 'halving') return 'halving';
    const nearHundred = (x: number) => x >= 90 && x <= 110 && x !== 100;
    if (nearHundred(a) && nearHundred(b) && !NEAR_BASE.includes(self)) return 'nikhilam';
    return null;
  }
  const square = /^(\d[\d,]*)²$/.exec(p.text);
  if (square) {
    const n = num(square[1]);
    if (n % 10 === 5 && n < 1000 && !['square-5', 'square-near-50'].includes(self)) return 'square-5';
    if (n >= 41 && n <= 59 && !['square-near-50', 'square-5'].includes(self)) return 'square-near-50';
  }
  return null;
}
