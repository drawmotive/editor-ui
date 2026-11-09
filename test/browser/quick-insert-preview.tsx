import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { QuickInsert } from '../../src/quick-insert.js';
import { QUICK_INSERT_OBJECTS, type QuickInsertUsage } from '../../src/quick-insert-model.js';
import { SHORTCUTS } from '../../src/controls.js';
import { CLOUD_OBJECTS } from '../fixtures/quick-insert-objects.mjs';
import '../../src/styles.css';

const objects = [...QUICK_INSERT_OBJECTS.map(item=>({...item,shortcut:SHORTCUTS[item.id]})), ...CLOUD_OBJECTS];

/** Preview composition supplies data and records selection without invoking a native editor. */
function Preview() {
  const [container,setContainer]=useState<HTMLDivElement|null>(null);
  const [open,setOpen]=useState(false),[theme,setTheme]=useState<'light'|'dark'>('light');
  const [width,setWidth]=useState(736),[usage,setUsage]=useState<QuickInsertUsage>({});
  const [selection,setSelection]=useState('Select an object to inspect it.');
  const clock=useRef(0);
  return <main>
    <h1>Quick insert preview</h1>
    <p>The real picker with built-in tools and cloud service examples. Selections are previewed here.</p>
    <div className="preview-controls">
      <label>Preview width <select aria-label="Preview width" value={width} onChange={event=>setWidth(Number(event.target.value))}>
        {[320,360,736].map(value=><option key={value} value={value}>{value}px</option>)}
      </select></label>
      <label>Preview theme <select aria-label="Preview theme" value={theme} onChange={event=>setTheme(event.target.value as 'light'|'dark')}>
        <option value="light">Light</option><option value="dark">Dark</option>
      </select></label>
      <button onClick={()=>setOpen(true)}>Open quick insert</button>
    </div>
    <div ref={setContainer} className="preview-stage" style={{width}} data-theme={theme}>
      <div className="drawmotive-canvas-host"><canvas aria-label="Preview canvas" tabIndex={0} onKeyDown={event=>{
        if(event.key==='/'&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.nativeEvent.isComposing){
          event.preventDefault();setOpen(true);
        }
      }}/></div>
      <div className="dm-editor-ui" data-mantine-color-scheme={theme}>
        <MantineProvider forceColorScheme={theme}>
          {container&&open&&<QuickInsert container={container} objects={objects} usage={usage} disabled={false}
            onClose={()=>setOpen(false)} onSelect={async id=>{
              const item=objects.find(item=>item.id===id)!;
              const lastUsed=++clock.current;
              setUsage(current=>({...current,[id]:{count:(current[id]?.count??0)+1,lastUsed}}));
              setSelection('Preview selection: '+(item.group?item.group+' / ':'')+item.label);
              setOpen(false);
            }}/>}
        </MantineProvider>
      </div>
    </div>
    <p role="status">{selection}</p>
    <p className="preview-help">Try CDN, c, cl or api. Press / on the preview canvas to reopen.</p>
  </main>;
}

createRoot(document.getElementById('preview')!).render(<Preview/>);
