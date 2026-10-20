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

const toHTML = (parts: MathPart[]): string =>
  parts.map((p) => ('text' in p ? esc(p.text) : `<span class="rad"><span class="rad-sign">√</span><span class="rad-in">${toHTML(p.root)}</span></span>`)).join('');

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
  const walk = (parts: MathPart[], x0: number, depth: number): number => {
    let cx = x0;
    for (const p of parts) {
      if ('text' in p) {
        if (draw) ctx.fillText(p.text, cx, y);
        cx += ctx.measureText(p.text).width;
        continue;
      }
      const sign = ctx.measureText('√').width;
      if (draw) ctx.fillText('√', cx, y);
      const start = cx + sign * 0.92;
      const end = walk(p.root, start + size * 0.06, depth + 1) + size * 0.06;
      // The bar: from the top of the sign across the radicand, a little higher for each nested root.
      if (draw) ctx.fillRect(start, y - size * (0.86 + 0.08 * depth), end - start, Math.max(1.5, size * 0.06));
      cx = end;
    }
    return cx;
  };
  return walk(parseMath(text), x, 0) - x;
}
