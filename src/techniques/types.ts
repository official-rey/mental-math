/** Difficulty within a technique, I (gentlest) to VI (hardest). */
export type Level = 1 | 2 | 3 | 4 | 5 | 6;
export const LEVELS: Level[] = [1, 2, 3, 4, 5, 6];
/** Roman numerals for levels; techniques use I–VI, chains go up to X. */
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const;

/** Where a technique sits in the overall catalog. */
export type Tier = 'Foundation' | 'Core' | 'Advanced';

export type CategoryId = 'addsub' | 'mul' | 'div' | 'pow' | 'est' | 'higher';

/** Learn and Train list the groups in this order. Higher math (number theory, trig and more) goes beyond the book. */
export const CATEGORIES: { id: CategoryId; name: string }[] = [
  { id: 'addsub', name: 'Addition & subtraction' },
  { id: 'mul', name: 'Multiplication' },
  { id: 'div', name: 'Division' },
  { id: 'pow', name: 'Powers & roots' },
  { id: 'est', name: 'Estimating & checking' },
  { id: 'higher', name: 'Higher math' },
];

export interface Problem {
  /** Technique id that produced this problem. */
  technique: string;
  level: Level;
  /** What the player sees, e.g. "47 × 6". */
  text: string;
  /** Canonical answer as a plain number string: "282", "12.6", "0.428571", "-0.5". */
  answer: string;
  /** Operands and any other generator choices; checked against level bounds in tests. */
  data: Record<string, number>;
  /** Arithmetic expression for independent checking when it differs from `text`. */
  expr?: string;
  /** Accept any numeric input within this absolute distance of `answer`. */
  tolerance?: number;
  /** Short qualifier shown under the problem, e.g. "first 6 decimals" or "nearest year". */
  hint?: string;
}

/** One line of a vertical worked solution. */
export interface Step {
  /** Left gutter symbol: "=" by default on every line but the first. Use "" for none. */
  op?: string;
  expr: string;
  note?: string;
  /** Keep the expression on one line instead of stacking it into a column (chains). */
  inline?: boolean;
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
    /** Some answers are negative, so drills offer a minus key. */
    signed?: boolean;
    /** One of the handful worth learning first: listed under Featured in Learn and Train. */
    featured?: boolean;
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
