/** Difficulty within a technique, I (gentlest) to VI (hardest). */
export type Level = 1 | 2 | 3 | 4 | 5 | 6;
export const LEVELS: Level[] = [1, 2, 3, 4, 5, 6];
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'] as const;

/** Where a technique sits in the overall catalog. */
export type Tier = 'Foundation' | 'Core' | 'Advanced';

export type CategoryId = 'addsub' | 'mul' | 'div' | 'est' | 'check';

export const CATEGORIES: { id: CategoryId; name: string }[] = [
  { id: 'addsub', name: 'Addition & subtraction' },
  { id: 'mul', name: 'Multiplication' },
  { id: 'div', name: 'Division' },
  { id: 'est', name: 'Estimation' },
  { id: 'check', name: 'Checking' },
];

export interface Problem {
  /** Technique id that produced this problem. */
  technique: string;
  level: Level;
  /** What the player sees, e.g. "47 × 6". */
  text: string;
  /** Canonical answer as a plain number string: "282", "12.6", "0.428571". */
  answer: string;
  /** Operands and any other generator choices; checked against level bounds in tests. */
  data: Record<string, number>;
  /** Arithmetic expression for independent checking when it differs from `text`. */
  expr?: string;
  /** Accept any numeric input within this absolute distance of `answer`. */
  tolerance?: number;
  /** Short qualifier shown under the problem, e.g. "first 6 decimals" or "nearest year". */
  hint?: string;
  /** Running-total chains: the terms shown one at a time instead of `text` all at once. */
  sequence?: string[];
}

/** One line of a vertical worked solution. */
export interface Step {
  /** Left gutter symbol: "=" by default on every line but the first. Use "" for none. */
  op?: string;
  expr: string;
  note?: string;
}

/** Inclusive [min, max] for each named value in Problem.data. */
export type Bounds = Readonly<Record<string, readonly [number, number]>>;

export interface LevelSpec {
  /** Short description of the numbers at this level, e.g. "2-digit × 1-digit". */
  label: string;
  bounds: Bounds;
}

/** Write a module's levels as `{ ... } as const satisfies Levels` to keep exact bounds. */
export type Levels = Readonly<Record<Level, LevelSpec>>;

export interface Rng {
  next(): number;
  int(lo: number, hi: number): number;
  pick<T>(items: readonly T[]): T;
  chance(p: number): boolean;
}

export interface Technique {
  meta: {
    id: string;
    name: string;
    category: CategoryId;
    tier: Tier;
    /** Sort key within the category. */
    order: number;
    /** One-line core idea. */
    idea: string;
  };
  card: {
    /** At most 3 short lines of prose. */
    prose: string[];
    example: Problem;
    /** Inline SVG showing why the technique works; uses theme classes from svg.ts. */
    graphic: () => string;
    /** Caption under the graphic. */
    caption: string;
  };
  levels: Levels;
  generate(rng: Rng, level: Level): Problem;
  /** Worked solution for this exact problem. The last step's expr must equal the answer. */
  steps(p: Problem): Step[];
  /** Independent value of the problem (for tests) when `expr`/`text` cannot be evaluated. */
  reference?(p: Problem): number;
}
