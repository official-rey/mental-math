import type { RunRecord } from '../drill/types';
import { DEV_CREDIT, FONTS, PALETTE } from '../theme';
import { doubleRule, drawMotif, loadFonts, makeCanvas, modeLabel, motifCaption, motifK, pct, scoreText, secs, wrap } from './draw';

export const CARD_W = 1080;
export const CARD_H = 1350;

/**
 * 1080×1350 PNG score card. The times-table figure (k = the score) has its own circle in the
 * top right; the title sits in the column beside it, so nothing is drawn behind text.
 */
export async function renderScoreCard(run: RunRecord): Promise<Blob> {
  await loadFonts();
  const [canvas, ctx] = makeCanvas(CARD_W, CARD_H);
  const M = 88;
  const W = CARD_W - 2 * M;
  const R = 196;
  const art = { cx: CARD_W - M - R, cy: 150 + R, r: R };
  const titleW = art.cx - R - M - 40;

  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.textBaseline = 'alphabetic';

  // Figure and its caption
  const k = motifK(run);
  drawMotif(ctx, art, k);
  ctx.font = `400 22px ${FONTS.mono}`;
  ctx.fillStyle = PALETTE.dim;
  ctx.textAlign = 'center';
  ctx.fillText(motifCaption(k), art.cx, art.cy + R + 42);
  ctx.textAlign = 'left';

  // Kicker, title, mode
  ctx.font = `500 28px ${FONTS.mono}`;
  ctx.fillText('MENTAL MATH', M, 120);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `800 74px ${FONTS.head}`;
  let y = 240;
  for (const l of wrap(ctx, run.drillName, titleW, 4)) {
    ctx.fillText(l, M, y);
    y += 80;
  }
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `500 26px ${FONTS.mono}`;
  for (const l of wrap(ctx, modeLabel(run).toUpperCase(), titleW, 2)) {
    ctx.fillText(l, M, y + 4);
    y += 36;
  }
  doubleRule(ctx, M, 640, W, 2);

  // Score
  const s = scoreText(run);
  const scoreY = 960;
  ctx.font = `600 300px ${FONTS.mono}`;
  ctx.fillStyle = PALETTE.accent;
  ctx.fillText(s.main, M - 12, scoreY);
  const mainW = ctx.measureText(s.main).width;
  ctx.font = `500 112px ${FONTS.mono}`;
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(s.suffix, M + mainW, scoreY);
  ctx.font = `400 36px ${FONTS.mono}`;
  ctx.fillText(s.caption, M, scoreY + 62);

  // Stats row
  const rowY = 1066;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(M, rowY, W, 2);
  ctx.fillRect(M, rowY + 150, W, 2);
  const cols = [
    ['ACCURACY', pct(run.accuracy)],
    ['AVG / PROBLEM', secs(run.avgMs)],
    ['ANSWERED', String(run.attempted)],
  ];
  cols.forEach(([label, v], i) => {
    const x = M + (i * W) / 3;
    if (i) {
      ctx.fillStyle = PALETTE.rule;
      ctx.fillRect(x - 2, rowY + 20, 2, 112);
    }
    const tx = x + (i ? 28 : 0);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `500 25px ${FONTS.mono}`;
    ctx.fillText(label, tx, rowY + 54);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `500 56px ${FONTS.mono}`;
    ctx.fillText(v, tx, rowY + 120);
  });

  // Footer
  const fy = CARD_H - 62;
  ctx.font = `400 26px ${FONTS.mono}`;
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(new Date(run.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }), M, fy);
  ctx.textAlign = 'right';
  ctx.fillText(DEV_CREDIT, CARD_W - M, fy);
  ctx.textAlign = 'left';

  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG encoding failed'))), 'image/png'));
}
