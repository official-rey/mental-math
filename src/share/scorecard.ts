import { MODES, type RunEntry, type RunRecord } from '../drill/types';
import { fmt } from '../techniques/util';
import { APP_MEANING, APP_NAME, FONTS, PALETTE } from '../theme';
import { deltaLabel, ratingLabel, title } from '../drill/rating';
import { loadFonts, makeCanvas } from './draw';

export const CARD_W = 1080;
export const CARD_H = 1350;

/** The receipt's paper: a touch lighter than the app's, so it stands off the background. */
const RECEIPT = '#fffdf7';

/** The total line: what you did, and a few words on how it is counted. */
function total(run: RunRecord): { value: string; under: string } {
  if (run.mode === 'sprint') return { value: String(run.correct), under: `solved in ${Math.round(run.totalMs / 1000)} s` };
  if (run.mode === 'twenty') return { value: `${(run.totalMs / 1000).toFixed(1)}s`, under: `for ${run.correct} problems` };
  if (run.mode === 'endless') return { value: String(run.correct), under: 'solved before the lives ran out' };
  return { value: String(run.correct), under: 'solved' };
}

/** Problems solved first time, fastest first. */
function fastest(run: RunRecord, n: number): RunEntry[] {
  return run.log.filter((e) => e.ok && !e.misses).sort((a, b) => a.ms - b.ms).slice(0, n);
}

/** Text that fits `width`: smaller type first, then cut with an ellipsis. */
function fit(ctx: CanvasRenderingContext2D, text: string, width: number, size: number, min: number, weight = 500): void {
  for (let s = size; s >= min; s -= 2) {
    ctx.font = `${weight} ${s}px ${FONTS.mono}`;
    if (ctx.measureText(text).width <= width) return;
  }
}

function clip(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function dashed(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number) {
  ctx.fillStyle = PALETTE.dim;
  for (let x = x0; x < x1; x += 16) ctx.fillRect(x, y, 9, 2);
}

/**
 * The run as a receipt. "Kuwenta" is also the bill, the tally: the fastest solves are the line
 * items, the result is the total, and the barcode is the run itself, one bar per problem,
 * thicker for faster.
 */
export async function renderScoreCard(run: RunRecord, opts: { best?: boolean } = {}): Promise<Blob> {
  await loadFonts();
  const [canvas, ctx] = makeCanvas(CARD_W, CARD_H);
  const X0 = 170, X1 = 910, TOP = 80, BOTTOM = 1250;
  const L = X0 + 60, R = X1 - 60, MID = (X0 + X1) / 2;

  ctx.fillStyle = PALETTE.soft;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // The paper, with a torn zig-zag bottom and a soft shadow.
  ctx.save();
  ctx.shadowColor = 'rgba(43, 38, 32, 0.18)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = RECEIPT;
  ctx.beginPath();
  ctx.moveTo(X0, TOP);
  ctx.lineTo(X1, TOP);
  ctx.lineTo(X1, BOTTOM);
  for (let x = X1, up = true; x > X0; x -= 20, up = !up) ctx.lineTo(Math.max(X0, x - 20), up ? BOTTOM + 18 : BOTTOM);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.textBaseline = 'alphabetic';

  // The name and what it means
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `italic 500 80px ${FONTS.prose}`;
  ctx.fillText(APP_NAME.toLowerCase(), MID, 182);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `italic 400 28px ${FONTS.prose}`;
  ctx.fillText(APP_MEANING.join(' ').replace(/\.$/, ''), MID, 228);
  ctx.textAlign = 'left';
  dashed(ctx, L, R, 268);

  // What was played, and when
  const date = new Date(run.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
  const mode = MODES.find((m) => m.id === run.mode)!.short.toUpperCase();
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `500 24px ${FONTS.mono}`;
  const right = `${mode} · ${date}`;
  ctx.textAlign = 'right';
  ctx.fillText(right, R, 312);
  const rw = ctx.measureText(right).width;
  ctx.textAlign = 'left';
  ctx.fillText(clip(ctx, run.drillName.toUpperCase(), R - L - rw - 30), L, 312);
  dashed(ctx, L, R, 340);

  // Line items: the fastest solves, the fastest one marked
  const items = fastest(run, 5);
  let y = 400;
  items.forEach((e, i) => {
    const time = `${(e.ms / 1000).toFixed(1)}s`;
    if (i === 0) {
      ctx.fillStyle = PALETTE.soft;
      ctx.fillRect(L - 14, y - 38, R - L + 28, 54);
    }
    ctx.font = `600 28px ${FONTS.mono}`;
    ctx.fillStyle = i === 0 ? PALETTE.accent : PALETTE.dim;
    ctx.textAlign = 'right';
    ctx.fillText(time, R, y);
    const tw = ctx.measureText(time).width;
    ctx.textAlign = 'left';
    const item = `${e.text} = ${fmt(e.answer)}`;
    fit(ctx, item, R - L - tw - 30, 30, 20, i === 0 ? 600 : 500);
    ctx.fillStyle = i === 0 ? PALETTE.accent : PALETTE.ink;
    ctx.fillText(clip(ctx, item, R - L - tw - 30), L, y);
    y += 56;
  });
  const totalY = Math.max(y + 20, 720);
  dashed(ctx, L, R, totalY - 70);

  // Total
  const t = total(run);
  if (opts.best) t.under = `personal best · ${t.under}`;
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `700 34px ${FONTS.mono}`;
  ctx.fillText('TOTAL', L, totalY);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.accent;
  ctx.font = `600 104px ${FONTS.mono}`;
  ctx.fillText(t.value, R, totalY + 18);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `500 22px ${FONTS.mono}`;
  ctx.fillText(t.under, R, totalY + 56);
  ctx.textAlign = 'left';
  dashed(ctx, L, R, totalY + 92);

  // Agility rating, chess-style: title, rating, and how far this run moved it.
  let below = totalY + 92;
  if (run.rating !== undefined) {
    const y2 = totalY + 150;
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `700 28px ${FONTS.mono}`;
    ctx.font = `700 24px ${FONTS.mono}`;
    ctx.fillText('MENTAL MATH', L, y2 - 14);
    ctx.fillText('AGILITY RATING', L, y2 + 16);
    const d = run.ratingDelta ?? 0;
    const delta = deltaLabel(d);
    ctx.textAlign = 'right';
    ctx.font = `600 28px ${FONTS.mono}`;
    ctx.fillStyle = d >= 0 ? PALETTE.ok : PALETTE.bad;
    ctx.fillText(delta, R, y2);
    const dw = ctx.measureText(delta).width;
    ctx.fillStyle = PALETTE.accent;
    ctx.font = `600 44px ${FONTS.mono}`;
    ctx.fillText(ratingLabel(run.rating), R - dw - 18, y2 + 4);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `italic 400 26px ${FONTS.prose}`;
    ctx.fillText(title(run.rating).name.toLowerCase(), R, y2 + 42);
    ctx.textAlign = 'left';
    below = y2 + 72;
    dashed(ctx, L, R, below);
  }

  // Barcode: the run, one bar per problem, thicker = faster; retried ones in red, skipped ones left out.
  const log = run.log;
  const bTop = below + 38, bH = 120;
  if (log.length) {
    const slot = (R - L) / log.length;
    const quickest = Math.max(250, Math.min(...log.map((e) => e.ms)));
    log.forEach((e, i) => {
      if (e.skipped) return;
      const speed = Math.min(1, quickest / Math.max(e.ms, 1));
      const w = Math.max(2, slot * (0.22 + 0.62 * speed));
      ctx.fillStyle = e.misses ? PALETTE.bad : PALETTE.ink;
      ctx.fillRect(L + i * slot + (slot - w) / 2, bTop, w, bH);
    });
  }
  if (run.player) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `500 26px ${FONTS.mono}`;
    ctx.fillText(run.player.toUpperCase(), MID, bTop + bH + 48);
    ctx.textAlign = 'left';
  }

  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG encoding failed'))), 'image/png'));
}
