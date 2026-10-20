import { expect, test } from '@playwright/test';
import { answer, playTwenty } from './helpers';

test('home → Train → Start reaches the first problem, with the number pad', async ({ page }) => {
  await page.goto('/?e2e=1#/');
  await page.getByTestId('home-train').tap();
  await page.getByTestId('start-train').tap();
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
  // Every problem gets solved (the miss was retried), so the score is the time.
  await expect(page.getByTestId('score')).toHaveText(/^\d+\.\d$/);
  await expect(page.locator('.score-caption')).toHaveText('for 20/20 problems');
  await expect(page.getByTestId('new-trophies')).toContainText('First run');
  await expect(page.getByTestId('leaderboard').locator('tbody tr')).toHaveCount(1);
  await expect(page.getByText('Personal best')).toBeVisible();
  // First time: add a name to the leaderboard; the run picks it up.
  await page.getByTestId('nickname').fill('Rey');
  await page.getByTestId('nickname').press('Enter');
  await expect(page.getByTestId('leaderboard').locator('td.who').first()).toHaveText('Rey');
  await expect(page.getByTestId('nickname')).toHaveCount(0);
  // The run shows up in Stats.
  await page.getByTestId('top-stats').tap();
  await expect(page.getByTestId('totals')).toContainText('20');
});

test('training: a miss keeps the problem to retry; Show answer gives the full solution', async ({ page }) => {
  await page.goto('/?e2e=1#/drill?k=technique&ids=complements&l=2&m=training');
  await page.getByTestId('hint').tap();
  await expect(page.getByTestId('hint-steps').locator('.step')).toHaveCount(2);
  const problem = await page.getByTestId('problem').textContent();
  await answer(page, false);
  // Same problem, a nudge, and one more line of the method.
  await expect(page.getByTestId('feedback')).toHaveText(/try again/i);
  await expect(page.getByTestId('problem')).toHaveText(problem!);
  await expect(page.getByTestId('hint-steps').locator('.step')).toHaveCount(3);
  await expect(page.getByTestId('keypad')).toBeVisible();
  await page.getByTestId('reveal').tap();
  const solution = page.getByTestId('solution');
  await expect(solution).toBeVisible();
  // Level II was chosen, but drills start at Level I: 100 − a 2-digit number.
  await expect(solution.locator('.steps .step').first()).toHaveText(/^100\s*−\s*\d+$/);
  await page.getByTestId('next').tap();
  await expect(solution).toBeHidden();
  await answer(page, true);
  await expect(page.getByTestId('stat')).toHaveText('✓1 ✗1');
});

test('timed: a wrong answer is retried, and a streak shows from 3 in a row', async ({ page }) => {
  await page.goto('/?e2e=1#/drill?k=technique&ids=times-11&l=1&m=sprint');
  const problem = await page.getByTestId('problem').textContent();
  await answer(page, false);
  await expect(page.getByTestId('problem')).toHaveText(problem!);
  await answer(page, true);
  await expect(page.getByTestId('streak')).toBeHidden();
  await answer(page, true);
  await answer(page, true);
  await answer(page, true);
  await expect(page.getByTestId('streak')).toHaveText('3 in a row');
  await answer(page, true);
  await answer(page, true);
  await expect(page.getByTestId('toast')).toHaveText('5 in a row! Galing!');
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

test('chains show the whole expression with brackets and take the final answer', async ({ page }) => {
  await page.goto('/?e2e=1#/chain');
  await expect(page.locator('.stepper-problem')).toContainText('(8 + 4) × 3 − 18 ÷ (2 + 4)');
  // No level to pick: the ladder shows the highest level reached, and every run starts at I.
  await expect(page.getByTestId('chain-ladder')).toContainText('I of X');
  await page.getByTestId('start-chain').click();
  await expect(page.getByTestId('level')).toHaveText('Level I');
  await expect(page.getByTestId('problem')).toHaveText(/[×÷²]/);
  await expect(page.getByTestId('problem')).toHaveText(/[+−]/);
  await answer(page, true);
  await expect(page.getByTestId('feedback')).toHaveText(/✓/);
});

test('train and challenge pages start drills from the ticked techniques', async ({ page }) => {
  await page.goto('/?e2e=1#/');
  await page.getByTestId('tab-train').tap();
  await page.getByTestId('start-train').tap();
  await expect(page.getByTestId('done')).toBeVisible();
  await page.goto('/?e2e=1#/challenge');
  await page.getByRole('group', { name: 'Clock' }).getByRole('button', { name: '20 problems' }).tap();
  await page.getByTestId('start-challenge').tap();
  await expect(page.getByTestId('stat')).toHaveText(/^1\/20/);
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
  await page.getByTestId('top-stats').tap();
  await expect(page.getByText('No runs yet.')).toBeVisible();
  await page.getByTestId('top-settings').tap();
  await page.getByRole('group', { name: 'Number pad' }).getByRole('button', { name: 'Off' }).tap();
  await page.goto('/?e2e=1#/drill?k=technique&ids=mul-2x1&l=1&m=training');
  await expect(page.getByTestId('keypad')).toHaveCount(0);
  await expect(page.getByTestId('answer')).toHaveAttribute('inputmode', 'decimal');
});

test('technique card: the worked example reveals one step at a time', async ({ page }) => {
  await page.goto('/?e2e=1#/t/mul-2x1');
  const lines = page.locator('.stepper-lines .step');
  await expect(lines).toHaveCount(4);
  await expect(page.locator('.stepper-lines .step:not(.future)')).toHaveCount(2);
  await expect(page.locator('.stepper-lines .step.current .nt')).toHaveText('tens first');
  await page.getByTestId('next-step').tap();
  await page.getByTestId('next-step').tap();
  await expect(page.locator('.stepper-lines .step:not(.future)')).toHaveCount(4);
  await expect(page.locator('.stepper-lines .step.current .ex').last()).toHaveText('282');
  await expect(page.getByTestId('next-step')).toBeDisabled();
});

test('learn teaches; train picks techniques and starts', async ({ page }) => {
  await page.goto('/?e2e=1#/');
  await page.getByTestId('home-learn').tap();
  await expect(page.locator('input[type=checkbox]')).toHaveCount(0);
  await page.getByRole('tab', { name: /Add & subtract/ }).tap();
  await page.getByTestId('open-complements').tap();
  await expect(page.locator('.tech.open .stepper-problem')).toContainText('= ?');
  await page.getByTestId('tab-train').tap();
  await page.getByRole('button', { name: 'None' }).tap();
  await expect(page.getByTestId('start-train')).toHaveText(/Tick a technique/);
  await page.getByTestId('pick-complements').check();
  await page.getByTestId('pick-lr-addition').check();
  await expect(page.getByTestId('start-train')).toHaveText(/Start · 2/);
  await page.getByTestId('start-train').tap();
  await expect(page.getByTestId('problem')).toHaveText(/[+−]/);
});

test('landing: the first screen is the four parts and the book; the why is below the fold', async ({ page }) => {
  await page.goto('/?e2e=1#/');
  const viewport = page.viewportSize()!;
  for (const id of ['home-learn', 'home-train', 'home-challenge', 'home-chains']) {
    const box = (await page.getByTestId(id).boundingBox())!;
    expect(box.y + box.height).toBeLessThan(viewport.height);
  }
  await expect(page.locator('.book-cover')).toBeInViewport();
  const why = (await page.getByTestId('why').boundingBox())!;
  expect(why.y).toBeGreaterThanOrEqual(viewport.height - 70);
  // The demo rewrites one line in place until it reaches the answer.
  await page.getByTestId('why').scrollIntoViewIfNeeded();
  const line = page.getByTestId('demo').locator('.morph-line');
  const first = await line.textContent();
  await expect.poll(() => line.textContent(), { timeout: 5000 }).not.toBe(first);
  await expect(page.getByTestId('demo').locator('.tok.is-answer')).toHaveCount(3, { timeout: 25000 });
  await expect(line).toHaveText('517');
});

test('trig drills add a minus key; negative answers can be typed on the pad', async ({ page }) => {
  await page.goto('/?e2e=1#/drill?k=technique&ids=mul-2x1&l=1&m=training');
  await expect(page.locator('[data-key="neg"]')).toHaveCount(0);
  await page.goto('/?e2e=1#/drill?k=technique&ids=trig-special&l=4&m=training');
  // Answer the easy problems until the drill climbs to Level IV, where signs come in; type a negative one.
  for (let i = 0; i < 40; i++) {
    const answer = await page.evaluate(() => (window as unknown as { __mm: { answer(): string } }).__mm.answer());
    if (answer.startsWith('-')) {
      await page.locator('[data-key="neg"]').tap();
      for (const d of answer.slice(1)) await page.locator(`[data-key="${d}"]`).tap();
      await expect(page.getByTestId('answer')).toHaveValue(`−${answer.slice(1)}`);
      await page.locator('[data-key="enter"]').tap();
      await expect(page.getByTestId('feedback')).toHaveText(/✓ −/);
      return;
    }
    await page.getByTestId('answer').fill(answer);
    await page.getByTestId('answer').press('Enter');
  }
  throw new Error('no negative answer came up');
});

test('learn: the key takeaways start open, each with its picture, and fold away', async ({ page }) => {
  await page.goto('/?e2e=1#/learn');
  const takeaways = page.getByTestId('lessons');
  await expect(takeaways.locator('summary')).toHaveText('Key takeaways to improve mental math');
  await expect(page.locator('.lesson .graphic')).toHaveCount(6);
  await expect(page.locator('.lesson').first()).toContainText('Work left to right.');
  await takeaways.locator('summary').tap();
  await expect(page.locator('.lesson').first()).toBeHidden();
  await page.getByRole('tab', { name: /Higher math/ }).tap();
  await page.getByTestId('open-trig-special').tap();
  await expect(page.locator('.tech.open .figure-problem')).toHaveText('cos 120° = ?');
});

test('the Train Start button is not hidden behind the tab bar', async ({ page }) => {
  await page.goto('/?e2e=1#/train');
  const start = await page.getByTestId('start-train').boundingBox();
  const tabs = await page.locator('.tabbar').boundingBox();
  expect(start!.y + start!.height).toBeLessThanOrEqual(tabs!.y + 1);
  await page.getByTestId('start-train').tap();
  await expect(page.getByTestId('problem')).toBeVisible();
});
