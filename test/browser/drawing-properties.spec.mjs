import {test,expect} from '@playwright/test';
test.use({launchOptions:{executablePath:process.env.DRAWMOTIVE_CHROMIUM_PATH}});
test.beforeEach(async({page})=>{
 await page.goto('/test/browser/ui-harness.html');
 await page.waitForFunction(()=>typeof mount==='function');
 await page.evaluate(()=>instances.push(mount()));
});

test('drawing properties edit document metadata and keep editor preferences separate',async({page})=>{
 await page.getByRole('button',{name:'Drawing properties',exact:true}).click();
 const panel=page.getByRole('dialog',{name:'Drawing properties',exact:true});
 await expect(panel.getByLabel('Theme',{exact:true})).toHaveValue('default');
 await panel.getByLabel('Theme',{exact:true}).selectOption('minimal');
 await expect(panel.getByLabel('Theme',{exact:true})).toHaveValue('minimal');
 await panel.getByLabel('Drawing style',{exact:true}).selectOption('1');
 await expect(panel.getByLabel('Drawing style',{exact:true})).toHaveValue('1');
 const edits=await page.evaluate(()=>instances[0].calls);
 expect(edits).toEqual([
  {method:'editScene',args:[{revision:'r0',description:'Change drawing theme',changes:[{path:['theme'],value:'minimal'}]}]},
  {method:'editScene',args:[{revision:'r1',description:'Change drawing style',changes:[{path:['style'],value:1}]}]},
 ]);
 await page.evaluate(()=>instances[0].updateDrawing('default',0));
 await expect(panel.getByLabel('Theme',{exact:true})).toHaveValue('default');
 await expect(panel.getByLabel('Drawing style',{exact:true})).toHaveValue('0');
 await page.evaluate(()=>instances[0].select());
 await expect(panel).toBeVisible();
});

test('document properties disable edits while pending and in read-only documents',async({page})=>{
 await page.evaluate(()=>{const instance=instances[0],edit=instance.editor.editScene;instance.editor.editScene=async value=>{await edit(value);await new Promise(resolve=>instance.finishEdit=resolve);};});
 const trigger=page.getByRole('button',{name:'Drawing properties',exact:true});await trigger.click();
 const theme=page.getByLabel('Theme',{exact:true}),style=page.getByLabel('Drawing style',{exact:true});
 await theme.selectOption('minimal');await expect(style).toBeDisabled();
 await page.evaluate(()=>instances[0].finishEdit());await expect(style).toBeEnabled();
 await page.evaluate(()=>instances[0].setState({editingEnabled:false}));
 await expect(theme).toBeDisabled();await expect(style).toBeDisabled();
 await expect(trigger).toBeEnabled();
});

test('an older scene read cannot replace newer drawing properties',async({page})=>{
 await page.evaluate(()=>{const instance=instances[0],read=instance.editor.getScene;let first=true;instance.editor.getScene=async()=>{const snapshot=await read();if(first){first=false;await new Promise(resolve=>instance.finishRead=resolve);}return snapshot;};});
 await page.getByRole('button',{name:'Drawing properties',exact:true}).click();
 await page.waitForFunction(()=>typeof instances[0].finishRead==='function');
 await page.evaluate(()=>instances[0].updateDrawing('minimal',1));
 await expect(page.getByLabel('Theme',{exact:true})).toHaveValue('minimal');
 await page.evaluate(()=>instances[0].finishRead());
 await expect(page.getByLabel('Theme',{exact:true})).toHaveValue('minimal');
 await expect(page.getByLabel('Drawing style',{exact:true})).toHaveValue('1');
});

test('failed property edits report the failure and retain saved metadata',async({page})=>{
 await page.getByRole('button',{name:'Drawing properties',exact:true}).click();
 const theme=page.getByLabel('Theme',{exact:true});await expect(theme).toHaveValue('default');
 await page.evaluate(()=>instances[0].setFailure({code:'PersistenceFailed',message:'Unable to save drawing properties.'}));
 await theme.selectOption('minimal');
 await expect(page.getByRole('alert')).toContainText('Unable to save drawing properties.');
 await expect(theme).toHaveValue('default');
});

test('drawing property fields fit a narrow embedded canvas',async({page})=>{
 await page.setViewportSize({width:240,height:500});
 await page.evaluate(()=>instances[0].root.style.width='100vw');
 await page.getByRole('button',{name:'Drawing properties',exact:true}).click();
 const panel=page.getByRole('dialog',{name:'Drawing properties',exact:true});
 await expect(page.getByLabel('Theme',{exact:true})).toBeEnabled();
 expect(await panel.evaluate(node=>{
  const outer=node.getBoundingClientRect();return [...node.querySelectorAll('select')].every(input=>{const box=input.getBoundingClientRect();return box.left>=outer.left&&box.right<=outer.right;});
 })).toBe(true);
});

test('palette swatches follow resolved document theme colors when selection refreshes',async({page})=>{
 await page.evaluate(()=>instances[0].select('Shape',{resolved:{themeColors:{PrimaryStroke:'#485c78',PrimaryFill:'#edf2f7'}}}));
 const root=page.locator('.dm-editor-ui');
 await expect(root).toHaveCSS('--dm-color-primary-stroke','#485c78');
 await expect(root).toHaveCSS('--dm-color-primary-fill','#edf2f7');
 await page.evaluate(()=>instances[0].select('Shape',{resolved:{themeColors:{PrimaryStroke:'#adbed7',PrimaryFill:'#303b4b'}}}));
 await expect(root).toHaveCSS('--dm-color-primary-stroke','#adbed7');
 await expect(root).toHaveCSS('--dm-color-primary-fill','#303b4b');
});

for(const dismissal of ['Escape','trigger','canvas']) test('closed drawing properties preserve later inline focus after '+dismissal+' dismissal',async({page})=>{
 await page.evaluate(()=>{
  const instance=instances[0],host=instance.root.querySelector('.drawmotive-canvas-host'),canvas=host.querySelector('canvas');
  canvas.tabIndex=0;canvas.addEventListener('pointerdown',()=>canvas.focus());
  const inline=document.createElement('div');inline.contentEditable='plaintext-only';inline.dataset.testid='d-canvas-content-editable';
  inline.textContent='Uncommitted draft';inline.style.cssText='position:absolute;left:200px;top:150px;display:none';
  inline.addEventListener('blur',()=>{globalThis.inlineBlurCount++;});host.append(inline);globalThis.inlineBlurCount=0;
 });
 const trigger=page.getByRole('button',{name:'Drawing properties',exact:true});await trigger.click();
 const panel=page.getByRole('dialog',{name:'Drawing properties',exact:true});
 await expect.poll(()=>panel.evaluate(node=>node.contains(document.activeElement))).toBe(true);
 if(dismissal==='Escape')await page.keyboard.press('Escape');
 else if(dismissal==='trigger')await trigger.click();
 else await page.locator('canvas').click({position:{x:200,y:80}});
 await expect(panel).toHaveCount(0);
 // Observe Mantine's completed dismissal before a later native editing interaction begins.
 await page.waitForTimeout(100);
 if(dismissal==='canvas')await expect(page.locator('canvas')).toBeFocused();
 else await expect(trigger).toBeFocused();

 await page.evaluate(()=>{instances[0].root.querySelector('canvas').focus();instances[0].setState({busy:true});});
 await expect(page.getByTestId('drawing-toolbar')).toHaveAttribute('disabled','');
 await page.evaluate(()=>{
  const inline=instances[0].root.querySelector('[data-testid="d-canvas-content-editable"]');inline.style.display='block';inline.focus();
  instances[0].setState({busy:false});
 });
 await expect(page.getByTestId('drawing-toolbar')).not.toHaveAttribute('disabled','');
 // A closed panel must remain inert after the delayed focus-return window, including subsequent state renders.
 await page.waitForTimeout(100);
 await expect(page.getByTestId('d-canvas-content-editable')).toBeFocused({timeout:1000});
 expect(await page.evaluate(()=>inlineBlurCount)).toBe(0);
 await expect(page.getByTestId('d-canvas-content-editable')).toHaveText('Uncommitted draft');
});
