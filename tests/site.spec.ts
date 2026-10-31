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

test('section anchors land below the sticky header', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('./');
    for (const id of ['viewer', 'mark', 'present', 'edit-pdf', 'image', 'vector', 'convert', 'platforms']) {
      await page.evaluate((i) => {
        location.hash = i;
      }, id);
      await expect
        .poll(() =>
          page.evaluate((i) => {
            const header = document.querySelector('.nav-wrap')!.getBoundingClientRect().bottom;
            const section = document.getElementById(i)!;
            const first = section.querySelector('.section-tag, h2')!.getBoundingClientRect();
            return first.top >= header + 8 && first.top < header + 160;
          }, id),
        )
        .toBe(true);
    }
  }
});
test('every comment on the slide has its numbered callout on the drawing', async ({ page, request, baseURL }) => {
  const review = (await import('../src/data/review.json', { with: { type: 'json' } })).default;
  await page.goto('./');
  await page.locator('[data-review-step="3"]').click();
  const numbers = page.locator('.review-sheet .m-pop text');
  await expect(numbers).toHaveText(['1', '2', '3']);
  await expect(page.locator('.review-notes li')).toHaveText(review.bubbles.map((b) => new RegExp(`${b.number}\\s*${b.comment}`)));
  expect(review.slide.comments).toEqual(review.bubbles.map((b) => `${b.number}. ${b.comment}`));
  // The app's style: a red ring and a black number.
  const bubble = await page.locator('.review-sheet .m-pop circle').first().evaluate((c) => [c.getAttribute('stroke'), c.getAttribute('fill')]);
  expect(bubble).toEqual(['#e81a1e', '#fff']);
  await page.locator('[data-review-step="5"]').click();
  await expect(page.locator('.review-slide')).toHaveCSS('opacity', '1');
  await expect(page.locator('.review-slide-comments p')).toHaveText(review.slide.comments);
  const href = await page.locator('a[href$="blade-review.pptx"]').getAttribute('href');
  expect((await request.get(new URL(href!, baseURL).href)).status()).toBe(200);
});
test('callouts stay on the drawing at every width', async ({ page }) => {
  const review = (await import('../src/data/review.json', { with: { type: 'json' } })).default;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    await page.locator('[data-review-step="3"]').click();
    const sheet = page.locator('.review-sheet svg');
    await sheet.scrollIntoViewIfNeeded();
    const places = await sheet.evaluate((svg) => {
      const box = svg.getBoundingClientRect();
      return [...svg.querySelectorAll('.m-pop circle')].map((c) => {
        const r = c.getBoundingClientRect();
        return [((r.left + r.width / 2 - box.left) / box.width) * 820, ((r.top + r.height / 2 - box.top) / box.height) * 540];
      });
    });
    review.bubbles.forEach((b, i) => {
      expect(Math.abs(places[i][0] - b.x)).toBeLessThan(3);
      expect(Math.abs(places[i][1] - b.y)).toBeLessThan(3);
    });
  }
});
test('the opening drawing is marked up without the 3D scene', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('[data-assembly]')).toHaveAttribute('data-state', 'sheet');
  await expect(page.locator('[data-assembly]')).toHaveAttribute('data-phase', 'drawing');
  await expect(page.locator('.blade-sheet .m-pop')).toHaveCount(3);
  await expect(page.locator('.blade-sheet .m-pop').first()).toHaveCSS('opacity', '1');
});
test('download page: Apple Silicon 2.3.0, Universal stays Coming soon', async ({ page, baseURL }) => {
  const release = (await import('../src/data/release.json', { with: { type: 'json' } })).default;
  const mac = release.editions.find((e) => e.id === 'macos-apple-silicon')!;
  await page.goto(new URL('download/', baseURL).href);
  const universal = page.locator('.edition-picker:not(.compact) [data-edition="macos-universal"]');
  await expect(universal).toContainText('One application for both Intel and Apple Silicon Macs.');
  await expect(universal.locator('.status')).toHaveText('Coming soon');
  await expect(universal.locator('a')).toHaveCount(0);
  expect(mac.version).toBe('2.3.0');
  expect(mac.url).toBe('https://github.com/ca-works/eng-drawing-viewer/releases/download/v2.3.0/ENG-Drawing-Viewer-macOS-Apple-Silicon.dmg');
  const card = page.locator('.edition-picker:not(.compact) [data-edition="macos-apple-silicon"]');
  await expect(card.locator('a.download-button')).toHaveAttribute('href', mac.url!);
  await expect(card).toContainText('118.1 MB');
});
test('screenshots enlarge and close again', async ({ page }) => {
  await page.goto('./');
  const zoom = page.locator('#image [data-zoom]');
  await zoom.scrollIntoViewIfNeeded();
  await zoom.click();
  await expect(page.locator('#lightbox')).toBeVisible();
  await expect(page.locator('#lightbox img')).toHaveAttribute('src', /.+/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#lightbox')).not.toBeVisible();
});
test('the trace steps show the real point counts', async ({ page }) => {
  const demo = (await import('../src/data/demo.json', { with: { type: 'json' } })).default;
  await page.goto('./');
  await page.locator('[data-trace-step="3"]').click();
  await expect(page.locator('[data-trace-count]')).toHaveText(demo.trace.raw_nodes.toLocaleString('en-GB'));
  await page.locator('[data-trace-step="6"]').click();
  await expect(page.locator('[data-trace-count]')).toHaveText(String(demo.trace.nodes));
  await expect(page.locator('.trace-nodes circle')).toHaveCount(demo.trace.nodes);
});
