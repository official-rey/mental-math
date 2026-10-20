import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import type { RunEntry, RunRecord } from '../drill/types';
import { APP_NAME, FONTS, PALETTE } from '../theme';
import { doubleRule, drawMotif, drawSplits, loadFonts, makeCanvas, modeLabel, motifK, pct, scoreText, secs, wrap } from './draw';

export const GIF_W = 432;
export const GIF_H = 540;
export const GIF_MAX_MS = 6000;
export const GIF_MAX_BYTES = 3 * 1024 * 1024;

const INTRO_MS = 700;
const OUTRO_MS = 1700;
const MAX_ENTRIES = 24;

/** Spread at most `max` entries evenly over the run, keeping the first and last. */
function sampleLog(log: RunEntry[], max: number): RunEntry[] {
  if (log.length <= max) return log;
  return Array.from({ length: max }, (_, i) => log[Math.round((i * (log.length - 1)) / (max - 1))]);
}

type Frame = { draw: (ctx: CanvasRenderingContext2D, t: number) => void; delay: number };

/**
 * Replay of a run, at most 6 seconds: title, the problems flashing past with their solve
 * times, then the final score. Encoded in the browser with gifenc.
 */
export async function renderHighlightGif(run: RunRecord): Promise<Blob> {
  await loadFonts();
  const W = GIF_W, H = GIF_H, M = 34;
  const entries = sampleLog(run.log, MAX_ENTRIES);
  const per = entries.length ? Math.max(100, Math.min(360, Math.floor((GIF_MAX_MS - INTRO_MS - OUTRO_MS) / entries.length / 10) * 10)) : 0;
  const s = scoreText(run);

  // The figure's multiplier climbs from 2 to the final score over the replay.
  // It sits in its own circle, top right; text starts below it or to its left.
  const finalK = motifK(run);
  const R = 62;
  const art = { cx: W - M - R, cy: M + R, r: R };
  const base = (ctx: CanvasRenderingContext2D, progress: number) => {
    ctx.fillStyle = PALETTE.paper;
    ctx.fillRect(0, 0, W, H);
    drawMotif(ctx, art, 2 + (finalK - 2) * progress);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `800 18px ${FONTS.head}`;
    ctx.fillText(APP_NAME, M, 44);
  };

  const title = (ctx: CanvasRenderingContext2D, size: number, y0: number) => {
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `800 ${size}px ${FONTS.head}`;
    let y = y0;
    for (const l of wrap(ctx, run.drillName, W - 2 * M, 2)) {
      ctx.fillText(l, M, y);
      y += size * 1.04;
    }
    doubleRule(ctx, M, y - size * 0.6, W - 2 * M);
    return y - size * 0.6;
  };

  const frames: Frame[] = [];
  frames.push({
    delay: INTRO_MS,
    draw: (ctx) => {
      base(ctx, 0.15);
      const y = title(ctx, 40, 230);
      ctx.fillStyle = PALETTE.dim;
      ctx.font = `500 14px ${FONTS.mono}`;
      ctx.fillText(modeLabel(run).toUpperCase(), M, y + 34);
    },
  });

  entries.forEach((e, i) => {
    frames.push({
      delay: per,
      draw: (ctx) => {
        base(ctx, 0.15 + (0.75 * (i + 1)) / entries.length);
        ctx.fillStyle = PALETTE.dim;
        ctx.font = `500 13px ${FONTS.mono}`;
        ctx.fillText(`${String(run.log.indexOf(e) + 1).padStart(2, '0')} / ${run.log.length}`, M, 90);
        // Problem
        ctx.fillStyle = PALETTE.ink;
        let size = 54;
        ctx.font = `500 ${size}px ${FONTS.mono}`;
        while (ctx.measureText(e.text).width > W - 2 * M && size > 18) {
          size -= 2;
          ctx.font = `500 ${size}px ${FONTS.mono}`;
        }
        ctx.fillText(e.text, M, 250);
        // Answer and time
        ctx.font = `600 46px ${FONTS.mono}`;
        ctx.fillStyle = e.ok ? PALETTE.ok : PALETTE.bad;
        ctx.fillText(`${e.ok ? '✓' : '✗'} ${e.answer}`, M, 330);
        ctx.fillStyle = PALETTE.dim;
        ctx.font = `500 22px ${FONTS.mono}`;
        ctx.fillText(secs(e.ms), M, 378);
        // Progress
        ctx.fillStyle = PALETTE.rule;
        ctx.fillRect(M, 430, W - 2 * M, 3);
        ctx.fillStyle = PALETTE.accent;
        ctx.fillRect(M, 430, ((W - 2 * M) * (i + 1)) / entries.length, 3);
      },
    });
  });

  frames.push({
    delay: OUTRO_MS,
    draw: (ctx) => {
      base(ctx, 1);
      const y = title(ctx, 28, 205);
      ctx.font = `600 120px ${FONTS.mono}`;
      ctx.fillStyle = PALETTE.accent;
      ctx.fillText(s.main, M - 6, y + 150);
      const mw = ctx.measureText(s.main).width;
      ctx.font = `500 46px ${FONTS.mono}`;
      ctx.fillStyle = PALETTE.dim;
      ctx.fillText(s.suffix, M + mw, y + 150);
      ctx.font = `400 16px ${FONTS.mono}`;
      ctx.fillText(s.caption, M, y + 182);
      // The run as bars, taller = faster, then the first-try rate.
      drawSplits(ctx, { x: M, y: y + 200, w: W - 2 * M, h: 90 }, run);
      ctx.fillStyle = PALETTE.ink;
      ctx.font = `500 17px ${FONTS.mono}`;
      ctx.fillText(`${pct(run.accuracy)} first try · ${secs(run.avgMs)} each`, M, y + 322);
    },
  });

  // Render every frame, build one shared palette from a few representative frames, encode.
  const [, ctx] = makeCanvas(W, H);
  const pixels: Uint8ClampedArray[] = frames.map((f) => {
    f.draw(ctx, 0);
    return ctx.getImageData(0, 0, W, H).data;
  });
  const picks = [0, Math.min(1, frames.length - 1), Math.floor(frames.length / 2), frames.length - 1];
  const sample = new Uint8ClampedArray(picks.length * W * H * 4);
  picks.forEach((idx, k) => sample.set(pixels[idx], k * W * H * 4));
  const palette = quantize(sample, 128);

  const gif = GIFEncoder();
  frames.forEach((f, i) => {
    const index = applyPalette(pixels[i], palette);
    gif.writeFrame(index, W, H, { palette: i === 0 ? palette : undefined, delay: f.delay, repeat: 0 });
  });
  gif.finish();
  const bytes = gif.bytes();
  return new Blob([bytes as BlobPart], { type: 'image/gif' });
}

export function gifDurationMs(run: RunRecord): number {
  const n = Math.min(run.log.length, MAX_ENTRIES);
  const per = n ? Math.max(100, Math.min(360, Math.floor((GIF_MAX_MS - INTRO_MS - OUTRO_MS) / n / 10) * 10)) : 0;
  return INTRO_MS + n * per + OUTRO_MS;
}
