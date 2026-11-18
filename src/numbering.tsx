import { useState } from 'react';
import { Button, Checkbox, Divider, Group, NativeSelect, TextInput } from '@mantine/core';
import { useUi } from './controls.js';
import { callModel, setModel, type UiSelectedObject } from './selection-model.js';
import { itemNumbering, type ItemNumbering } from './ui-model.js';

export function ResetNumbering({ disabled, onReset }: {
  disabled: boolean;
  onReset: () => Promise<unknown>;
}) {
  return <Button size="compact-xs" variant="default" disabled={disabled} style={{ alignSelf: 'flex-start' }}
    onClick={() => void onReset()}>
    Reset numbering
  </Button>;
}

/** Each draft belongs to the revision that supplied the displayed prefix and range. */
export function NumberingPanel({ item }: { item: UiSelectedObject }) {
  const { selection, state, edit } = useUi();
  const numbering = itemNumbering(item);
  if (!selection || !numbering) return null;
  const disabled = selection.revision !== state.revision || state.busy || !state.editingEnabled || state.health !== 'healthy';
  const autoNumber = item.model.autoNumber;
  const mode = item.model.autoNumberMode;
  const hasMode = mode === 'Enable' || mode === 'Disable' || mode === 'Inherit';
  const groupLabel = 'Automatic numbering in group';
  const changeGroupAutoNumber = (value: string | boolean) => edit('Change group automatic numbering',
    target => [setModel(target, [hasMode ? 'autoNumberMode' : 'autoNumber'], value)], item);
  return <div className="dm-panel-stack dm-numbering-panel">
    <LocalNumberEditor key={selection.revision} numbering={numbering} disabled={disabled}
      onChange={value => edit(value === null ? 'Clear badge number' : 'Change badge number',
        target => [callModel(target, 'setBadgeNumber', value)], item)}/>
    {item.capabilities.group && (hasMode || typeof autoNumber === 'boolean') && <>
      <Divider/>
      {hasMode
        ? <NativeSelect label={groupLabel} size="xs" value={mode} disabled={disabled}
          data={[{ value: 'Enable', label: 'Enable' }, { value: 'Disable', label: 'Disable' },
            { value: 'Inherit', label: 'Inherit parent' }]}
          onChange={event => void changeGroupAutoNumber(event.currentTarget.value)}/>
        : <Checkbox label={groupLabel} size="xs" checked={autoNumber === true} disabled={disabled}
          onChange={event => void changeGroupAutoNumber(event.currentTarget.checked)}/>}
      <ResetNumbering disabled={disabled} onReset={() =>
        edit('Reset group numbering', target => [callModel(target, 'resetNumbering', false)], item)}/>
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
