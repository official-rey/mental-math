/**
 * Typeset square roots the way they are written by hand or in LaTeX: a √ sign whose bar (the
 * vinculum) runs over the whole radicand. "√(16 + 9)" becomes √ with a bar over "16 + 9"; the
 * brackets are dropped, since the bar already groups. Roots nest. Everything else is plain text.
 */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A piece of math text: plain text, or a root over its own pieces. */
export type MathPart = { text: string } | { root: MathPart[] };

/** Split text into plain runs and radicals. */
export function parseMath(text: string): MathPart[] {
  const out: MathPart[] = [];
  let plain = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '√') {
      plain += text[i++];
      continue;
    }
    if (plain) out.push({ text: plain }), (plain = '');
    let j = i + 1;
    if (text[j] === '(') {
      // The radicand is everything up to the matching bracket.
      let depth = 0, k = j;
      for (; k < text.length; k++) {
        if (text[k] === '(') depth++;
        else if (text[k] === ')' && --depth === 0) break;
      }
      out.push({ root: parseMath(text.slice(j + 1, k)) });
      i = k + 1;
    } else {
      // A bare number (digits and thousands commas), or another root.
      while (j < text.length && /[\d,]/.test(text[j])) j++;
      out.push({ root: j > i + 1 ? [{ text: text.slice(i + 1, j) }] : [] });
      i = j;
    }
  }
  if (plain) out.push({ text: plain });
  return out;
}

/**
 * The sign is drawn, not typed: a stroke that stretches to the radicand's height and runs
 * straight into the bar, so sign and bar read as one line, as in typeset math.
 */
const SIGN = '<svg class="rad-sign" viewBox="0 0 10 32" preserveAspectRatio="none" aria-hidden="true"><path d="M0.6 19.5 3.2 17.4 5.8 30.6 9.7 1 11 1"/></svg>';

const toHTML = (parts: MathPart[]): string =>
  parts.map((p) => ('text' in p ? esc(p.text) : `<span class="rad" role="img" aria-label="square root of ${esc(plain(p.root))}">${SIGN}<span class="rad-in">${toHTML(p.root)}</span></span>`)).join('');

/** The radicand as plain text, for screen readers. */
const plain = (parts: MathPart[]): string => parts.map((p) => ('text' in p ? p.text : `√(${plain(p.root)})`)).join('');

/** HTML for math text, with typeset roots. */
export const mathHTML = (text: string): string => toHTML(parseMath(text));

/** Put math text into an element: typeset when it has a root, plain text otherwise. */
export function setMath(el: HTMLElement, text: string): void {
  if (text.includes('√')) el.innerHTML = mathHTML(text);
  else el.textContent = text;
}

/** Draw math text on a canvas from (x, y), left-aligned, with typeset roots. Returns the width. */
export function drawMath(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, draw = true): number {
  const size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(ctx.font)?.[1] ?? '16');
  /** How many roots sit inside these parts; an outer bar clears every bar inside it. */
  const nest = (parts: MathPart[]): number => Math.max(0, ...parts.map((p) => ('text' in p ? 0 : 1 + nest(p.root))));
  const walk = (parts: MathPart[], x0: number): number => {
    let cx = x0;
    for (const p of parts) {
      if ('text' in p) {
        if (draw) ctx.fillText(p.text, cx, y);
        cx += ctx.measureText(p.text).width;
        continue;
      }
      // A drawn sign that runs straight into the bar, a little higher for each nested root.
      const w = size * 0.5, line = Math.max(1.5, size * 0.065);
      const top = y - size * (0.86 + 0.16 * nest(p.root)), bottom = y + size * 0.16;
      const start = cx + w;
      const end = walk(p.root, start + size * 0.06) + size * 0.08;
      if (draw) {
        ctx.save();
        ctx.strokeStyle = ctx.fillStyle as string;
        ctx.lineWidth = line;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + w * 0.06, y - size * 0.3);
        ctx.lineTo(cx + w * 0.32, y - size * 0.37);
        ctx.lineTo(cx + w * 0.58, bottom);
        ctx.lineTo(start, top);
        ctx.lineTo(end, top);
        ctx.stroke();
        ctx.restore();
      }
      cx = end;
    }
    return cx;
  };
  return walk(parseMath(text), x) - x;
}
