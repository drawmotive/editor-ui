import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
test.use({launchOptions:{executablePath:process.env.DRAWMOTIVE_CHROMIUM_PATH}});
test('React recreation waits native cleanup before mounting its successor',async({page})=>{
 const fixture=await build({stdin:{contents:
 'import {createElement} from "react";import {createRoot} from "react-dom/client";import {Editor} from "./src/index.tsx";'+
 'const root=createRoot(document.body.appendChild(document.createElement("div")));globalThis.readyEditors=[];globalThis.errors=[];globalThis.changeUi=ui=>root.render(createElement(Editor,{assetBaseUrl:"/stub-runtime/",ui,style:{height:420},onReady:e=>readyEditors.push(e),onError:e=>errors.push(e.message)}));changeUi(undefined);',
 resolveDir:fileURLToPath(new URL('../..',import.meta.url)),sourcefile:'wrapper.js'},write:false,outfile:'wrapper.js',bundle:true,format:'esm',platform:'browser',target:'es2022',jsx:'automatic'});
 await page.route('**/wrapper.js',route=>route.fulfill({contentType:'text/javascript',body:fixture.outputFiles.find(file=>file.path.endsWith('.js')).text}));
 await page.route('**/stub-runtime/js/editor-canvas.js',route=>route.fulfill({contentType:'text/javascript',body:'export {mountCanvas} from "/test/browser/stub-runtime.js";'}));
 await page.goto('/test/browser/host.html');await page.evaluate(()=>import('/wrapper.js'));await page.waitForFunction(()=>readyEditors.length===1);
 await page.evaluate(()=>{globalThis.nativeCleanup=()=>new Promise(resolve=>globalThis.releaseCleanup=resolve);changeUi({drawingToolbar:false});});
 await page.waitForFunction(()=>typeof releaseCleanup==='function');expect(await page.evaluate(()=>readyEditors.length)).toBe(1);await expect(page.locator('canvas')).toHaveCount(1);
 await page.evaluate(()=>{globalThis.nativeCleanup=undefined;releaseCleanup();});await page.waitForFunction(()=>readyEditors.length===2);await expect(page.locator('canvas')).toHaveCount(1);expect(await page.evaluate(()=>errors)).toEqual([]);
});
test('changing a deployment key recreates the native session after its cleanup',async({page})=>{
 const fixture=await build({stdin:{contents:
 'import {createElement} from "react";import {createRoot} from "react-dom/client";import {Editor} from "./src/index.tsx";'+
 'const root=createRoot(document.body.appendChild(document.createElement("div")));globalThis.readyEditors=[];globalThis.errors=[];globalThis.changeKey=licenseKey=>root.render(createElement(Editor,{assetBaseUrl:"/stub-runtime/",licenseKey,style:{height:420},onReady:e=>readyEditors.push(e),onError:e=>errors.push(e.message)}));changeKey("original-key");',
 resolveDir:fileURLToPath(new URL('../..',import.meta.url)),sourcefile:'wrapper.js'},write:false,outfile:'wrapper.js',bundle:true,format:'esm',platform:'browser',target:'es2022',jsx:'automatic'});
 await page.route('**/wrapper.js',route=>route.fulfill({contentType:'text/javascript',body:fixture.outputFiles.find(file=>file.path.endsWith('.js')).text}));
 await page.route('**/stub-runtime/js/editor-canvas.js',route=>route.fulfill({contentType:'text/javascript',body:
 'import {mountCanvas as mount} from "/test/browser/stub-runtime.js";export function mountCanvas(context){(globalThis.nativeOptions??=[]).push(context.options);return mount(context);}'}));
 await page.goto('/test/browser/host.html');await page.evaluate(()=>import('/wrapper.js'));await page.waitForFunction(()=>readyEditors.length===1);
 expect(await page.evaluate(()=>nativeOptions.map(options=>options.licenseKey))).toEqual(['original-key']);
 await page.evaluate(()=>{globalThis.nativeCleanup=()=>new Promise(resolve=>globalThis.releaseCleanup=resolve);changeKey('replacement-key');});
 await page.waitForFunction(()=>typeof releaseCleanup==='function',undefined,{timeout:3000});
 expect(await page.evaluate(()=>readyEditors.length)).toBe(1);
 await page.evaluate(()=>{globalThis.nativeCleanup=undefined;releaseCleanup();});await page.waitForFunction(()=>readyEditors.length===2);
 expect(await page.evaluate(()=>nativeOptions.map(options=>options.licenseKey))).toEqual(['original-key','replacement-key']);
 await page.evaluate(()=>changeKey(undefined));await page.waitForFunction(()=>readyEditors.length===3);
 expect(await page.evaluate(()=>Object.hasOwn(nativeOptions.at(-1),'licenseKey'))).toBe(false);
 await expect(page.locator('canvas')).toHaveCount(1);expect(await page.evaluate(()=>errors)).toEqual([]);
});
