/** Creation objects share the existing tool IDs; this catalog owns search vocabulary only. */
export const QUICK_INSERT_OBJECTS = Object.freeze([
  { id: 'arrow', label: 'Arrow', aliases: 'line connector' },
  { id: 'rectangle', label: 'Rectangle', aliases: 'box square shape' },
  { id: 'ellipse', label: 'Ellipse', aliases: 'circle oval shape' },
  { id: 'diamond', label: 'Diamond', aliases: 'decision rhombus shape' },
  { id: 'text', label: 'Text', aliases: 'label note' },
]);
const storageKey = 'drawmotive.quick-insert.v1';

function loadUsage(getStorage) {
  try {
    const raw = getStorage().getItem(storageKey);
    if (raw === null) return {};
    const saved = JSON.parse(raw), usage = {};
    if (saved?.version !== 1) return null;
    for (const { id } of QUICK_INSERT_OBJECTS) {
      const value = saved.usage?.[id];
      if (Number.isSafeInteger(value?.count) && value.count > 0 && Number.isSafeInteger(value.lastUsed) && value.lastUsed > 0)
        usage[id] = { count: value.count, lastUsed: value.lastUsed };
    }
    return usage;
  } catch { return null; }
}

function addUse(usage, id, count = 1) {
  // Rebase the five ordinal ranks instead of trusting an unbounded persisted clock.
  const ordered = Object.keys(usage).sort((a, b) => usage[a].lastUsed - usage[b].lastUsed);
  ordered.forEach((key, index) => { usage[key].lastUsed = index + 1; });
  usage[id] = { count: Math.min((usage[id]?.count ?? 0) + count, Number.MAX_SAFE_INTEGER), lastUsed: ordered.length + 1 };
}

/** Browser-local convenience state never participates in document replication.
 * Refresh other editors' records at use time and retain unsaved local increments when storage fails. */
export function createQuickInsertHistory(getStorage) {
  let usage = loadUsage(getStorage) ?? {}, pending = {};
  function refresh() {
    const saved = loadUsage(getStorage);
    if (saved === null) return;
    for (const id of Object.keys(pending).sort((a, b) => pending[a].lastUsed - pending[b].lastUsed))
      addUse(saved, id, pending[id].count);
    usage = saved;
  }
  return {
    read() { refresh(); return structuredClone(usage); },
    record(id) {
      if (!QUICK_INSERT_OBJECTS.some(item => item.id === id)) return;
      refresh(); addUse(usage, id);
      try { getStorage().setItem(storageKey, JSON.stringify({ version: 1, usage })); pending = {}; }
      catch { addUse(pending, id); }
    },
  };
}

/** Catalog order owns provider order. Ungrouped objects always lead without a heading;
 * only empty searches add the independent recency and frequency views. */
export function quickInsertGroups(query, usage, catalog = QUICK_INSERT_OBJECTS) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const items = catalog.filter(item => words.every(word =>
    (item.label + ' ' + (item.group ?? '') + ' ' + item.aliases).toLowerCase().includes(word)));
  if (!items.length) return [];
  const providers = new Map(), ungrouped = items.filter(item => !item.group);
  for (const item of items) {
    if (!item.group) continue;
    if (!providers.has(item.group)) providers.set(item.group, []);
    providers.get(item.group).push(item);
  }
  const recent = words.length ? [] : items.filter(item => usage[item.id]).sort((a, b) => usage[b.id].lastUsed - usage[a.id].lastUsed).slice(0, 3);
  const frequent = words.length ? [] : items.filter(item => usage[item.id]?.count > 1).sort((a, b) =>
    usage[b.id].count - usage[a.id].count || usage[b.id].lastUsed - usage[a.id].lastUsed).slice(0, 3);
  return [
    ...(ungrouped.length ? [{ key: 'ungrouped', label: null, items: ungrouped }] : []),
    ...(recent.length ? [{ key: 'recent', label: 'Recent', items: recent }] : []),
    ...(frequent.length ? [{ key: 'frequent', label: 'Frequently used', items: frequent }] : []),
    ...Array.from(providers, ([label, items]) => ({ key: 'group:' + label, label, items })),
  ];
}
