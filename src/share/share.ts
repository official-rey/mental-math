import type { RunRecord } from '../drill/types';
import { DEV_CREDIT } from '../theme';
import { pct, scoreText, secs } from './draw';

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

export function shareLine(run: RunRecord): string {
  const s = scoreText(run);
  return `${run.drillName}: ${s.main}${s.suffix} · ${pct(run.accuracy)} · ${secs(run.avgMs)} per problem. Mental Math (${DEV_CREDIT})`;
}

export function fileName(run: RunRecord, ext: 'png' | 'gif'): string {
  const slug = run.drillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const d = new Date(run.date);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `mental-math-${slug}-${stamp}.${ext}`;
}

/**
 * Share a file with the Web Share API when the platform can share files; otherwise download it
 * and copy a short text line to the clipboard.
 */
export async function shareOrDownload(blob: Blob, name: string, text: string): Promise<ShareOutcome> {
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
      // Fall through to download if sharing failed for another reason.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    /* clipboard may be unavailable; the download still happened */
  }
  return 'downloaded';
}
