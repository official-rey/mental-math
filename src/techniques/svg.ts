/**
 * Small SVG kit for technique graphics. Colors come from CSS classes defined in
 * styles/theme.css (f-* = fill, s-* = stroke, t* = text), so every graphic follows the theme.
 *
 * Fills: f-paper f-raised f-soft f-accent f-ink f-dim f-rule f-ok f-bad f-none
 * Strokes: s-ink s-dim s-rule s-accent s-ok s-bad (add s-thin / s-thick / s-dash to vary)
 * Text: t (ink, 14px mono), plus modifiers t-dim t-accent t-ok t-bad t-sm t-lg t-xl t-b, t-start / t-end
 */

const esc = (s: string | number) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function svg(width: number, height: number, body: string, label: string): string {
  return `<svg class="graphic" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

export const rect = (x: number, y: number, w: number, h: number, cls = 'f-soft s-ink', rx = 0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${cls}"/>`;

export const line = (x1: number, y1: number, x2: number, y2: number, cls = 's-ink') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;

export const circle = (cx: number, cy: number, r: number, cls = 'f-soft s-ink') =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" class="${cls}"/>`;

export const path = (d: string, cls = 's-ink f-none') => `<path d="${d}" class="${cls}"/>`;

/** Text centered at (x, y) on its middle line. Use cls "t t-start" or "t t-end" to change anchoring. */
export const text = (x: number, y: number, s: string | number, cls = 't') =>
  `<text x="${x}" y="${y}" class="${cls}" dominant-baseline="central">${esc(s)}</text>`;

/** Arrow head marker-free: a small filled triangle pointing in direction (dx, dy). */
export function arrowHead(x: number, y: number, dx: number, dy: number, cls = 'f-accent', size = 7): string {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const bx = x - ux * size, by = y - uy * size;
  const px = -uy * size * 0.55, py = ux * size * 0.55;
  return `<path d="M${x},${y} L${bx + px},${by + py} L${bx - px},${by - py} Z" class="${cls}"/>`;
}

/** Split a length among parts proportionally, giving each part at least `minFrac` of the total. */
export function proportional(parts: number[], total: number, minFrac = 0.2): number[] {
  const sum = parts.reduce((a, b) => a + b, 0) || 1;
  let sizes = parts.map((p) => Math.max((p / sum) * total, total * minFrac));
  const scale = total / sizes.reduce((a, b) => a + b, 0);
  sizes = sizes.map((s) => s * scale);
  return sizes;
}

export interface AreaModelOptions {
  /** Width pieces, e.g. [40, 7]. */
  cols: number[];
  /** Height pieces, e.g. [6]. */
  rows: number[];
  colLabels?: string[];
  rowLabels?: string[];
  /** Text inside cell (r, c). Defaults to the product. */
  cell?: (r: number, c: number) => string;
  /** Cells drawn in accent. */
  accent?: [number, number][];
  width?: number;
  height?: number;
  label?: string;
}

/** Rectangle split into pieces: the picture behind distributing a product. */
export function areaModel(o: AreaModelOptions): string {
  const W = o.width ?? 320, H = o.height ?? 200;
  const pad = { l: 40, t: 30, r: 10, b: 10 };
  const ws = proportional(o.cols, W - pad.l - pad.r);
  const hs = proportional(o.rows, H - pad.t - pad.b, 0.28);
  let body = '';
  let y = pad.t;
  o.rows.forEach((rv, r) => {
    let x = pad.l;
    o.cols.forEach((cv, c) => {
      const hot = o.accent?.some(([ar, ac]) => ar === r && ac === c);
      body += rect(x, y, ws[c], hs[r], hot ? 'f-soft s-accent' : 'f-raised s-ink');
      const label = o.cell ? o.cell(r, c) : String(rv * cv);
      body += text(x + ws[c] / 2, y + hs[r] / 2, label, hot ? 't t-accent t-b' : 't');
      x += ws[c];
    });
    body += text(pad.l - 8, y + hs[r] / 2, o.rowLabels?.[r] ?? String(rv), 't t-dim t-end');
    y += hs[r];
  });
  let x = pad.l;
  o.cols.forEach((cv, c) => {
    body += text(x + ws[c] / 2, pad.t - 14, o.colLabels?.[c] ?? String(cv), 't t-dim');
    x += ws[c];
  });
  return svg(W, H, body, o.label ?? 'Area model');
}

export interface NumberLineOptions {
  from: number;
  to: number;
  /** Labeled positions. */
  marks: { at: number; label?: string; accent?: boolean }[];
  /** Curved hops between positions with a label above (or below). */
  hops?: { from: number; to: number; label: string; below?: boolean; accent?: boolean }[];
  width?: number;
  height?: number;
  label?: string;
}

/** Horizontal number line with arcs for each jump. */
export function numberLine(o: NumberLineOptions): string {
  const W = o.width ?? 340, H = o.height ?? 130;
  const x0 = 24, x1 = W - 24, y = H * 0.6;
  const X = (v: number) => x0 + ((v - o.from) / (o.to - o.from || 1)) * (x1 - x0);
  let body = line(x0 - 10, y, x1 + 10, y, 's-ink');
  for (const m of o.marks) {
    body += line(X(m.at), y - 6, X(m.at), y + 6, m.accent ? 's-accent s-thick' : 's-ink');
    if (m.label !== undefined) body += text(X(m.at), y + 20, m.label, m.accent ? 't t-sm t-accent t-b' : 't t-sm');
  }
  for (const h of o.hops ?? []) {
    const a = X(h.from), b = X(h.to), mid = (a + b) / 2;
    const rise = Math.min(46, Math.max(18, Math.abs(b - a) * 0.45)) * (h.below ? -1 : 1);
    const cy = y - rise * 1.3;
    const cls = h.accent === false ? 's-dim' : 's-accent';
    body += path(`M${a},${y - 3} Q${mid},${cy} ${b},${y - 3}`, `${cls} f-none`);
    body += arrowHead(b, y - 3, b - mid, y - 3 - cy, h.accent === false ? 'f-dim' : 'f-accent');
    body += text(mid, y - rise * 0.75 - (h.below ? -8 : 10), h.label, h.accent === false ? 't t-sm t-dim' : 't t-sm t-accent');
  }
  return svg(W, H, body, o.label ?? 'Number line');
}
