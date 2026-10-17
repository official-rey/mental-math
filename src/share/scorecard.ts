import type { RunRecord } from '../drill/types';
import { DEV_CREDIT, FONTS, PALETTE } from '../theme';
import { doubleRule, drawMotif, loadFonts, makeCanvas, modeLabel, pct, scoreText, secs, wrap } from './draw';

export const CARD_W = 1080;
export const CARD_H = 1350;

/** 1080×1350 PNG score card. */
export async function renderScoreCard(run: RunRecord): Promise<Blob> {
  await loadFonts();
  const [canvas, ctx] = makeCanvas(CARD_W, CARD_H);
  const M = 88; // margin
  const W = CARD_W - 2 * M;

  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  drawMotif(ctx, run.drillName, CARD_W, CARD_H);

  ctx.textBaseline = 'alphabetic';
  // Kicker
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `500 30px ${FONTS.mono}`;
  ctx.fillText('MENTAL MATH', M, 128);

  // Drill name
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `800 92px ${FONTS.head}`;
  const lines = wrap(ctx, run.drillName, W, 3);
  let y = 250;
  for (const l of lines) {
    ctx.fillText(l, M, y);
    y += 96;
  }
  y -= 60;
  doubleRule(ctx, M, y, W, 2);

  ctx.fillStyle = PALETTE.dim;
  ctx.font = `500 32px ${FONTS.mono}`;
  ctx.fillText(modeLabel(run).toUpperCase(), M, y + 72);

  // Score
  const s = scoreText(run);
  const scoreY = Math.max(y + 400, 790);
  ctx.font = `600 330px ${FONTS.mono}`;
  ctx.fillStyle = PALETTE.accent;
  ctx.fillText(s.main, M - 12, scoreY);
  const mainW = ctx.measureText(s.main).width;
  ctx.font = `500 120px ${FONTS.mono}`;
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(s.suffix, M + mainW, scoreY);
  ctx.font = `400 38px ${FONTS.mono}`;
  ctx.fillText(s.caption, M, scoreY + 66);

  // Stats row
  const rowY = scoreY + 130;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(M, rowY, W, 2);
  ctx.fillRect(M, rowY + 168, W, 2);
  const cols = [
    ['ACCURACY', pct(run.accuracy)],
    ['AVG / PROBLEM', secs(run.avgMs)],
    ['ANSWERED', String(run.attempted)],
  ];
  cols.forEach(([k, v], i) => {
    const x = M + (i * W) / 3;
    if (i) {
      ctx.fillStyle = PALETTE.rule;
      ctx.fillRect(x - 2, rowY + 22, 2, 124);
    }
    const tx = x + (i ? 28 : 0);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `500 26px ${FONTS.mono}`;
    ctx.fillText(k, tx, rowY + 62);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `500 58px ${FONTS.mono}`;
    ctx.fillText(v, tx, rowY + 134);
  });

  // Footer
  const fy = CARD_H - 92;
  ctx.fillStyle = PALETTE.rule;
  ctx.fillRect(M, fy - 54, W, 2);
  ctx.font = `400 28px ${FONTS.mono}`;
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(new Date(run.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }), M, fy);
  ctx.textAlign = 'right';
  ctx.fillText(DEV_CREDIT, CARD_W - M, fy);
  ctx.textAlign = 'left';

  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG encoding failed'))), 'image/png'));
}
