import {Checkbox} from '@mantine/core';
import type {EditorPreferences} from '@drawmotive/editor';
import {DrawingPropertiesPanel} from './drawing-properties.js';

/** One settings surface keeps local preferences distinct from native document edits. */
export function SettingsPanel({preferences,onChange}: {preferences:EditorPreferences;onChange:(value:EditorPreferences)=>Promise<unknown>}) {
  return <div className="dm-settings">
    <header className="dm-settings-header"><h2>Settings</h2></header>
    <section className="dm-settings-section" aria-label="View">
      <div className="dm-settings-section-heading"><h3>View</h3><p>Only on this device.</p></div>
      <Checkbox label="Dark Theme" data-testid="settings-dark-theme" checked={preferences.darkTheme??false}
        onChange={event=>void onChange({darkTheme:event.currentTarget.checked})}/>
      <Checkbox label="Show and Snap to Grid" data-testid="settings-show-grid" checked={preferences.showGrid??true}
        onChange={event=>void onChange({showGrid:event.currentTarget.checked,snapToGrid:event.currentTarget.checked})}/>
    </section>
    <section className="dm-settings-section" aria-label="Drawing">
      <div className="dm-settings-section-heading"><h3>Drawing</h3><p>Saved with this drawing.</p></div>
      <DrawingPropertiesPanel/>
    </section>
  </div>;
}
