import { expect, test } from '@playwright/test';
import { answer, playTwenty } from './helpers';

test('one tap from the home screen to the first problem', async ({ page }) => {
  await page.goto('/?e2e=1#/');
  await page.getByTestId('start').tap();
  await expect(page.getByTestId('problem')).toHaveText(/\d/);
  await expect(page.getByTestId('answer')).toBeFocused();
  await expect(page.getByTestId('answer')).toHaveAttribute('inputmode', 'decimal');
});

test('completes a 20-problem run and records it', async ({ page }) => {
  await playTwenty(page);
  await expect(page.getByTestId('score')).toHaveText('19');
  await expect(page.getByTestId('leaderboard').locator('tbody tr')).toHaveCount(1);
  await expect(page.getByText('Personal best')).toBeVisible();
});

test('training shows the worked steps after a miss', async ({ page }) => {
  await page.goto('/?e2e=1#/drill?k=technique&ids=complements&l=2&m=training');
  await answer(page, false);
  const solution = page.getByTestId('solution');
  await expect(solution).toBeVisible();
  await expect(solution.locator('.steps .ex').first()).toHaveText(/1,000 − \d+/);
  await page.getByTestId('answer').press('Enter');
  await expect(solution).toBeHidden();
  await answer(page, true);
  await expect(page.getByTestId('stat')).toHaveText('✓1 ✗1');
});

test('chain drill accepts the final answer', async ({ page }) => {
  await page.goto('/?e2e=1#/chain');
  await page.getByTestId('start-chain').click();
  await expect(page.getByTestId('problem')).toHaveText(/[×÷+−]/);
  await answer(page, true);
  await expect(page.getByTestId('feedback')).toHaveText(/✓/);
});
