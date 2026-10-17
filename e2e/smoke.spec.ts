import { expect, test } from '@playwright/test';
import { answer, playTwenty } from './helpers';

test('one tap from the Train screen to the first problem, with the number pad', async ({ page }) => {
  await page.goto('/?e2e=1#/');
  await page.getByTestId('start').tap();
  await expect(page.getByTestId('problem')).toHaveText(/\d/);
  await expect(page.getByTestId('answer')).toBeFocused();
  // Touch screen: the on-screen pad replaces the system keyboard.
  await expect(page.getByTestId('keypad')).toBeVisible();
  await expect(page.getByTestId('answer')).toHaveAttribute('inputmode', 'none');
});

test('answers can be typed on the number pad', async ({ page }) => {
  await page.goto('/?e2e=1#/drill?k=technique&ids=mul-2x1&l=1&m=training');
  const value = await page.evaluate(() => (window as unknown as { __mm: { answer(): string } }).__mm.answer());
  await page.locator('[data-key="9"]').tap();
  await page.locator('[data-key="back"]').tap();
  for (const d of value) await page.locator(`[data-key="${d}"]`).tap();
  await expect(page.getByTestId('answer')).toHaveValue(value);
  await page.locator('[data-key="enter"]').tap();
  await expect(page.getByTestId('feedback')).toHaveText(/✓/);
  await expect(page.getByTestId('stat')).toHaveText('✓1 ✗0');
});

test('completes a 20-problem run and records it', async ({ page }) => {
  await playTwenty(page);
  await expect(page.getByTestId('score')).toHaveText('19');
  await expect(page.getByTestId('leaderboard').locator('tbody tr')).toHaveCount(1);
  await expect(page.getByText('Personal best')).toBeVisible();
  // The run shows up in Stats.
  await page.getByTestId('tab-stats').tap();
  await expect(page.getByTestId('totals')).toContainText('20');
});

test('training: hints reveal steps one at a time; a miss shows the full solution', async ({ page }) => {
  await page.goto('/?e2e=1#/drill?k=technique&ids=complements&l=2&m=training');
  await page.getByTestId('hint').tap();
  await expect(page.getByTestId('hint-steps').locator('.ex')).toHaveCount(2);
  await page.getByTestId('hint').tap();
  await expect(page.getByTestId('hint-steps').locator('.ex')).toHaveCount(3);
  await answer(page, false);
  const solution = page.getByTestId('solution');
  await expect(solution).toBeVisible();
  await expect(solution.locator('.steps .ex').first()).toHaveText(/1,000 − \d+/);
  await expect(page.getByTestId('keypad')).toBeHidden();
  await page.getByTestId('next').tap();
  await expect(solution).toBeHidden();
  await answer(page, true);
  await expect(page.getByTestId('stat')).toHaveText('✓1 ✗1');
});

test('timed: pause stops the clock, skip counts as a miss', async ({ page }) => {
  await page.goto('/?e2e=1#/drill?k=technique&ids=times-11&l=1&m=sprint');
  await page.getByTestId('pause').tap();
  await expect(page.getByTestId('resume')).toBeVisible();
  const before = await page.getByTestId('stat').textContent();
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('stat')).toHaveText(before!);
  await page.getByTestId('resume').tap();
  await page.getByTestId('skip').tap();
  await expect(page.getByTestId('feedback')).toHaveText(/=/);
  const log = await page.evaluate(() => (window as unknown as { __mm: { session: { log: { skipped?: boolean }[] } } }).__mm.session.log);
  expect(log).toHaveLength(1);
  expect(log[0].skipped).toBe(true);
});

test('chain drill accepts the final answer', async ({ page }) => {
  await page.goto('/?e2e=1#/chain');
  await page.getByTestId('start-chain').click();
  await expect(page.getByTestId('problem')).toHaveText(/[×÷+−]/);
  await answer(page, true);
  await expect(page.getByTestId('feedback')).toHaveText(/✓/);
});

test('sections: Learn groups, Stats, Settings', async ({ page }) => {
  await page.goto('/?e2e=1#/');
  await page.getByTestId('tab-learn').tap();
  await page.getByRole('tab', { name: /Divide/ }).tap();
  await expect(page).toHaveURL(/#\/learn\/div/);
  await page.getByTestId('open-short-division').tap();
  await expect(page.getByTestId('open-short-division')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('drill-this')).toBeVisible();
  await expect(page).toHaveURL(/#\/learn\/div\/short-division/);
  await page.getByTestId('tab-stats').tap();
  await expect(page.getByText(/Nothing here yet/)).toBeVisible();
  await page.getByTestId('tab-settings').tap();
  await page.getByRole('group', { name: 'Number pad' }).getByRole('button', { name: 'Off' }).tap();
  await page.goto('/?e2e=1#/drill?k=technique&ids=mul-2x1&l=1&m=training');
  await expect(page.getByTestId('keypad')).toHaveCount(0);
  await expect(page.getByTestId('answer')).toHaveAttribute('inputmode', 'decimal');
});

test('technique card: the worked example reveals one step at a time', async ({ page }) => {
  await page.goto('/?e2e=1#/t/mul-2x1');
  const lines = page.locator('.stepper-lines .step');
  await expect(lines).toHaveCount(3);
  await expect(page.locator('.stepper-lines .step:not(.future)')).toHaveCount(2);
  await expect(page.locator('.stepper-lines .step.current .nt')).toHaveText('40×6, 7×6');
  await page.getByTestId('next-step').tap();
  await expect(page.locator('.stepper-lines .step:not(.future)')).toHaveCount(3);
  await expect(page.locator('.stepper-lines .step.current .ex')).toHaveText('282');
  await expect(page.getByTestId('next-step')).toBeDisabled();
});

test('learn: start learning, open a technique in place, tick techniques and drill them', async ({ page }) => {
  await page.goto('/?e2e=1#/');
  await page.getByTestId('start-learning').tap();
  await expect(page.getByTestId('drill-picked')).toBeHidden();
  await page.getByRole('tab', { name: /Add & subtract/ }).tap();
  await page.getByTestId('open-complements').tap();
  await expect(page.locator('.tech.open .stepper')).toBeVisible();
  await page.getByTestId('pick-complements').check();
  await page.getByTestId('pick-lr-addition').check();
  await expect(page.getByTestId('drill-picked')).toHaveText(/Drill 2 ticked techniques/);
  await page.getByTestId('drill-picked').tap();
  await expect(page.getByTestId('problem')).toHaveText(/[+−]/);
  await expect(page.getByTestId('drill-picked')).toHaveCount(0);
});

test('landing: the why comes first for new visitors and moves down after a while', async ({ page }) => {
  await page.goto('/?e2e=1#/');
  await expect(page.locator('.landing > section').first()).toHaveAttribute('data-testid', 'why');
  await page.evaluate(() => localStorage.setItem('mm:v1:prefs', JSON.stringify({ visits: 20 })));
  await page.reload();
  await expect(page.locator('.landing > section').first()).toHaveClass(/landing-hero/);
  await expect(page.locator('.landing > section').last()).toHaveAttribute('data-testid', 'why');
});
