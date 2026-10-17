import type { ArtController } from '../art/background';
import type { DrillSpec, RunRecord } from '../drill/types';
import type { SaveResult } from '../storage/store';

/** App-wide singletons set up in main.ts. */
export const app = {
  art: null as ArtController | null,
  /** The run that just finished, shown by the results screen. */
  lastResult: null as { run: RunRecord; saved: SaveResult; spec: DrillSpec } | null,
};
