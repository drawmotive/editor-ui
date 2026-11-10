import {test,expect} from '@playwright/test';
import {DEFAULT_THEME} from '@mantine/core';
test.use({launchOptions:{executablePath:process.env.DRAWMOTIVE_CHROMIUM_PATH}});
test.beforeEach(async({page})=>{
 await page.goto('/test/browser/ui-harness.html');
 await page.waitForFunction(()=>typeof mount==='function');
});

for(const embedded of [false,true]) for(const darkTheme of [false,true]) test('drawing typography and palette do not restyle Mantine chrome in '+(darkTheme?'dark':'light')+' mode'+(embedded?' inside a custom Mantine host':''),async({page})=>{
 await page.evaluate(async ({dark,embedded})=>{
  const instance=mount({},"'Native Print', 'Regional Print'");instances.push(instance);
  if(embedded){instance.view.dispose();const {mountInsideHost}=await import('/dist/typography-harness.js');instance.view=mountInsideHost(instance.editor,instance.root);}
  await instance.editor.setPreferences({darkTheme:dark});instance.select('BoundText');
 },{dark:darkTheme,embedded});
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const expected=await page.evaluate(({fontFamily,surface,text,border})=>{
  const probe=document.createElement('div');probe.style.cssText='font-family:'+fontFamily+';background:'+surface+';color:'+text+';border:1px solid '+border;
  document.body.append(probe);const css=getComputedStyle(probe);
  const result={font:css.fontFamily,surface:css.backgroundColor,text:css.color,border:css.borderColor};probe.remove();return result;
 },{fontFamily:DEFAULT_THEME.fontFamily,surface:darkTheme?DEFAULT_THEME.colors.dark[7]:DEFAULT_THEME.white,
  text:darkTheme?DEFAULT_THEME.colors.dark[0]:DEFAULT_THEME.black,border:darkTheme?DEFAULT_THEME.colors.dark[4]:DEFAULT_THEME.colors.gray[4]});
 const zoom=page.getByRole('button',{name:'Reset zoom',exact:true}),theme=page.getByLabel('Theme',{exact:true});
 for(const control of [zoom,theme,page.getByLabel('Drawing style',{exact:true}),page.getByTestId('context-toolbar-edit-text')])
  await expect(control).toHaveCSS('font-family',expected.font,{timeout:1500});
 const settings=page.getByRole('dialog',{name:'Settings',exact:true});
 for(const surface of [settings,page.getByTestId('context-toolbar')]){
  await expect(surface).toHaveCSS('background-color',expected.surface,{timeout:1500});
  await expect(surface).toHaveCSS('color',expected.text,{timeout:1500});
  await expect(surface).toHaveCSS('border-top-color',expected.border,{timeout:1500});
 }
 await page.keyboard.press('Tab');await zoom.focus();
 await expect(zoom).toHaveCSS('outline-style','solid');await expect(zoom).toHaveCSS('outline-width','2px');
 const outline=await zoom.evaluate(node=>getComputedStyle(node).outlineColor);
 const hostFont=embedded?await page.getByLabel('Host control',{exact:true}).evaluate(node=>getComputedStyle(node).fontFamily):null;
 await page.evaluate(()=>{
  const instance=instances[0],host=instance.root.querySelector('.drawmotive-canvas-host'),family="'Native Script', 'Regional Script'";
  host.style.setProperty('--drawmotive-font-family',family);
  host.dispatchEvent(new CustomEvent('drawmotive:font-family-change',{bubbles:true,detail:family}));
  instance.updateDrawing('minimal',1);
  instance.select('BoundText',{resolved:{themeColors:{PrimaryStroke:'#adbed7',PrimaryFill:'#303b4b'}}});
 });
 await expect(theme).toHaveValue('minimal');
 await expect(page.getByLabel('Drawing style',{exact:true})).toHaveValue('1');
 for(const control of [zoom,theme,page.getByTestId('context-toolbar-edit-text')])await expect(control).toHaveCSS('font-family',expected.font,{timeout:1500});
 await expect(settings).toHaveCSS('background-color',expected.surface);
 await zoom.focus();await expect(zoom).toHaveCSS('outline-style','solid');await expect(zoom).toHaveCSS('outline-color',outline,{timeout:1500});
 if(embedded){expect(hostFont).toBe('\"Host Interface\"');await expect(page.getByLabel('Host control',{exact:true})).toHaveCSS('font-family',hostFont);}
});
