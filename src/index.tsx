import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createEditor } from '@drawmotive/editor';
import type { EditorCreateOptions, EditorInstance } from '@drawmotive/editor';
import { EditorUi, type EditorUiProps } from './editor-ui.js';
import './styles.css';
export { EditorUi };
export type { EditorUiProps };
export type { EditorUiOptions, EditorUiAction, EditorRegionId, EditorButtonId } from './ui-options.js';
import type { EditorUiOptions } from './ui-options.js';
export interface EditorProps extends Omit<EditorCreateOptions,'container'> {
  ui?: EditorUiOptions | false;
  className?: string; style?: CSSProperties; slots?: Readonly<Record<string,ReactNode>>; colorScheme?: 'light'|'dark';
  onReady?: (editor:EditorInstance)=>void; onError?: (error:unknown)=>void;
}

/** React owns the host; Blazor owns only its canvas and native inline-editing DOM. */
export function Editor({className,style,slots,colorScheme,onReady,onError,ui,...options}:EditorProps) {
  const runtime=useRef<HTMLDivElement>(null),callbacks=useRef({onReady,onError});callbacks.current={onReady,onError};
  const releasing=useRef<Promise<void>>(Promise.resolve());
  const [editor,setEditor]=useState<EditorInstance|null>(null);
  useEffect(()=>{
    let disposed=false,instance:EditorInstance|undefined,stop:undefined|(()=>void);
    const controller=new AbortController(),abort=()=>controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();
    setEditor(null);
    // The persistent writer belongs to the old session until disposal settles.
    // React cleanup is synchronous, so carry its asynchronous release to setup.
    const previousRelease=releasing.current;
    const starting=previousRelease.then(async()=>{
      if(disposed)return;
      const next=await createEditor({...options,container:runtime.current!,signal:controller.signal});
      instance=next;if(disposed)return;
      stop=next.onDisposed(()=>setEditor(null));setEditor(next);callbacks.current.onReady?.(next);
    });
    void starting.catch(error=>{if(!disposed)callbacks.current.onError?.(error);});
    return()=>{
      disposed=true;controller.abort();options.signal?.removeEventListener('abort',abort);stop?.();
      releasing.current=previousRelease.then(()=>starting.catch((error:unknown)=>{
        if((error as {code?:string})?.code==='DisposeCleanupUnconfirmed')throw error;
      })).then(async()=>{if(instance)await instance.dispose();});
      void releasing.current.catch(error=>callbacks.current.onError?.(error));
    };
  },[options.assetBaseUrl,options.licenseKey,options.textEditing,ui,options.persistence,options.workerFactory,options.workerUrls,options.signal,options.title,options.startupTimeoutMs,options.disposeTimeoutMs]);
  return <div className={className} style={{position:'relative',width:'100%',height:'100%',...style}}>
    <div ref={runtime} style={{position:'absolute',inset:0}} />
    {editor&&<EditorUi options={ui} editor={editor} container={runtime.current!} slots={slots} colorScheme={colorScheme} onError={onError}/>}
  </div>;
}

export { mountEditorUi } from './mount.js';
export { phosphorTheme } from './mantine-icons.js';
export { createEditorUiController } from './ui-controller.js';
export type { EditorUiController } from './ui-controller.js';
