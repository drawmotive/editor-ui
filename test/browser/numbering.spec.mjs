import { test, expect as playwrightExpect } from '@playwright/test';

const expect = playwrightExpect.configure({ timeout: 3000 });

test.use({ launchOptions: { executablePath: process.env.DRAWMOTIVE_CHROMIUM_PATH } });
test.beforeEach(async ({ page }) => {
  await page.goto('/test/browser/ui-harness.html');
  await page.waitForFunction(() => typeof mount === 'function');
  await page.evaluate(() => instances.push(mount()));
});

const calls = page => page.evaluate(() => instances[0].calls);
const numberingDialog = page => page.getByRole('dialog', { name: 'Numbering', exact: true });

async function openNumbering(page) {
  const button = page.getByRole('button', { name: 'Numbering', exact: true });
  await expect(button).toBeVisible();
  await button.click();
  return numberingDialog(page);
}

async function selectNumbered(page, kind, numbering, model = {}) {
  return page.evaluate(async ({ kind, numbering, model }) => {
    const instance = instances[0];
    instance.select(kind, { resolved: { numbering }, model });
    return (await instance.editor.getSelection()).token;
  }, { kind, numbering, model });
}

test('number editing shows the group prefix and submits only a valid local value', async ({ page }) => {
  const token = await selectNumbered(page, 'Shape', { number: 2, prefix: '2.3.', maximum: 4, drawingEnabled: true });
  const panel = await openNumbering(page);
  const input = panel.getByLabel('Local number', { exact: true });
  const apply = panel.getByRole('button', { name: 'Apply', exact: true });
  const prefix = panel.getByTestId('number-prefix');
  await expect(prefix).toBeVisible();
  await expect(prefix).toHaveText('2.3.');
  await expect(input).toHaveAccessibleDescription('Group prefix 2.3.');
  await expect(panel.getByText('Group prefix 2.3.', { exact: true })).toBeHidden();
  const prefixBounds = await prefix.boundingBox();
  const inputBounds = await input.boundingBox();
  expect(prefixBounds.x).toBeGreaterThan(inputBounds.x);
  expect(prefixBounds.y).toBeGreaterThan(inputBounds.y);
  expect(prefixBounds.y + prefixBounds.height).toBeLessThan(inputBounds.y + inputBounds.height);
  await expect(input).toHaveValue('2');
  await expect(apply).toBeDisabled();
  const clear = panel.getByRole('button', { name: 'Clear', exact: true });
  const applyBounds = await apply.boundingBox();
  const clearBounds = await clear.boundingBox();
  expect(clearBounds.x).toBeGreaterThan(applyBounds.x + applyBounds.width);
  await expect(clear).toHaveCSS('border-top-style', 'solid');
  for (const invalid of ['', '0', '5', '2.5']) {
    await input.fill(invalid);
    await expect(apply).toBeDisabled();
    await input.press('Enter');
  }
  expect(await calls(page)).toEqual([]);
  await input.fill('4');
  await input.press('Enter');
  await expect.poll(() => calls(page)).toEqual([
    { method: 'editScene', args: [{ revision: 'r0', description: 'Change badge number', token,
      changes: [{ itemId: 'Shape', op: 'call', path: ['setBadgeNumber'], arguments: [4] }] }] },
  ]);
  await expect(input).toHaveValue('4');
  await clear.click();
  await expect.poll(() => calls(page)).toEqual([
    { method: 'editScene', args: [{ revision: 'r0', description: 'Change badge number', token,
      changes: [{ itemId: 'Shape', op: 'call', path: ['setBadgeNumber'], arguments: [4] }] }] },
    { method: 'editScene', args: [{ revision: 'r1', description: 'Clear badge number', token,
      changes: [{ itemId: 'Shape', op: 'call', path: ['setBadgeNumber'], arguments: [null] }] }] },
  ]);
  await expect(input).toHaveValue('');
});

test('an eligible unnumbered shape accepts a manual number with automatic numbering off', async ({ page }) => {
  const token = await selectNumbered(page, 'Shape', { number: null, prefix: '', maximum: 1, drawingEnabled: false });
  const panel = await openNumbering(page);
  const input = panel.getByLabel('Local number', { exact: true });
  await expect(input).toHaveValue('');
  await expect(panel.getByRole('button', { name: 'Clear', exact: true })).toBeDisabled();
  const apply = panel.getByRole('button', { name: 'Apply', exact: true });
  await input.fill('2');
  await expect(apply).toBeDisabled();
  await input.fill('1');
  await apply.click();
  await expect.poll(() => calls(page)).toEqual([
    { method: 'editScene', args: [{ revision: 'r0', description: 'Change badge number', token,
      changes: [{ itemId: 'Shape', op: 'call', path: ['setBadgeNumber'], arguments: [1] }] }] },
  ]);
});

test('a sparse saved number remains readable and clearable outside the current edit range', async ({ page }) => {
  await selectNumbered(page, 'Shape', { number: 3, prefix: '', maximum: 1, drawingEnabled: true });
  const panel = await openNumbering(page);
  const input = panel.getByLabel('Local number', { exact: true });
  const error = panel.getByText('Enter a whole number from 1 to 1.', { exact: true });
  await expect(input).toHaveValue('3');
  await expect(error).toBeHidden();
  await expect(panel.getByRole('button', { name: 'Apply', exact: true })).toBeDisabled();
  const clear = panel.getByRole('button', { name: 'Clear', exact: true });
  await expect(clear).toBeEnabled();
  await input.fill('2');
  await expect(error).toBeVisible();
  await clear.click();
  await expect(input).toHaveValue('');
});

test('number editing waits for a selection snapshot at the current revision', async ({ page }) => {
  await selectNumbered(page, 'Shape', { number: 2, prefix: '3.', maximum: 4, drawingEnabled: true });
  const panel = await openNumbering(page);
  const input = panel.getByLabel('Local number', { exact: true });
  await input.fill('4');
  await page.evaluate(() => instances[0].setState({ revision: 'r1' }));
  await expect(input).toBeDisabled();
  expect(await calls(page)).toEqual([]);
  await selectNumbered(page, 'Shape', { number: 1, prefix: '2.', maximum: 2, drawingEnabled: true });
  await expect(panel).toBeHidden();
  const fresh = await openNumbering(page);
  await expect(fresh.getByLabel('Local number', { exact: true })).toHaveValue('1');
});

test('drawing numbering uses saved metadata and resets only direct members', async ({ page }) => {
  await page.evaluate(() => instances[0].setDrawingAutoNumber(false));
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const drawing = page.getByRole('region', { name: 'Drawing', exact: true });
  const automatic = drawing.getByRole('checkbox', { name: 'Automatic numbering in this diagram', exact: true });
  const descendants = drawing.getByRole('checkbox', { name: 'Include group descendants', exact: true });
  const reset = drawing.getByRole('button', { name: 'Reset numbering', exact: true });
  await expect(automatic).toBeEnabled();
  await expect(automatic).not.toBeChecked();
  await automatic.check();
  await expect(automatic).toBeChecked();
  await expect(descendants).toHaveCount(0);
  await expect(reset).toHaveCSS('border-top-style', 'solid');
  await reset.click();
  await expect.poll(() => calls(page)).toEqual([
    { method: 'editScene', args: [{ revision: 'r1', description: 'Change automatic numbering',
      changes: [{ path: ['autoNumber'], value: true }] }] },
    { method: 'editScene', args: [{ revision: 'r2', description: 'Reset numbering',
      changes: [{ op: 'call', path: ['resetNumbering'], arguments: [false] }] }] },
  ]);
});

test('group numbering exposes three saved modes and resets its own scope', async ({ page }) => {
  const token = await selectNumbered(page, 'Group', { number: null, prefix: '', maximum: 1, drawingEnabled: false },
    { autoNumber: false, autoNumberMode: 'Inherit' });
  const panel = await openNumbering(page);
  const automatic = panel.getByRole('combobox', { name: 'Automatic numbering in group', exact: true });
  await expect(automatic).toHaveValue('Inherit');
  await expect(automatic.getByRole('option')).toHaveText(['Enable', 'Disable', 'Inherit parent']);
  await automatic.selectOption('Enable');
  await automatic.selectOption('Disable');
  await automatic.selectOption('Inherit');
  await expect(panel.getByRole('checkbox', { name: 'Include group descendants', exact: true })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Reset numbering', exact: true }).click();
  await expect.poll(() => calls(page)).toEqual([
    ...['Enable', 'Disable', 'Inherit'].map((value, index) => ({ method: 'editScene', args: [{ revision: 'r' + index,
      description: 'Change group automatic numbering', token, changes: [{ itemId: 'Group', path: ['autoNumberMode'], value }] }] })),
    { method: 'editScene', args: [{ revision: 'r3', description: 'Reset group numbering', token,
      changes: [{ itemId: 'Group', op: 'call', path: ['resetNumbering'], arguments: [false] }] }] },
  ]);
});

test('group numbering retains the Boolean control for an older runtime', async ({ page }) => {
  const token = await selectNumbered(page, 'Group', { number: null, prefix: '', maximum: 1, drawingEnabled: false },
    { autoNumber: true });
  const panel = await openNumbering(page);
  const automatic = panel.getByRole('checkbox', { name: 'Automatic numbering in group', exact: true });
  await expect(automatic).toBeChecked();
  await automatic.uncheck();
  await expect(automatic).not.toBeChecked();
  await expect.poll(() => calls(page)).toEqual([
    { method: 'editScene', args: [{ revision: 'r0', description: 'Change group automatic numbering', token,
      changes: [{ itemId: 'Group', path: ['autoNumber'], value: false }] }] },
  ]);
});

test('numbering controls stay hidden when the runtime omits numbering metadata', async ({ page }) => {
  await page.evaluate(() => instances[0].select('Group'));
  await expect(page.getByTestId('context-toolbar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Numbering', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const drawing = page.getByRole('region', { name: 'Drawing', exact: true });
  await expect(drawing.getByLabel('Theme', { exact: true })).toBeEnabled();
  await expect(drawing.getByRole('checkbox', { name: 'Automatic numbering in this diagram', exact: true })).toHaveCount(0);
  await expect(drawing.getByRole('button', { name: 'Reset numbering', exact: true })).toHaveCount(0);
});
