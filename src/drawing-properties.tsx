import {useEffect,useRef,useState} from 'react';
import {NativeSelect} from '@mantine/core';
import type {EditorSceneSnapshot} from '@drawmotive/editor';
import {ToolButton,useUi} from './controls.js';

const propertyClasses={root:'dm-drawing-property',label:'dm-drawing-property-label',wrapper:'dm-drawing-property-input'};

/** Document appearance is read and edited at the native revision boundary, never preference storage. */
export function DrawingPropertiesPanel() {
  const {editor,state,run}=useUi();
  const [snapshot,setSnapshot]=useState<EditorSceneSnapshot|null>(null),[error,setError]=useState<unknown>(null),[retry,setRetry]=useState(0);
  const alive=useRef(false),latestRevision=useRef(state.revision),requestedRevision=useRef<string|null>(null);
  latestRevision.current=state.revision;
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{
    const revision=state.revision;
    // getScene itself publishes busy. Remember the request before starting it so
    // that notification cannot create a read loop; a later revision owns its response.
    if(!revision||state.busy||requestedRevision.current===revision)return;
    requestedRevision.current=revision;setError(null);
    void editor.getScene().then(next=>{
      if(!alive.current||latestRevision.current!==revision)return;
      if(next.revision!==revision)throw new Error('The drawing changed. Read its properties again.');
      setSnapshot(next);
    }).catch(reason=>{if(alive.current&&latestRevision.current===revision)setError(reason);});
  },[editor,state.revision,state.busy,retry]);
  const current=snapshot?.revision===state.revision,saved=snapshot?.metadata.model;
  const disabled=!current||state.busy||!state.editingEnabled||state.health!=='healthy';
  const theme=typeof saved?.theme==='string'?saved.theme:'default';
  const style=saved?.style===1?'1':'0';
  const change=async(property:'theme'|'style',value:string|number)=>{
    if(disabled||!snapshot)return;
    await run(()=>editor.editScene({revision:snapshot.revision,description:'Change drawing '+property,changes:[{path:[property],value}]}));
  };
  return <div className="dm-panel-stack dm-drawing-properties" aria-busy={!current&&!error}>
    <NativeSelect label="Theme" classNames={propertyClasses} value={theme} disabled={disabled} data-testid="drawing-theme"
      data={[{value:'default',label:'Default'},{value:'minimal',label:'Minimal'}]}
      onChange={event=>void change('theme',event.currentTarget.value)}/>
    <p className="dm-property-description">{theme==='minimal'?'Apple-inspired cards in graphite, ceramic and titanium finishes.':'Balanced colors and classic outlines.'}</p>
    <NativeSelect label="Drawing style" classNames={propertyClasses} value={style} disabled={disabled} data-testid="drawing-style"
      data={[{value:'0',label:'Formal'},{value:'1',label:'Draft'}]}
      onChange={event=>void change('style',Number(event.currentTarget.value))}/>
    <p className="dm-property-description">{style==='1'?'Hand-drawn strokes and handwriting.':'Precise strokes and clean typography.'}</p>
    {error!=null&&<div role="alert"><p>{(error as {message?:string})?.message??String(error)}</p>
      <ToolButton aria-label="Read drawing properties again" onClick={()=>{requestedRevision.current=null;setRetry(value=>value+1);}}>Try again</ToolButton>
    </div>}
  </div>;
}
