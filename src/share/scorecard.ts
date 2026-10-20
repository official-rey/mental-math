import { MODES, type RunRecord } from '../drill/types';
import { ROMAN } from '../techniques/types';
import { APP_MEANING, APP_NAME, FONTS, PALETTE } from '../theme';
import { drawSplits, loadFonts, longestStreak, makeCanvas, pct, wrap } from './draw';

export const CARD_W = 1080;
export const CARD_H = 1350;

/** The headline: what you did, as big as possible, with a few words under it. */
function hero(run: RunRecord): { value: string; unit: string; label: string } {
  if (run.mode === 'sprint') return { value: String(run.correct), unit: '', label: `SOLVED IN ${Math.round(run.totalMs / 1000)} S` };
  if (run.mode === 'twenty') return { value: (run.totalMs / 1000).toFixed(1), unit: 's', label: `${run.correct} PROBLEMS` };
  return { value: String(run.correct), unit: '', label: 'SOLVED' };
}

/**
 * 1080×1350 PNG to post, laid out like a workout summary: few words, the result made big,
 * and a bar per problem so the run itself is the picture.
 */
export async function renderScoreCard(run: RunRecord, opts: { best?: boolean } = {}): Promise<Blob> {
  await loadFonts();
  const [canvas, ctx] = makeCanvas(CARD_W, CARD_H);
  const M = 84;
  const W = CARD_W - 2 * M;

  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.textBaseline = 'alphabetic';

  // The name as a dictionary entry, and the date
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `italic 500 58px ${FONTS.prose}`;
  const word = APP_NAME.toLowerCase();
  ctx.fillText(word, M, 128);
  const ww = ctx.measureText(word).width;
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `italic 400 28px ${FONTS.prose}`;
  ctx.fillText(APP_MEANING.join(' ').replace(/\.$/, ''), M + ww + 22, 126);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `500 26px ${FONTS.mono}`;
  ctx.fillText(new Date(run.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase(), CARD_W - M, 128);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(M, 162, W, 3);

  // What was played
  const mode = MODES.find((m) => m.id === run.mode)!.short.toUpperCase();
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `500 28px ${FONTS.mono}`;
  ctx.fillText(`${wrap(ctx, run.drillName.toUpperCase(), W - 260, 1)[0]}`, M, 222);
  ctx.textAlign = 'right';
  ctx.fillText(`${mode} · LVL ${ROMAN[run.level]}`, CARD_W - M, 222);
  ctx.textAlign = 'left';

  // The result, huge
  const h = hero(run);
  ctx.fillStyle = PALETTE.accent;
  ctx.font = `600 300px ${FONTS.mono}`;
  ctx.fillText(h.value, M - 14, 520);
  const vw = ctx.measureText(h.value).width;
  if (h.unit) {
    ctx.font = `500 120px ${FONTS.mono}`;
    ctx.fillText(h.unit, M + vw - 10, 520);
  }
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `600 34px ${FONTS.mono}`;
  ctx.fillText(h.label, M, 584);
  if (opts.best) {
    // A stamp for a personal best.
    const label = 'PERSONAL BEST';
    ctx.font = `700 28px ${FONTS.mono}`;
    const lw = ctx.measureText(label).width + 40;
    const lx = CARD_W - M - lw, ly = 548;
    ctx.fillStyle = PALETTE.accent;
    ctx.beginPath();
    ctx.roundRect(lx, ly, lw, 50, 25);
    ctx.fill();
    ctx.fillStyle = PALETTE.paper;
    ctx.fillText(label, lx + 20, ly + 35);
  }

  // The run, one bar per problem
  drawSplits(ctx, { x: M, y: 660, w: W, h: 330 }, run, 2);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `500 22px ${FONTS.mono}`;
  ctx.fillText('EACH PROBLEM · TALLER = FASTER', M, 1032);
  const streak = longestStreak(run);
  if (streak && streak[1] - streak[0] >= 2) {
    ctx.textAlign = 'right';
    ctx.fillText(`${streak[1] - streak[0] + 1} IN A ROW`, CARD_W - M, 1032);
    ctx.textAlign = 'left';
  }

  // Three numbers
  const cols: [string, string][] = [
    [pct(run.accuracy), 'FIRST TRY'],
    [String(run.bestStreak ?? (streak ? streak[1] - streak[0] + 1 : 0)), 'BEST STREAK'],
    [`${(run.avgMs / 1000).toFixed(1)}s`, 'PER PROBLEM'],
  ];
  const rowY = 1090;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(M, rowY, W, 2);
  cols.forEach(([v, label], i) => {
    const x = M + (i * W) / 3;
    if (i) {
      ctx.fillStyle = PALETTE.rule;
      ctx.fillRect(x - 2, rowY + 24, 2, 110);
    }
    const tx = x + (i ? 28 : 0);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `600 64px ${FONTS.mono}`;
    ctx.fillText(v, tx, rowY + 92);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `500 22px ${FONTS.mono}`;
    ctx.fillText(label, tx, rowY + 130);
  });

  // Who, and the brag
  const fy = CARD_H - 60;
  ctx.fillStyle = PALETTE.accent;
  ctx.font = `600 30px ${FONTS.mono}`;
  if (run.player) ctx.fillText(run.player, M, fy);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `800 34px ${FONTS.head}`;
  ctx.fillText('No calculator.', CARD_W - M, fy);
  ctx.textAlign = 'left';

  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG encoding failed'))), 'image/png'));
}
