/**
 * Arithmetic expressions: parse, evaluate (optionally in strict integer mode), print with
 * the parentheses the order of operations requires, and trace one operation at a time.
 *
 * Accepts + - − × * ÷ / mod ^ ² ³ and parentheses. Numbers may contain thousands commas.
 */

export type BinOp = '+' | '−' | '×' | '÷' | 'mod' | '^';

export type Node =
  | { kind: 'num'; value: number }
  | { kind: 'neg'; arg: Node }
  | { kind: 'bin'; op: BinOp; left: Node; right: Node };

export const num = (value: number): Node => ({ kind: 'num', value });
export const bin = (op: BinOp, left: Node, right: Node): Node => ({ kind: 'bin', op, left, right });
export const sq = (arg: Node): Node => bin('^', arg, num(2));

export class EvalError extends Error {}

type Tok = { t: 'num'; v: number } | { t: 'op'; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const m = /^(\d[\d,]*(?:\.\d+)?|\.\d+)/.exec(src.slice(i));
    if (m) {
      out.push({ t: 'num', v: Number(m[1].replace(/,/g, '')) });
      i += m[1].length;
      continue;
    }
    if (src.startsWith('mod', i)) { out.push({ t: 'op', v: 'mod' }); i += 3; continue; }
    const map: Record<string, string> = { '-': '−', '–': '−', '*': '×', '·': '×', '/': '÷', '−': '−', '×': '×', '÷': '÷', '+': '+', '^': '^', '²': '²', '³': '³', '(': '(', ')': ')' };
    if (!(c in map)) throw new EvalError(`Unexpected "${c}"`);
    out.push({ t: 'op', v: map[c] });
    i++;
  }
  return out;
}

export function parse(src: string): Node {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v;
  const take = (v: string) => {
    if (!isOp(v)) throw new EvalError(`Expected "${v}"`);
    pos++;
  };

  function expr(): Node {
    let n = term();
    while (isOp('+') || isOp('−')) {
      const op = toks[pos++].v as BinOp;
      n = bin(op, n, term());
    }
    return n;
  }
  function term(): Node {
    let n = unary();
    while (isOp('×') || isOp('÷') || isOp('mod')) {
      const op = toks[pos++].v as BinOp;
      n = bin(op, n, unary());
    }
    return n;
  }
  function unary(): Node {
    if (isOp('−')) { pos++; return { kind: 'neg', arg: unary() }; }
    if (isOp('+')) { pos++; return unary(); }
    return power();
  }
  function power(): Node {
    const base = postfix();
    if (isOp('^')) { pos++; return bin('^', base, unary()); }
    return base;
  }
  function postfix(): Node {
    let n = primary();
    for (;;) {
      if (isOp('²')) { pos++; n = bin('^', n, num(2)); }
      else if (isOp('³')) { pos++; n = bin('^', n, num(3)); }
      else return n;
    }
  }
  function primary(): Node {
    const t = peek();
    if (!t) throw new EvalError('Unexpected end');
    if (t.t === 'num') { pos++; return num(t.v); }
    if (t.v === '(') { pos++; const n = expr(); take(')'); return n; }
    throw new EvalError(`Unexpected "${t.v}"`);
  }

  const n = expr();
  if (pos !== toks.length) throw new EvalError('Trailing input');
  return n;
}

export interface EvalOptions {
  /** Require integer intermediates and exact division. */
  strict?: boolean;
  /** Receives every intermediate result in evaluation order. */
  onStep?: (value: number) => void;
}

function apply(op: BinOp, a: number, b: number, o: EvalOptions): number {
  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷':
      if (b === 0) throw new EvalError('Division by zero');
      if (o.strict && a % b !== 0) throw new EvalError(`${a} ÷ ${b} is not exact`);
      return a / b;
    case 'mod':
      if (b === 0) throw new EvalError('Mod by zero');
      return ((a % b) + b) % b;
    case '^': return a ** b;
  }
}

export function evaluate(node: Node, o: EvalOptions = {}): number {
  let v: number;
  if (node.kind === 'num') return node.value;
  if (node.kind === 'neg') v = -evaluate(node.arg, o);
  else v = apply(node.op, evaluate(node.left, o), evaluate(node.right, o), o);
  if (o.strict && !Number.isInteger(v)) throw new EvalError(`Non-integer intermediate ${v}`);
  o.onStep?.(v);
  return v;
}

export function evaluateString(src: string, o: EvalOptions = {}): number {
  return evaluate(parse(src), o);
}

const PREC: Record<BinOp, number> = { '+': 1, '−': 1, '×': 2, '÷': 2, mod: 2, '^': 4 };
const precOf = (n: Node) => (n.kind === 'num' ? 9 : n.kind === 'neg' ? 3 : PREC[n.op]);

const fmtNum = (v: number) => {
  const s = String(Math.abs(v));
  const grouped = Number.isInteger(v) && s.length > 3 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : s;
  return v < 0 ? `−${grouped}` : grouped;
};

/**
 * Print with display symbols. A child is parenthesized when its precedence is lower than its
 * parent's, or when it is a right operand of equal precedence, so the printed form evaluates in
 * exactly the tree's order.
 */
export function print(node: Node): string {
  if (node.kind === 'num') return node.value < 0 ? `(${fmtNum(node.value)})` : fmtNum(node.value);
  if (node.kind === 'neg') {
    const inner = print(node.arg);
    return precOf(node.arg) < 3 ? `−(${inner})` : `−${inner}`;
  }
  const p = PREC[node.op];
  const wrap = (child: Node, right: boolean) => {
    const cp = precOf(child);
    const s = print(child);
    const need = cp < p || (right && cp === p) || (node.op === '^' && !right && cp <= p);
    return need ? `(${s})` : s;
  };
  if (node.op === '^' && node.right.kind === 'num' && (node.right.value === 2 || node.right.value === 3)) {
    return wrap(node.left, false) + (node.right.value === 2 ? '²' : '³');
  }
  const sym = node.op === 'mod' ? ' mod ' : ` ${node.op} `;
  return wrap(node.left, false) + sym + wrap(node.right, true);
}

/** Replace the first ready operation (evaluation order) with its value; report what was done. */
function reduceOnce(node: Node, o: EvalOptions, did: { text: string }): Node | null {
  if (node.kind === 'num') return null;
  if (node.kind === 'neg') {
    if (node.arg.kind === 'num') {
      did.text = `−${fmtNum(node.arg.value)}`;
      return num(-node.arg.value);
    }
    const r = reduceOnce(node.arg, o, did);
    return r && { kind: 'neg', arg: r };
  }
  const l = reduceOnce(node.left, o, did);
  if (l) return { ...node, left: l };
  const r = reduceOnce(node.right, o, did);
  if (r) return { ...node, right: r };
  const a = (node.left as { value: number }).value, b = (node.right as { value: number }).value;
  did.text = print({ ...node, left: num(a), right: num(b) }).replace(/ /g, '');
  return num(apply(node.op, a, b, o));
}

/** The expression after each single operation, ending with the bare result. */
export function traceSteps(node: Node, o: EvalOptions = {}): { expr: string; did: string }[] {
  const out: { expr: string; did: string }[] = [];
  let cur = node;
  for (;;) {
    const did = { text: '' };
    const next = reduceOnce(cur, o, did);
    if (!next) break;
    out.push({ expr: print(next), did: did.text });
    cur = next;
  }
  return out;
}

export function trace(node: Node, o: EvalOptions = {}): string[] {
  return traceSteps(node, o).map((s) => s.expr);
}
