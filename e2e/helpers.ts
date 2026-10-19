import type { Page } from '@playwright/test';

/** Answer the current problem: correctly, or with a deliberately wrong value. */
export async function answer(page: Page, correct = true) {
  const value = await page.evaluate(() => (window as unknown as { __mm: { answer(): string } }).__mm.answer());
  const input = page.getByTestId('answer');
  await input.fill(correct ? value : `${value}9`);
  await input.press('Enter');
}

/** Play a 20-problem run to the end. Problems in `misses` get a wrong answer first, then the right one. */
export async function playTwenty(page: Page, technique = 'mul-2x1', misses: number[] = [3]) {
  await page.goto(`/?e2e=1#/drill?k=technique&ids=${technique}&l=1&m=twenty`);
  for (let i = 0; i < 20; i++) {
    if (misses.includes(i)) await answer(page, false);
    await answer(page, true);
  }
  await page.getByTestId('results').waitFor();
}
