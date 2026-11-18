import { useState } from 'react';
import { Button, Checkbox, Divider, Group, Stack, TextInput } from '@mantine/core';
import { useUi } from './controls.js';
import { callModel, setModel, type UiSelectedObject } from './selection-model.js';
import { itemNumbering, type ItemNumbering } from './ui-model.js';

export function ResetNumbering({ disabled, onReset }: {
  disabled: boolean;
  onReset: (includeGroups: boolean) => Promise<unknown>;
}) {
  const [includeGroups, setIncludeGroups] = useState(false);
  return <Stack gap={6} align="flex-start">
    <Checkbox label="Include group descendants" size="xs" checked={includeGroups} disabled={disabled}
      onChange={event => setIncludeGroups(event.currentTarget.checked)}/>
    <Button size="compact-xs" variant="default" disabled={disabled} onClick={() => void onReset(includeGroups)}>
      Reset numbering
    </Button>
  </Stack>;
}

/** Each draft belongs to the revision that supplied the displayed prefix and range. */
export function NumberingPanel({ item }: { item: UiSelectedObject }) {
  const { selection, state, edit } = useUi();
  const numbering = itemNumbering(item);
  if (!selection || !numbering) return null;
  const disabled = selection.revision !== state.revision || state.busy || !state.editingEnabled || state.health !== 'healthy';
  const autoNumber = item.model.autoNumber;
  return <div className="dm-panel-stack dm-numbering-panel">
    <LocalNumberEditor key={selection.revision} numbering={numbering} disabled={disabled}
      onChange={value => edit(value === null ? 'Clear badge number' : 'Change badge number',
        target => [callModel(target, 'setBadgeNumber', value)], item)}/>
    {item.capabilities.group && typeof autoNumber === 'boolean' && <>
      <Divider/>
      <Checkbox label="Automatic numbering" size="xs" checked={autoNumber} disabled={disabled}
        description={numbering.drawingEnabled ? undefined : 'Enable drawing-wide automatic numbering to use this setting.'}
        onChange={event => {
          const checked = event.currentTarget.checked;
          void edit('Change group automatic numbering', target => [setModel(target, ['autoNumber'], checked)], item);
        }}/>
      <ResetNumbering disabled={disabled} onReset={includeGroups =>
        edit('Reset group numbering', target => [callModel(target, 'resetNumbering', includeGroups)], item)}/>
    </>}
  </div>;
}

function LocalNumberEditor({ numbering: { number, prefix, maximum }, disabled, onChange }: {
  numbering: ItemNumbering;
  disabled: boolean;
  onChange: (number: number | null) => Promise<unknown>;
}) {
  const saved = number === null ? '' : String(number);
  const [draft, setDraft] = useState(saved);
  const value = Number(draft);
  const valid = /^[0-9]+$/.test(draft) && Number.isSafeInteger(value) && value >= 1 && value <= maximum;
  const canApply = !disabled && valid && value !== number;
  return <form className="dm-panel-stack" onSubmit={event => {
    event.preventDefault();
    if (canApply) void onChange(value);
  }}>
    <TextInput label="Local number" size="xs" value={draft} inputMode="numeric" disabled={disabled || maximum < 1}
      leftSection={prefix && <span className="dm-number-prefix" data-testid="number-prefix" aria-hidden="true">{prefix}</span>}
      leftSectionWidth={prefix ? `clamp(1.75rem, calc(${prefix.length}ch + .75rem), 60%)` : undefined}
      leftSectionPointerEvents="none"
      description={prefix && 'Group prefix ' + prefix} descriptionProps={{ style: { display: 'none' } }}
      error={draft !== saved && draft !== '' && !valid && 'Enter a whole number from 1 to ' + maximum + '.'}
      onChange={event => setDraft(event.currentTarget.value)}/>
    <Group gap={6}>
      <Button type="submit" size="compact-xs" disabled={!canApply}>Apply</Button>
      <Button type="button" size="compact-xs" variant="default" disabled={disabled || number === null}
        onClick={() => void onChange(null)}>Clear</Button>
    </Group>
  </form>;
}
