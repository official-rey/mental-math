import type { RunRecord } from '../drill/types';

export function fileName(run: RunRecord, ext: 'png' | 'gif'): string {
  const slug = run.drillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const d = new Date(run.date);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `mental-math-${slug}-${stamp}.${ext}`;
}

/** Save the image to the device. No share sheet, no links, nothing sent anywhere. */
export function saveFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
