import { useId, useLayoutEffect, useRef, useState } from 'react';
import { FocusTrap } from '@mantine/core';
import { Icon } from './icons.js';
import { quickInsertGroups, type QuickInsertObject, type QuickInsertUsage } from './quick-insert-model.js';

interface QuickInsertProps<Id extends string> {
  container: HTMLElement; usage: QuickInsertUsage; objects: readonly QuickInsertObject<Id>[]; disabled: boolean;
  onSelect(id: Id): Promise<void>;
  onClose(): void;
}

/** Catalog discovery reports selection to its owner; this component never creates scene geometry. */
export function QuickInsert<Id extends string>({container,usage,objects,disabled,onSelect,onClose}: QuickInsertProps<Id>) {
  const [query,setQuery]=useState(''),[active,setActive]=useState(0);
  const id=useId(),root=useRef<HTMLDivElement>(null);
  const groups=quickInsertGroups(query,usage,objects),items=groups.flatMap(group=>group.items);
  const selected=Math.min(active,Math.max(0,items.length-1));
  const current=items[selected],detail=current?(current.group?current.group+' / ':'')+current.label:'No objects found';
  useLayoutEffect(()=>{
    root.current?.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest'});
  },[selected,query]);
  useLayoutEffect(()=>()=>{
    const document=container.ownerDocument;
    // Restore only this palette's focus, including browser blur after a disabled input.
    if(root.current?.contains(document.activeElement)||document.activeElement===document.body)
      container.querySelector<HTMLCanvasElement>('.drawmotive-canvas-host canvas')?.focus({preventScroll:true});
  },[container]);
  let index=0;
  return <div className="dm-quick-insert-backdrop" onPointerDown={event=>{
    if(event.target===event.currentTarget){
      // The backdrop's browser focus default must not undo restoration during unmount.
      event.preventDefault();onClose();
    }
  }}>
    <FocusTrap active innerRef={root}>
      <div className="dm-quick-insert" role="dialog" aria-modal="true" aria-label="Quick insert" aria-busy={disabled}
        onKeyDown={event=>{
          if(event.nativeEvent.isComposing||event.keyCode===229)return;
          if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}
        }}>
        <div className="dm-quick-insert-query">
        <Icon name="search"/>
        <input data-autofocus role="combobox" aria-label="Search objects" aria-expanded="true" aria-autocomplete="list"
          aria-controls={id+'-list'} aria-activedescendant={items.length?id+'-'+selected:undefined}
          aria-describedby={id+'-hint'}
          className="dm-quick-insert-search" placeholder="Search objects…" value={query} readOnly={disabled} aria-disabled={disabled}
          onChange={event=>{setQuery(event.target.value);setActive(0);}}
          onKeyDown={event=>{
            if(event.nativeEvent.isComposing||event.keyCode===229||event.altKey||event.ctrlKey||event.metaKey)return;
            if(['ArrowDown','ArrowUp','Home','End','Enter'].includes(event.key)){
              // Home/End edit a nonempty query normally. Empty search navigates all suggestions.
              if(query&&['Home','End'].includes(event.key))return;
              event.preventDefault();
              if(event.key==='Enter'){if(!event.repeat&&items[selected]&&!disabled)void onSelect(items[selected].id);}
              else if(items.length)setActive(event.key==='Home'?0:event.key==='End'?items.length-1:(selected+(event.key==='ArrowDown'?1:-1)+items.length)%items.length);
            }
          }}/>
        <span className="dm-quick-insert-count" aria-label="Matching objects">{new Set(items.map(item=>item.id)).size}</span>
        <button type="button" className="dm-quick-insert-close" aria-label="Close quick insert" title="Close (Esc)"
          onPointerDown={event=>event.preventDefault()} onClick={onClose}><Icon name="close"/></button>
        </div>
        <div id={id+'-list'} className="dm-quick-insert-results" role="listbox" aria-label="Objects">
          {groups.map(group=><div className="dm-quick-insert-group" key={group.key} role="group" aria-label={group.label??'Objects'} data-ungrouped={group.label===null||undefined}>
            {group.label&&<div className="dm-quick-insert-group-label" aria-hidden="true">{group.label}</div>}
            <div className="dm-quick-insert-grid">
            {group.items.map(item=>{const position=index++;return <button key={item.id} id={id+'-'+position} type="button"
              className="dm-quick-insert-option" role="option" aria-selected={position===selected} tabIndex={-1} disabled={disabled}
              aria-label={(item.group?item.group+' / ':'')+item.label}
              title={(item.group?item.group+' / ':'')+item.label+(item.shortcut?' ('+item.shortcut+')':'')}
              onPointerMove={()=>setActive(position)} onPointerDown={event=>event.preventDefault()} onClick={()=>void onSelect(item.id)}>
              {item.iconUrl?<img src={item.iconUrl} alt="" aria-hidden="true"/>:<Icon name={item.id}/>}
              <span>{item.label}</span>
            </button>;})}
            </div>
          </div>)}
          {!items.length&&<div className="dm-quick-insert-empty" role="status">No objects found</div>}
        </div>
        <div className="dm-quick-insert-hint">
          <span className="dm-quick-insert-detail" title={detail}>{detail}</span>
          {current?.shortcut&&<kbd title="Tool shortcut">{current.shortcut}</kbd>}
          <span id={id+'-hint'} className="dm-quick-insert-keys" aria-label="Up and down to navigate, Enter to choose, Escape to close">↑↓ <kbd>↵</kbd> <kbd>Esc</kbd></span>
        </div>
      </div>
    </FocusTrap>
  </div>;
}
