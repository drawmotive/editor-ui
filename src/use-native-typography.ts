import { useLayoutEffect, useState } from 'react';

const property='--drawmotive-font-family',eventName='drawmotive:font-family-change';

/** Native presentation owns family selection; web controls share it without requesting resources. */
export function useNativeTypography(container:HTMLElement,active:boolean):string|undefined {
  const [family,setFamily]=useState<string>();
  useLayoutEffect(()=>{
    if(!active)return;
    const canvas=container.querySelector<HTMLElement>('.drawmotive-canvas-host');
    if(!canvas)return;
    const read=()=>setFamily(canvas.style.getPropertyValue(property)||undefined);
    // Capture this document's owner. Nested/foreign canvases and a retired
    // document cannot publish typography into the current chrome lifetime.
    const changed=(event:Event)=>{if(event.target===canvas)read();};
    container.addEventListener(eventName,changed);read();
    return()=>container.removeEventListener(eventName,changed);
  },[container,active]);
  return family;
}
