import type { Page } from '@playwright/test';

/** Answer the current problem: correctly, or with a deliberately wrong value. */
export async function answer(page: Page, correct = true) {
  const value = await page.evaluate(() => (window as unknown as { __mm: { answer(): string } }).__mm.answer());
  const input = page.getByTestId('answer');
  await input.fill(correct ? value : `${value}9`);
  await input.press('Enter');
}

/** Start from the technique card with the 20-problem mode and finish the run. */
export async function playTwenty(page: Page, technique = 'mul-2x1', misses: number[] = [3]) {
  await page.goto(`/?e2e=1#/drill?k=technique&ids=${technique}&l=1&m=twenty`);
  for (let i = 0; i < 20; i++) {
    await answer(page, !misses.includes(i));
  }
  await page.getByTestId('results').waitFor();
}
