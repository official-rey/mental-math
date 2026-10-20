/** Palette mirrored from styles/theme.css for canvas drawing (score card, GIF, background). */
export const PALETTE = {
  paper: '#FBF7EE',
  raised: '#F3EDDD',
  ink: '#2B2620',
  dim: '#71685A',
  rule: '#DDD2B8',
  accent: '#B4650B',
  soft: '#F1E0C4',
  ok: '#4F7359',
  bad: '#A5432E',
} as const;

export const FONTS = {
  head: "'Bricolage Grotesque', system-ui, sans-serif",
  prose: "'Newsreader', Georgia, serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
} as const;

export const DEV_CREDIT = 'dev: Rey S.';

/** The app's name: header, page titles and shared images. */
export const APP_NAME = 'Kuwenta';
/** What the name means, written like a dictionary entry: Tagalog for to compute, and (may kuwenta) worthwhile. */
export const APP_MEANING = ['to compute.', 'or, worthwhile.'] as const;
export const APP_SYLLABLES = 'ku·wen·ta';
