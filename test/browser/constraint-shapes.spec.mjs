import { test, expect } from '@playwright/test';

test.use({ launchOptions: { executablePath: process.env.DRAWMOTIVE_CHROMIUM_PATH } });

test('the default drawing toolbar exposes the constraint shapes', async ({ page }) => {
  await page.goto('/test/browser/ui-harness.html');
  await page.evaluate(() => instances.push(mount()));
  const toolbar = page.getByTestId('drawing-toolbar');
  for (const label of ['Capsule', 'Star', 'Cloud']) {
    const button = toolbar.getByRole('button', { name: label, exact: true });
    await expect(button).toBeVisible({ timeout: 2000 });
    await expect(button.locator('svg')).toHaveCount(1);
  }
});

test('constraint shapes in corner regions respect editing permissions and selected state', async ({ page }) => {
  await page.goto('/test/browser/ui-harness.html');
  await page.evaluate(() => instances.push(mount({
    regions: { topLeft: { items: ['capsule', 'star', 'cloud'] } },
    drawingToolbar: false,
  })));
  for (const [tool, label] of [['capsule', 'Capsule'], ['star', 'Star'], ['cloud', 'Cloud']]) {
    const button = page.getByRole('button', { name: label, exact: true });
    await expect(button).toBeEnabled({ timeout: 2000 });
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    expect(await page.evaluate(() => instances[0].calls.at(-1))).toEqual({ method: 'setTool', args: [tool] });
    await page.evaluate(tool => instances[0].setState({ tool }), tool);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    for (const state of [{ editingEnabled: false }, { health: 'faulted' }, { busy: true }]) {
      await page.evaluate(state => instances[0].setState(state), state);
      await expect(button).toBeDisabled();
      await page.evaluate(() => instances[0].setState({ editingEnabled: true, health: 'healthy', busy: false }));
      await expect(button).toBeEnabled();
    }
  }
});

test('a pending shape command preserves the SDK receiver and blocks other shape commands', async ({ page }) => {
  await page.goto('/test/browser/ui-harness.html');
  await page.evaluate(() => {
    const instance = mount({ regions: { topLeft: { items: ['capsule', 'star', 'cloud'] } }, drawingToolbar: false });
    const setTool = instance.editor.setTool;
    instance.editor.setTool = async function (...args) {
      if (this !== instance.editor) throw new Error('The editor must own its tool command');
      await setTool.apply(this, args);
      await new Promise(resolve => { instance.finishTool = resolve; });
    };
    instances.push(instance);
  });
  const capsule = page.getByRole('button', { name: 'Capsule', exact: true });
  await expect(capsule).toBeEnabled({ timeout: 2000 });
  await capsule.click();
  for (const label of ['Capsule', 'Star', 'Cloud']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeDisabled();
  }
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.evaluate(() => instances[0].finishTool());
  for (const label of ['Capsule', 'Star', 'Cloud']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeEnabled();
  }
});

test('constraint shapes honor per-button visibility and configured toolbar order', async ({ page }) => {
  await page.goto('/test/browser/ui-harness.html');
  await page.evaluate(() => instances.push(mount({
    buttons: { star: false },
    drawingToolbar: { tools: ['cloud', 'star', 'capsule'] },
  })));
  const toolbar = page.getByTestId('drawing-toolbar');
  await expect(toolbar.getByRole('button')).toHaveCount(2, { timeout: 2000 });
  await expect(toolbar.getByRole('button').nth(0)).toHaveAttribute('aria-label', 'Cloud');
  await expect(toolbar.getByRole('button').nth(1)).toHaveAttribute('aria-label', 'Capsule');
  await expect(page.getByRole('button', { name: 'Star', exact: true })).toHaveCount(0);
});

for (const [tool, label] of [['capsule', 'Capsule'], ['star', 'Star'], ['cloud', 'Cloud']]) {
  test(label + ' crosses the public SDK boundary and becomes the selected tool', async ({ page }) => {
    await page.goto('/test/browser/host.html');
    await page.addStyleTag({ url: '/dist/standalone.css' });
    await page.route('**/stub-runtime/js/editor-canvas.js', route => route.fulfill({
      status: 200, contentType: 'text/javascript', body: 'export {mountCanvas} from "/test/browser/stub-runtime.js";',
    }));
    await page.evaluate(async () => {
      const { createEditor } = await import('/sdk/src/index.js');
      const container = document.createElement('div'); container.className = 'editor'; document.body.append(container);
      globalThis.editor = await createEditor({ container, assetBaseUrl: new URL('/stub-runtime/', location.href) });
      const { mountEditorUi } = await import('/dist/standalone.js');
      mountEditorUi({ editor, container });
    });
    const button = page.getByRole('button', { name: label, exact: true });
    await expect(button).toBeVisible({ timeout: 2000 });
    await button.click();
    await expect.poll(() => page.evaluate(async () => (await editor.getState()).tool)).toBe(tool);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.evaluate(() => editor.dispose());
  });
}
