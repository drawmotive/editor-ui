import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 30_000 });
test.use({ launchOptions: { executablePath: process.env.DRAWMOTIVE_CHROMIUM_PATH } });
const search = page => page.getByRole('combobox', { name: 'Search objects' });
const dialog = page => page.getByRole('dialog', { name: 'Quick insert' });

test.beforeEach(async ({ page }) => {
  // The preview and all artwork must remain usable without a third-party network.
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/test/browser/quick-insert-preview.html');
  await page.getByRole('button', {name:'Open quick insert'}).click();
  await expect(search(page)).toBeFocused({timeout:5000});
});

test('real picker previews native objects first and searches CDN across provider grids', async ({ page }, testInfo) => {
  await expect(page.getByRole('listbox').getByRole('group').first().getByRole('option')).toHaveText(['Arrow','Rectangle','Ellipse','Diamond','Text']);
  await search(page).fill('CDN');
  await expect(dialog(page).getByRole('option')).toHaveCount(6);
  await expect(page.getByRole('group', {name:'AWS',exact:true}).getByRole('option')).toHaveText(['CloudFront','Edge location','Distribution']);
  await expect(page.getByRole('group', {name:'Azure',exact:true}).getByRole('option')).toHaveText(['CDN profiles','Front Door']);
  await expect(page.getByRole('group', {name:'Google Cloud',exact:true}).getByRole('option')).toHaveText(['Cloud CDN']);
  await expect(dialog(page).locator('.dm-quick-insert-count')).toHaveText('6');
  await expect.poll(() => dialog(page).getByRole('option').locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  expect((await dialog(page).boundingBox()).height).toBeLessThan(260);
  await dialog(page).getByRole('option', {name:'Azure / Front Door',exact:true}).hover();
  await expect(dialog(page).locator('.dm-quick-insert-detail')).toHaveText('Azure / Front Door');
  await page.locator('.preview-stage').screenshot({path:testInfo.outputPath('compact-cdn-light.png')});
  await dialog(page).getByRole('option', {name:'Azure / Front Door',exact:true}).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Preview selection: Azure / Front Door');
  await expect(page.locator('.preview-stage canvas')).toBeFocused();
  await page.locator('.preview-stage canvas').press('/');
  await expect(page.getByRole('group', {name:'Recent',exact:true}).getByRole('option')).toHaveText(['Front Door']);
  await search(page).fill('google cdn');
  await search(page).press('Enter');
  await expect(page.getByRole('status')).toHaveText('Preview selection: Google Cloud / Cloud CDN');
});

test('short queries expose more candidates and all locally served icons load', async ({ page }) => {
  await expect(dialog(page).getByRole('option')).toHaveCount(29);
  await expect.poll(() => dialog(page).getByRole('option').locator('img').evaluateAll(images => images.length===24 && images.every(image => image.complete && image.naturalWidth>0))).toBe(true);
  await search(page).fill('c');
  const broad = await dialog(page).getByRole('option').count();
  expect(broad).toBeGreaterThanOrEqual(24);
  await search(page).fill('cl');
  expect(await dialog(page).getByRole('option').count()).toBeGreaterThanOrEqual(23);
  await search(page).fill('api');
  await expect(dialog(page).getByRole('option')).toHaveCount(4);
  await search(page).fill('cdn');
  await search(page).press('ArrowUp');
  await expect(dialog(page).getByRole('option', {selected:true})).toHaveAccessibleName('Google Cloud / Cloud CDN');
  await search(page).press('Enter');
  await expect(page.getByRole('status')).toHaveText('Preview selection: Google Cloud / Cloud CDN');
});

for (const width of [320,360,736]) for (const theme of ['light','dark']) test(
  'provider grids fit a ' + width + 'px container in ' + theme + ' mode', async ({ page }, testInfo) => {
    await page.getByRole('button', {name:'Close quick insert'}).click();
    await page.getByRole('combobox', {name:'Preview width'}).selectOption(String(width));
    await page.getByRole('combobox', {name:'Preview theme'}).selectOption(theme);
    await page.getByRole('button', {name:'Open quick insert'}).click();
    await expect(search(page)).toBeFocused();
    const stage = await page.locator('.preview-stage').boundingBox();
    for (const element of [dialog(page), search(page), dialog(page).locator('.dm-quick-insert-hint')]) {
      const bounds = await element.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(stage.x);
      expect(bounds.x+bounds.width).toBeLessThanOrEqual(stage.x+stage.width);
      expect(bounds.y+bounds.height).toBeLessThanOrEqual(stage.y+stage.height);
    }
    const results = dialog(page).locator('.dm-quick-insert-results');
    expect(await results.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    // Keyboard selection must scroll offscreen results into the bounded panel.
    await search(page).press('End');
    const last = dialog(page).getByRole('option', {selected:true});
    await expect(last).toHaveAccessibleName('Google Cloud / Cloud DNS');
    const cell = await last.boundingBox(), viewport = await results.boundingBox();
    expect(cell.y).toBeGreaterThanOrEqual(viewport.y);
    expect(cell.y+cell.height).toBeLessThanOrEqual(viewport.y+viewport.height);
    await search(page).fill('CDN');
    await expect(dialog(page).getByRole('option')).toHaveCount(6);
    await page.locator('.preview-stage').screenshot({path:testInfo.outputPath('compact-cdn-'+width+'-'+theme+'.png')});
  });
