import {test,expect} from '@playwright/test';
test.use({launchOptions:{executablePath:process.env.DRAWMOTIVE_CHROMIUM_PATH}});
test.beforeEach(async({page})=>{
 await page.goto('/test/browser/ui-harness.html');
 await page.waitForFunction(()=>typeof mount==='function');
});

test('native drawing typography reaches initial toolbar text and Mantine property controls',async({page})=>{
 await page.evaluate(()=>instances.push(mount({},"'Native Print', 'Regional Print'")));
 await expect(page.getByRole('button',{name:'Reset zoom',exact:true})).toHaveCSS('font-family','"Native Print", "Regional Print"',{timeout:1500});
 await page.getByRole('button',{name:'Drawing properties',exact:true}).click();
 await expect(page.getByLabel('Theme',{exact:true})).toHaveCSS('font-family','"Native Print", "Regional Print"',{timeout:1500});
 await expect(page.getByLabel('Drawing style',{exact:true})).toHaveCSS('font-family','"Native Print", "Regional Print"',{timeout:1500});
});

test('native typography changes update open controls while foreign canvas events retain their own ownership',async({page})=>{
 await page.evaluate(()=>instances.push(mount({},"'Native Print', 'Regional Print'")));
 await page.getByRole('button',{name:'Drawing properties',exact:true}).click();
 await page.evaluate(()=>{
  const host=instances[0].root.querySelector('.drawmotive-canvas-host'),family="'Native Script', 'Regional Script', 'Regional Print'";
  host.style.setProperty('--drawmotive-font-family',family);
  host.dispatchEvent(new CustomEvent('drawmotive:font-family-change',{bubbles:true,detail:family}));
 });
 const expected='"Native Script", "Regional Script", "Regional Print"';
 await expect(page.getByRole('button',{name:'Reset zoom',exact:true})).toHaveCSS('font-family',expected,{timeout:1500});
 await expect(page.getByLabel('Theme',{exact:true})).toHaveCSS('font-family',expected,{timeout:1500});
 await page.evaluate(()=>{
  const foreign=document.createElement('div');foreign.className='drawmotive-canvas-host';instances[0].root.append(foreign);
  foreign.style.setProperty('--drawmotive-font-family',"'Foreign Font'");
  foreign.dispatchEvent(new CustomEvent('drawmotive:font-family-change',{bubbles:true,detail:"'Foreign Font'"}));
  instances[0].setState({canUndo:true});
 });
 await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeEnabled();
 await expect(page.getByLabel('Theme',{exact:true})).toHaveCSS('font-family',expected,{timeout:1500});
});
