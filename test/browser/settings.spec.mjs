import {test,expect} from '@playwright/test';
test.use({launchOptions:{executablePath:process.env.DRAWMOTIVE_CHROMIUM_PATH}});
test.beforeEach(async({page})=>{
 await page.goto('/test/browser/ui-harness.html');
 await page.waitForFunction(()=>typeof mount==='function');
});

test('one Settings panel separates local view preferences from saved drawing edits',async({page})=>{
 await page.evaluate(()=>instances.push(mount()));
 await expect(page.getByRole('button',{name:'Drawing properties',exact:true})).toHaveCount(0,{timeout:2000});
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const panel=page.getByRole('dialog',{name:'Settings',exact:true});
 const view=panel.getByRole('region',{name:'View',exact:true});
 const drawing=panel.getByRole('region',{name:'Drawing',exact:true});
 await expect(view).toContainText('Only on this device.');
 await expect(drawing).toContainText('Saved with this drawing.');
 await expect(drawing.getByLabel('Theme',{exact:true})).toBeEnabled();
 await view.getByLabel('Dark Theme',{exact:true}).check();
 await view.getByLabel('Show and Snap to Grid',{exact:true}).uncheck();
 expect(await page.evaluate(()=>instances[0].calls)).toEqual([
  {method:'setPreferences',args:[{darkTheme:true}]},
  {method:'setPreferences',args:[{showGrid:false,snapToGrid:false}]},
 ]);
 await expect(drawing.getByLabel('Theme',{exact:true})).toHaveValue('default');
 await drawing.getByLabel('Theme',{exact:true}).selectOption('minimal');
 await expect(drawing.getByLabel('Theme',{exact:true})).toHaveValue('minimal');
 expect(await page.evaluate(()=>instances[0].calls.at(-1))).toEqual({method:'editScene',args:[{
  revision:'r0',description:'Change drawing theme',changes:[{path:['theme'],value:'minimal'}],
 }]});
 await expect(view.getByLabel('Dark Theme',{exact:true})).toBeChecked();
 await expect(view.getByLabel('Show and Snap to Grid',{exact:true})).not.toBeChecked();
 await page.evaluate(()=>instances[0].select());
 await expect(panel).toBeVisible();
});

test('legacy configured drawing properties open the same Settings sections',async({page})=>{
 await page.evaluate(()=>instances.push(mount({regions:{bottomRight:{items:['drawingProperties']}}})));
 await page.getByRole('button',{name:'Settings',exact:true}).click({timeout:2000});
 const panel=page.getByRole('dialog',{name:'Settings',exact:true});
 await expect(panel.getByRole('region',{name:'View',exact:true})).toBeVisible();
 await expect(panel.getByRole('region',{name:'Drawing',exact:true})).toBeVisible();
});

test('read-only drawings keep local view preferences available',async({page})=>{
 await page.evaluate(()=>{instances.push(mount());instances[0].setState({editingEnabled:false});});
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const theme=page.getByLabel('Theme',{exact:true});
 await expect(theme).toBeDisabled({timeout:2000});
 await page.getByLabel('Dark Theme',{exact:true}).check();
 expect(await page.evaluate(()=>instances[0].calls)).toEqual([{method:'setPreferences',args:[{darkTheme:true}]}]);
 await expect(theme).toBeDisabled();
});

for(const darkTheme of [false,true]) test('all Settings fields remain reachable in a short narrow '+(darkTheme?'dark':'light')+' editor',async({page})=>{
 await page.setViewportSize({width:260,height:360});
 await page.evaluate(dark=>{
  instances.push(mount());const instance=instances[0];instance.root.style.cssText='width:100vw;height:100vh';
  if(dark)void instance.editor.setPreferences({darkTheme:true});
 },darkTheme);
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const panel=page.getByRole('dialog',{name:'Settings',exact:true});
 await expect(page.getByLabel('Drawing style',{exact:true})).toBeEnabled({timeout:2000});
 for(const field of ['Dark Theme','Show and Snap to Grid','Theme','Drawing style']){
  const control=panel.getByLabel(field,{exact:true});await control.scrollIntoViewIfNeeded();
  expect(await control.evaluate(node=>{const box=node.getBoundingClientRect();return box.left>=0&&box.right<=innerWidth&&box.top>=0&&box.bottom<=innerHeight;})).toBe(true);
 }
 await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeFocused();
});
