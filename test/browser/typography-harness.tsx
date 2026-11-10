import {createRoot} from 'react-dom/client';
import {MantineProvider,NativeSelect} from '@mantine/core';
import type {EditorInstance} from '@drawmotive/editor';
import {EditorUi} from '../../src/editor-ui.js';

export function mountInsideHost(editor:EditorInstance,container:HTMLElement) {
  const host=container.ownerDocument.createElement('div');
  host.className='host-theme';host.style.cssText='position:absolute;inset:0;pointer-events:none';container.append(host);
  const root=createRoot(host);
  root.render(<MantineProvider forceColorScheme="light" cssVariablesSelector=".host-theme" getRootElement={()=>host}
    theme={{fontFamily:'Host Interface',primaryColor:'indigo',black:'#123456',white:'#fedcba'}}>
    <div style={{position:'absolute',left:700,top:0,pointerEvents:'auto'}}>
      <NativeSelect label="Host control" data={['Host option']}/>
    </div>
    <EditorUi editor={editor} container={container}/>
  </MantineProvider>);
  return {dispose(){root.unmount();host.remove();}};
}
