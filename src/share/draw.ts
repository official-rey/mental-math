import { FIGURES, strokeFigure } from '../art/figures';
import { MODES, type RunRecord } from '../drill/types';
import { FONTS, PALETTE } from '../theme';

export const ROMAN = ['', 'I', 'II', 'III'];

export const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
export const pct = (x: number) => `${Math.round(x * 100)}%`;

export function scoreText(run: RunRecord): { main: string; suffix: string; caption: string } {
  if (run.mode === 'sprint') return { main: String(run.correct), suffix: '', caption: 'correct in 60 seconds' };
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

/** Deterministic motif per drill name, so a drill's card always carries the same curve. */
export function motifFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { pts: FIGURES[h % FIGURES.length](), second: FIGURES[(h >>> 3) % FIGURES.length](), rot: (h % 628) / 100 };
}

export function drawMotif(
  ctx: CanvasRenderingContext2D,
  name: string,
  w: number,
  h: number,
  progress = 1,
) {
  const m = motifFor(name);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.rule;
  ctx.lineWidth = Math.max(1.5, w / 400);
  strokeFigure(ctx, m.pts, { cx: w * 0.8, cy: h * 0.33, size: w * 0.36, rot: m.rot, progress });
  ctx.strokeStyle = PALETTE.accent;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = Math.max(1, w / 700);
  strokeFigure(ctx, m.second, { cx: w * 0.86, cy: h * 0.33, size: w * 0.15, rot: -m.rot, progress });
  ctx.restore();
}
