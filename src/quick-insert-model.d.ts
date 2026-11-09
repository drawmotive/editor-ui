export type QuickInsertTool = 'arrow' | 'rectangle' | 'ellipse' | 'diamond' | 'text';
/** Catalog presentation is independent of the command invoked by the owning host. */
export interface QuickInsertObject<Id extends string = string> {
  id: Id; label: string; aliases: string; group?: string; iconUrl?: string; shortcut?: string;
}
export type QuickInsertUsage = Partial<Record<string, { count: number; lastUsed: number }>>;
export interface QuickInsertHistory { read(): QuickInsertUsage; record(id: string): void; }
export declare const QUICK_INSERT_OBJECTS: readonly QuickInsertObject<QuickInsertTool>[];
export declare function createQuickInsertHistory(getStorage: () => Pick<Storage, 'getItem' | 'setItem'>): QuickInsertHistory;
export declare function quickInsertGroups<Id extends string = QuickInsertTool>(query: string, usage: QuickInsertUsage, catalog?: readonly QuickInsertObject<Id>[]): { key: string; label: string | null; items: QuickInsertObject<Id>[] }[];
