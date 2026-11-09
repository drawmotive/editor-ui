import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 30_000 });
test.use({ launchOptions: { executablePath: process.env.DRAWMOTIVE_CHROMIUM_PATH } });
test.beforeEach(async ({ page }) => {
  await page.goto('/test/browser/ui-harness.html');
  await page.waitForFunction(() => typeof mount === 'function');
  await mount(page);
});
async function mount(page, options = {}) {
  await page.evaluate(options => {
    instances.push(mount(options));
    instances.at(-1).root.querySelector('canvas').tabIndex = 0;
  }, options);
  await expect(page.getByTestId('drawing-toolbar').last()).toBeVisible();
}
const canvas = page => page.locator('.drawmotive-canvas-host canvas').first();
const search = page => page.getByRole('combobox', { name: 'Search objects' });
const dialog = page => page.getByRole('dialog', { name: 'Quick insert' });
const calls = page => page.evaluate(() => instances[0].calls);
async function open(page) {
  await canvas(page).press('/');
  await expect(search(page)).toBeFocused({ timeout: 5000 });
}

test('built-in objects occupy an unnamed first grid row with full selection details', async ({ page }) => {
  await open(page);
  const firstGroup = page.getByRole('listbox').getByRole('group').first();
  await expect(firstGroup.getByRole('option')).toHaveText(['Arrow', 'Rectangle', 'Ellipse', 'Diamond', 'Text']);
  await expect(firstGroup.locator('.dm-quick-insert-group-label, .dm-panel-heading')).toHaveCount(0);
  const cells = await firstGroup.getByRole('option').evaluateAll(nodes => nodes.map(node => {
    const {x,y,width,height}=node.getBoundingClientRect();return {x,y,width,height};
  }));
  expect(new Set(cells.map(cell => cell.y)).size).toBe(1);
  expect(cells.every(cell => cell.width < 90 && cell.height <= 56)).toBe(true);
  expect((await dialog(page).boundingBox()).height).toBeLessThan(150);
  const rectangle = firstGroup.getByRole('option', {name:'Rectangle',exact:true});
  await expect(rectangle).toHaveAttribute('title', 'Rectangle (R)');
  await rectangle.hover();
  await expect(dialog(page).locator('.dm-quick-insert-detail')).toHaveText('Rectangle');
  await expect(search(page)).toBeFocused();
  await search(page).press('Home');
  await expect(firstGroup.getByRole('option', {selected:true})).toHaveText('Arrow');
  await search(page).press('End');
  await expect(firstGroup.getByRole('option', {selected:true})).toHaveText('Text');
  await page.getByRole('button', {name:'Close quick insert'}).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(canvas(page)).toBeFocused();
});

test('slash opens search and aliases activate the existing placement tool', async ({ page }) => {
  await open(page);
  await search(page).fill('  BOX  ');
  await expect(page.getByRole('option')).toHaveCount(1);
  await expect(page.getByRole('option')).toHaveText(/Rectangle/);
  await search(page).press('Enter');
  await expect(dialog(page)).toHaveCount(0);
  await expect(canvas(page)).toBeFocused();
  expect(await calls(page)).toEqual([{ method: 'setTool', args: ['rectangle'] }]);
});

test('arrow navigation wraps, empty results do nothing and Escape only closes the palette', async ({ page }) => {
  await open(page);
  await search(page).press('ArrowUp');
  await expect(page.getByRole('option', { selected: true })).toContainText('Text');
  await search(page).press('ArrowDown');
  await expect(page.getByRole('option', { selected: true })).toContainText('Arrow');
  await search(page).fill('does not exist');
  await expect(page.getByRole('option')).toHaveCount(0);
  await expect(dialog(page)).toContainText('No objects found');
  await search(page).press('Enter');
  await expect(dialog(page)).toBeVisible();
  await search(page).press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(canvas(page)).toBeFocused();
  expect(await calls(page)).toEqual([]);
});

test('pointer selection, toolbar and letter shortcuts share persisted recent and frequent usage', async ({ page }) => {
  await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
  await canvas(page).press('r');
  await canvas(page).press('o');
  await open(page);
  await expect(page.getByRole('group', { name: 'Recent', exact: true }).getByRole('option')).toHaveText([/Ellipse/, /Rectangle/]);
  await expect(page.getByRole('group', { name: 'Frequently used' }).getByRole('option')).toHaveText([/Rectangle/]);
  await search(page).fill('decision');
  await page.getByRole('option', { name: /Diamond/ }).click();
  await expect(canvas(page)).toBeFocused();
  await page.reload();
  await page.waitForFunction(() => typeof mount === 'function');
  await mount(page);
  await open(page);
  await expect(page.getByRole('group', { name: 'Recent', exact: true }).getByRole('option').first()).toContainText('Diamond');
  await expect(page.getByRole('group', { name: 'Frequently used' }).getByRole('option').first()).toContainText('Rectangle');
});

test('text inputs, foreign canvases, modified keys and IME retain their slash input', async ({ page }) => {
  await page.evaluate(() => {
    for (const tag of ['input', 'textarea', 'canvas']) {
      const element = document.createElement(tag); element.id = 'foreign-' + tag; element.tabIndex = 0; document.body.append(element);
    }
    const inline = document.createElement('div'); inline.contentEditable = 'true'; inline.dataset.testid = 'd-canvas-content-editable';
    instances[0].root.querySelector('.drawmotive-canvas-host').append(inline);
  });
  for (const target of ['#foreign-input', '#foreign-textarea', '#foreign-canvas', '[data-testid=d-canvas-content-editable]'])
    await page.locator(target).press('/');
  await expect(page.locator('#foreign-input')).toHaveValue('/');
  await expect(page.getByTestId('d-canvas-content-editable')).toHaveText('/');
  for (const extra of [{ctrlKey:true}, {metaKey:true}, {altKey:true}, {shiftKey:true}, {isComposing:true}, {keyCode:229}, {key:':'}]) {
    const allowed = await canvas(page).evaluate((target, extra) => target.dispatchEvent(new KeyboardEvent('keydown', {
      key:'/', code:'Slash', bubbles:true, cancelable:true, ...extra,
    })), extra);
    expect(allowed).toBe(true);
  }
  await expect(dialog(page)).toHaveCount(0);
  expect(await calls(page)).toEqual([]);
});

test('state guards and pointer ownership prevent opening and disabled objects are absent', async ({ page }) => {
  for (const state of [{editingEnabled:false}, {editingEnabled:true,busy:true}, {busy:false,health:'faulted'}]) {
    await page.evaluate(value => instances[0].setState(value), state);
    await canvas(page).press('/');
    await expect(dialog(page)).toHaveCount(0);
  }
  await page.evaluate(() => instances[0].setState({health:'healthy'}));
  await canvas(page).dispatchEvent('pointerdown', {buttons:1});
  await canvas(page).press('/');
  await expect(dialog(page)).toHaveCount(0);
  await canvas(page).dispatchEvent('pointerup', {buttons:0});
  await page.evaluate(() => {instances[0].view.dispose();instances[0].root.remove();instances=[];});
  await mount(page, {buttons:{text:false}});
  await open(page);
  await search(page).fill('text');
  await expect(page.getByRole('option')).toHaveCount(0);
  await page.evaluate(() => instances[0].setState({editingEnabled:false}));
  await expect(dialog(page)).toHaveCount(0);
});

test('failed and pending tool commands never add phantom usage', async ({ page }) => {
  await page.evaluate(() => instances[0].setFailure({code:'Unavailable',message:'Tool unavailable'}));
  await open(page);
  await search(page).fill('rectangle');
  await search(page).press('Enter');
  await expect(page.getByRole('alert')).toContainText('Tool unavailable');
  await page.evaluate(() => instances[0].setFailure(null));
  if (await dialog(page).count()) await search(page).press('Escape');
  await open(page);
  await expect(page.getByRole('group', { name:'Recent', exact:true })).toHaveCount(0);
  await search(page).press('Escape');
  await page.evaluate(() => {instances[0].editor.setTool=()=>new Promise(resolve=>globalThis.finishTool=resolve);});
  await page.getByRole('button', { name:'Rectangle', exact:true }).click();
  await canvas(page).press('/');
  await expect(dialog(page)).toHaveCount(0);
  await page.evaluate(() => finishTool());
});

test('a delayed failed tool command retains search focus and keyboard dismissal', async ({ page }) => {
  await page.evaluate(() => {instances[0].editor.setTool=()=>new Promise((_resolve,reject)=>globalThis.rejectTool=reject);});
  await open(page);
  await search(page).fill('rectangle');
  await search(page).press('Enter');
  await expect(page.getByRole('option')).toBeDisabled();
  await page.evaluate(() => rejectTool(new Error('Delayed tool failure')));
  await expect(page.getByRole('alert')).toContainText('Delayed tool failure');
  await expect(search(page)).toBeFocused({timeout:2000});
  await search(page).press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(canvas(page)).toBeFocused();
});

test('outside dismissal and multiple editors preserve owning focus and disposal removes the palette', async ({ page }) => {
  await open(page);
  await page.locator('.dm-quick-insert-backdrop').click({position:{x:4,y:4}});
  await expect(dialog(page)).toHaveCount(0);
  await expect(canvas(page)).toBeFocused();
  await mount(page);
  await page.locator('.drawmotive-canvas-host canvas').last().press('/');
  await expect(dialog(page)).toHaveCount(1);
  await search(page).press('Escape');
  await expect(page.locator('.drawmotive-canvas-host canvas').last()).toBeFocused();
  await page.locator('.drawmotive-canvas-host canvas').last().press('/');
  await page.evaluate(() => instances[1].editor.dispose());
  await expect(dialog(page)).toHaveCount(0);
});

for (const darkTheme of [false, true]) test(`quick insert fits a small container in ${darkTheme?'dark':'light'} mode`, async ({ page }, testInfo) => {
  await page.evaluate(async darkTheme => {
    instances[0].root.style.cssText='width:360px;height:340px';
    await instances[0].editor.setPreferences({darkTheme});
  }, darkTheme);
  await page.getByRole('button', { name:'Rectangle', exact:true }).click();
  await canvas(page).press('r');
  await canvas(page).press('o');
  await open(page);
  const rootBounds=await page.locator('.editor').boundingBox(),bounds=await dialog(page).boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(rootBounds.x);
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(rootBounds.x+rootBounds.width);
  expect(bounds.y+bounds.height).toBeLessThanOrEqual(rootBounds.y+rootBounds.height);
  await page.locator('.editor').screenshot({path:testInfo.outputPath(`quick-insert-${darkTheme?'dark':'light'}.png`)});
  await search(page).fill('text');
  await expect(page.getByRole('option', {selected:true})).toContainText('Text');
  await search(page).press('Enter');
  await expect(dialog(page)).toHaveCount(0);
  expect((await calls(page)).at(-1)).toEqual({method:'setTool',args:['text']});
});
