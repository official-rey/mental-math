import { drawTimesTable } from '../art/figures';
import { MODES, type RunRecord } from '../drill/types';
import { FONTS, PALETTE } from '../theme';

import { ROMAN } from '../techniques/types';
export { ROMAN };

export const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
export const pct = (x: number) => `${Math.round(x * 100)}%`;

export function scoreText(run: RunRecord): { main: string; suffix: string; caption: string } {
  if (run.mode === 'sprint') return { main: String(run.correct), suffix: '', caption: `correct · sprint lasted ${secs(run.totalMs)}` };
  if (run.mode === 'twenty') return { main: String(run.correct), suffix: '/20', caption: `correct in ${secs(run.totalMs)}` };
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
