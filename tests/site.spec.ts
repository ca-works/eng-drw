import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const routes = [
  '',
  'features/',
  'download/',
  'changelog/',
  'support/',
  'privacy/',
  'about/',
];
for (const route of routes)
  test(`${route || 'home'} renders with valid links and no errors`, async ({
    page,
    baseURL,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const res = await page.goto(new URL(route, baseURL).href);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveTitle(/ENG Drawing Viewer/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    for (const href of await page
      .locator('a[href^="/"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href'))))
      expect(href).toMatch(/^\/eng-drw\//);
    expect(errors).toEqual([]);
  });
test('download buttons match the verified release data', async ({ page, baseURL }) => {
  const release = (await import('../src/data/release.json', { with: { type: 'json' } })).default;
  await page.goto(new URL('download/', baseURL).href);
  // Exactly four editions, in order, each either a verified download or "Coming soon".
  const cards = page.locator('.edition-picker:not(.compact) .download-card');
  await expect(cards).toHaveCount(4);
  expect(await cards.evaluateAll((c) => c.map((x) => (x as HTMLElement).dataset.edition))).toEqual([
    'macos-universal',
    'macos-apple-silicon',
    'windows-x64',
    'linux-x86_64',
  ]);
  const verified = [
    ...release.editions.flatMap((e) => (e.available ? [e.url!, ...(e.extras ?? []).map((x) => x.url)] : [])),
    ...(release.source ? [release.source.url] : []),
  ];
  const hrefs = await page
    .locator('a[href*="releases/download/"]')
    .evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
  expect([...new Set(hrefs)].sort()).toEqual(verified.sort());
  for (const e of release.editions) {
    const card = page.locator(`.edition-picker:not(.compact) [data-edition="${e.id}"]`);
    if (!e.available) {
      await expect(card.locator('.status')).toHaveText('Coming soon');
      await expect(card.locator('a[href*="releases/download/"]')).toHaveCount(0);
      continue;
    }
    await expect(card.getByText(e.sha256!)).toHaveCount(1);
    await expect(card.locator('.preview-badge')).toHaveCount(e.preview ? 1 : 0);
  }
});
test('MARK callout, comment, undo and redo', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-tool="bubble"]').click();
  const sheet = page.locator('.mark-sheet');
  await sheet.scrollIntoViewIfNeeded();
  await sheet.click({ position: { x: 130, y: 150 } });
  await expect(
    page.getByRole('textbox', { name: 'Comment 1', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Comment 1', exact: true })
    .fill('Check the bolt circle');
  await page.locator('[data-undo]').click();
  await expect(
    page.getByRole('textbox', { name: 'Comment 1', exact: true }),
  ).toHaveValue('');
  await page.locator('[data-undo]').click();
  await expect(page.locator('[data-comments] li')).toHaveCount(0);
  await page.locator('[data-redo]').click();
  await expect(page.locator('[data-comments] li')).toHaveCount(1);
});
test('theme persists across pages', async ({ page, baseURL }) => {
  await page.goto('./');
  await page.locator('[data-theme-toggle]').click();
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.goto(new URL('features/', baseURL).href);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme!);
});
test('mobile menu traps focus and closes with Escape', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'mobile layout');
  await page.goto('./');
  await page.locator('.menu-button').click();
  await expect(page.locator('#mobile-menu')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  expect(
    await page.evaluate(() => !!document.activeElement?.closest('dialog')),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-menu')).not.toBeVisible();
  await expect(page.locator('.menu-button')).toBeFocused();
});
test('accessible page has no serious or critical axe findings', async ({
  page,
}) => {
  await page.goto('./');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#mark').scrollIntoViewIfNeeded();
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact || ''),
    ),
  ).toEqual([]);
});
for (const theme of ['light', 'dark'] as const)
  test(`responsive ${theme} reduced-motion layout`, async ({
    page,
    baseURL,
  }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    for (const width of [360, 390, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(new URL('', baseURL).href);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
  });
