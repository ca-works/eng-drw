import { test, expect } from '@playwright/test';

test('reduced motion keeps the 3D engine opt-in', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const engines: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('three-engine')) engines.push(request.url());
  });
  await page.goto('./');
  await expect(
    page.getByRole('button', { name: 'Explore in 3D', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.assembly-fallback img')).toBeVisible();
  expect(engines).toEqual([]);
});

test('3D loading failure retains the original model poster and navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*three-engine*', (route) => route.abort());
  await page.goto('./');
  await page
    .getByRole('button', { name: 'Explore in 3D', exact: true })
    .click();
  await expect(page.locator('[data-assembly]')).toHaveAttribute(
    'data-state',
    'fallback',
  );
  await expect(page.locator('.assembly-fallback img')).toBeVisible();
  await page.locator('.hero-actions a').first().click();
  await expect(page).toHaveURL(/\/download\/$/);
});

test('turbine becomes a drawing and replay restores the complete assembly', async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(browserName !== 'chromium' || isMobile, 'Desktop WebGL sequence');
  // GitHub's Linux runners have no GPU; software WebGL is far too slow for the timed checkpoints.
  // This sequence is verified on real hardware (see docs/TESTING.md).
  test.skip(!!process.env.CI, 'Needs a hardware GPU');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./');
  const stage = page.locator('[data-assembly]');
  // Let the lazily loaded scene finish its first run, so Replay is wired up before we press it.
  await expect(stage).toHaveAttribute('data-phase', 'drawing', { timeout: 15000 });
  await page.getByRole('button', { name: 'Replay animation' }).click();
  await expect(stage).toHaveAttribute('data-phase', 'turbine');
  await expect(stage).toHaveAttribute('data-phase', 'detail', {
    timeout: 5000,
  });
  await expect(stage).toHaveAttribute('data-phase', 'drawing', {
    timeout: 10000,
  });
  await page.getByRole('button', { name: 'Replay animation' }).click();
  await expect(stage).toHaveAttribute('data-phase', 'turbine');
});
