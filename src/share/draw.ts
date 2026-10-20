import { drawTimesTable } from '../art/figures';
import { MODES, type RunRecord } from '../drill/types';
import { FONTS, PALETTE } from '../theme';

import { ROMAN } from '../techniques/types';
export { ROMAN };

export const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
export const pct = (x: number) => `${Math.round(x * 100)}%`;

export function scoreText(run: RunRecord): { main: string; suffix: string; caption: string } {
  if (run.mode === 'sprint') return { main: String(run.correct), suffix: '', caption: `correct · sprint lasted ${secs(run.totalMs)}` };
  // Mistakes are retried, so every problem gets solved: the time is what counts.
  if (run.mode === 'twenty') return { main: (run.totalMs / 1000).toFixed(1), suffix: 's', caption: `for ${run.correct}/20 problems` };
  return { main: String(run.correct), suffix: `/${run.attempted}`, caption: 'correct, untimed' };
}

export const modeLabel = (run: RunRecord) =>
  `${MODES.find((m) => m.id === run.mode)!.label} · Level ${ROMAN[run.level]}`;

/** Make sure the web fonts are ready before drawing text on a canvas. */
export async function loadFonts(): Promise<void> {
  if (!document.fonts) return;
  await Promise.all(
    [
      `800 80px ${FONTS.head}`,
      `600 80px ${FONTS.mono}`,
      `500 40px ${FONTS.mono}`,
      `400 40px ${FONTS.mono}`,
      `400 40px ${FONTS.prose}`,
    ].map((f) => document.fonts.load(f).catch(() => undefined)),
  );
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  return [c, ctx];
}

/** Two horizontal rules, thick over thin, like the app's headings. */
export function doubleRule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, scale = 1) {
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(x, y, w, 3 * scale);
  ctx.fillRect(x, y + 7 * scale, w, 1.5 * scale);
}

/** Word-wrap `text` into at most `maxLines` lines that fit `width`. */
export function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= width || !line) line = test;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s*\S*$/, '') + '…';
    return kept;
  }
  return lines;
}

/** First and last index of the longest run of first-try answers, or null if there is none. */
export function longestStreak(run: RunRecord): [number, number] | null {
  let best: [number, number] | null = null, start = -1;
  run.log.forEach((e, i) => {
    const clean = e.ok && !e.misses;
    if (clean && start < 0) start = i;
    if ((!clean || i === run.log.length - 1) && start >= 0) {
      const end = clean ? i : i - 1;
      if (!best || end - start > best[1] - best[0]) best = [start, end];
      start = -1;
    }
  });
  return best;
}

/**
 * One bar per problem, like a run's splits: taller means faster. First tries in accent,
 * retried ones in the "miss" color, skipped ones as a stub. The longest streak is bracketed.
 */
export function drawSplits(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number }, run: RunRecord, scale = 1) {
  const log = run.log;
  if (!log.length) return;
  const gap = Math.max(1, Math.min(6 * scale, (box.w / log.length) * 0.25));
  const bw = (box.w - gap * (log.length - 1)) / log.length;
  const fastest = Math.max(250, Math.min(...log.map((e) => e.ms)));
  const base = box.y + box.h;
  log.forEach((e, i) => {
    const speed = e.skipped ? 0.06 : Math.max(0.12, fastest / Math.max(e.ms, 1));
    const bh = (box.h - 26 * scale) * speed;
    ctx.fillStyle = e.skipped ? PALETTE.rule : e.misses ? PALETTE.bad : PALETTE.accent;
    ctx.globalAlpha = e.misses ? 0.75 : 1;
    ctx.fillRect(box.x + i * (bw + gap), base - bh, bw, bh);
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(box.x, base, box.w, 2 * scale);
  // Bracket over the longest streak.
  const s = longestStreak(run);
  if (s && s[1] - s[0] >= 2) {
    const x0 = box.x + s[0] * (bw + gap), x1 = box.x + s[1] * (bw + gap) + bw;
    const y = box.y + 4 * scale;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x0, y, x1 - x0, 2 * scale);
    ctx.fillRect(x0, y, 2 * scale, 8 * scale);
    ctx.fillRect(x1 - 2 * scale, y, 2 * scale, 8 * scale);
  }
}

export const MOTIF_N = 240;

/** The card's multiplier: the score itself, so each result draws its own figure. */
export function motifK(run: RunRecord): number {
  return Math.max(2, Math.min(MOTIF_N - 1, run.correct || 2));
}

/** Times-table figure in its own circle (never behind text); `k` defaults to the score. */
export function drawMotif(ctx: CanvasRenderingContext2D, at: { cx: number; cy: number; r: number }, k: number) {
  drawTimesTable(ctx, {
    ...at,
    n: MOTIF_N,
    k,
    colors: { ink: PALETTE.ink, accent: PALETTE.accent, rule: PALETTE.rule },
    weight: Math.max(0.6, at.r / 200),
  });
}

export const motifCaption = (k: number) => `i ↦ ${Number.isInteger(k) ? k : k.toFixed(1)}·i (mod ${MOTIF_N})`;
