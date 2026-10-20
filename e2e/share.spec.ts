import { expect, test, type Download } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { playTwenty } from './helpers';

// Force the download fallback so the files land on disk.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  });
});

async function save(d: Download): Promise<Buffer> {
  const path = test.info().outputPath(d.suggestedFilename());
  await d.saveAs(path);
  return readFileSync(path);
}

test('a finished run produces a 1080×1350 PNG and a GIF under 3 MB', async ({ page }) => {
  await playTwenty(page, 'square-5', [2, 11]);
  // One "Share result" button; the formats appear after it is tapped.
  await expect(page.getByTestId('share-png')).toBeHidden();
  await page.getByTestId('share').click();

  const [png] = await Promise.all([page.waitForEvent('download'), page.getByTestId('share-png').click()]);
  expect(png.suggestedFilename()).toMatch(/\.png$/);
  const pngBytes = await save(png);
  expect(pngBytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  expect(pngBytes.readUInt32BE(16)).toBe(1080);
  expect(pngBytes.readUInt32BE(20)).toBe(1350);

  const [gif] = await Promise.all([page.waitForEvent('download', { timeout: 30_000 }), page.getByTestId('share-gif').click()]);
  expect(gif.suggestedFilename()).toMatch(/\.gif$/);
  const gifBytes = await save(gif);
  expect(gifBytes.subarray(0, 6).toString('ascii')).toBe('GIF89a');
  expect(gifBytes.length).toBeLessThan(3 * 1024 * 1024);

  // Total frame delay (in centiseconds) stays within 6 seconds.
  let delay = 0;
  for (let i = 0; i < gifBytes.length - 5; i++) {
    // A Graphic Control Extension: 21 F9 04, four bytes, a 00 terminator, then an image descriptor (2C).
    if (gifBytes[i] === 0x21 && gifBytes[i + 1] === 0xf9 && gifBytes[i + 2] === 0x04 && gifBytes[i + 7] === 0x00 && gifBytes[i + 8] === 0x2c) delay += gifBytes.readUInt16LE(i + 4);
  }
  expect(delay).toBeGreaterThan(0);
  expect(delay).toBeLessThanOrEqual(600);

  await expect(page.getByTestId('share-status')).toContainText('Saved GIF');
});
