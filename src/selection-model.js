import { selectionSubjects } from './ui-model.js';

const unavailable = Object.freeze({ state: 'Unavailable' });
const uniform = value => ({ state: 'Uniform', value });
const properties = ['strokeColor','fillColor','strokeWidth','strokeStyle','cornerRadius','textSize','resolvedTextSize','bold','italic',
  'horizontalAlignment','verticalAlignment','lineStartStyle','lineEndStyle','lineRouting','groupColorRole','groupHeaderVisible'];
const roleFor = (item, domain, value) => Object.entries(item.resolved?.themeValues?.[domain] ?? {})
  .find(([, scalar]) => scalar === value)?.[0] ?? null;
const color = (item, value) => {
  const role = roleFor(item, 'colors', value);
  return { role, argb: role === null ? value ?? null : null };
};

/** Native metadata owns encoded role identities; a UI action writes exactly that scalar leaf. */
export function themeValue(item, domain, role) {
  const value = item.resolved?.themeValues?.[domain]?.[role];
  if (value === undefined) throw new Error('The selection does not provide the requested theme role: ' + role);
  return value;
}

/** Toolbar-specific presentation is derived from generated document values, never a native property whitelist. */
function projectItem(item) {
  const model = item.model, caps = item.capabilities, resolved = item.resolved ?? {}, paint = model.data?.paintStyle ?? {};
  const font = model.fontStyle ?? {}, resolvedFont = resolved.fontStyle ?? {};
  const values = Object.fromEntries(properties.map(name => [name, unavailable]));
  values.strokeColor = uniform(color(item, caps.text ? font.color : paint.color));
  if (caps.text) {
    Object.assign(values, { textSize: uniform(roleFor(item, 'fontSizes', font.size) ?? font.size), resolvedTextSize: uniform(resolvedFont.size),
      bold: uniform(resolvedFont.weight === 700), italic: uniform(resolvedFont.slant === 'Italic'),
      horizontalAlignment: uniform(resolvedFont.textAlign ?? 'Center') });
    if (caps.verticalTextAlignment) values.verticalAlignment = uniform(resolvedFont.verticalTextAlign ?? 'Center');
  } else {
    values.strokeWidth = uniform(roleFor(item, 'lineWidths', paint.strokeWidth) ?? paint.strokeWidth);
    values.strokeStyle = uniform(paint.strokeClass ?? 'Solid');
    if (caps.fill) values.fillColor = uniform(color(item, paint.fillColor));
    if (caps.cornerRadius) values.cornerRadius = uniform(resolved.cornerRadius ?? 0);
  }
  if (caps.line) Object.assign(values, { lineStartStyle: uniform(model.startStyle ?? 0), lineEndStyle: uniform(model.endStyle ?? 1),
    lineRouting: uniform(caps.connectorRouting ? (model.routing ?? 'Straight') : 'Straight') });
  if (caps.group) Object.assign(values, { groupColorRole: uniform(resolved.groupColorRole ?? null), groupHeaderVisible: uniform(resolved.groupHeaderVisible ?? true) });
  return { ...item, properties: values, ...(item.boundText ? { boundText: projectItem(item.boundText) } : {}) };
}

/** A focused bound label is the effective subject; mixed unsupported values stay unavailable. */
export function projectSelection(selection) {
  const items = selection.items.map(projectItem), subjects = selectionSubjects(items);
  const aggregate = Object.fromEntries(properties.map(name => {
    const values = subjects.map(item => item.properties[name]);
    if (!values.length || values.some(value => value.state === 'Unavailable')) return [name, unavailable];
    const first = values[0];
    return [name, values.every(value => JSON.stringify(value.value) === JSON.stringify(first.value)) ? first : { state: 'Mixed' }];
  }));
  return { ...selection, items, properties: aggregate };
}

export const setModel = (item, path, value) => ({ itemId: item.id, path, value });
export const callModel = (item, method, ...args) => ({ itemId: item.id, op: 'call', path: [method], arguments: args });

/** One UI action carries the exact selection/revision it displayed; native code revalidates it. */
export function selectionEdit(selection, description, changes, target) {
  return { revision: selection.revision, description, token: selection.token,
    changes: (target ? [target] : selectionSubjects(selection.items)).flatMap(changes) };
}
