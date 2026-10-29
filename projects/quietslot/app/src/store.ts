import { create } from 'zustand';
import { workspaceSchema, type Workspace } from './model';

export const STORAGE_KEY = 'quietslot.workspace.v1';
let lastStored: string | null = null;
function initial(): {
  workspace: Workspace | null;
  storageIssue: string | null;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    lastStored = raw;
    if (!raw) return { workspace: null, storageIssue: null };
    const result = workspaceSchema.safeParse(JSON.parse(raw));
    if (!result.success) throw new Error('Invalid workspace');
    return { workspace: result.data, storageIssue: null };
  } catch {
    return {
      workspace: null,
      storageIssue:
        'Не удалось прочитать сохранённое пространство. Данные не перезаписаны.',
    };
  }
}
export const useQuietStore = create<{
  workspace: Workspace | null;
  storageIssue: string | null;
  selectedUtc: string | null;
  view: 'heatmap' | 'table';
  replace: (data: Workspace) => void;
  select: (utc: string | null) => void;
  setView: (view: 'heatmap' | 'table') => void;
}>((set) => ({
  ...initial(),
  selectedUtc: null,
  view: 'heatmap',
  replace: (input) => {
    const data = workspaceSchema.parse(input);
    let conflict = false;
    try {
      conflict = localStorage.getItem(STORAGE_KEY) !== lastStored;
      if (conflict) throw new Error('Storage conflict');
      const raw = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, raw);
      lastStored = raw;
    } catch {
      const message = conflict
        ? 'Сценарий изменён в другой вкладке. Перезагрузите страницу перед сохранением; новые данные не перезаписаны.'
        : 'Изменения не сохранены: локальное хранилище недоступно.';
      set({
        storageIssue: message,
      });
      throw new Error(message);
    }
    set({ workspace: data, selectedUtc: null, storageIssue: null });
  },
  select: (selectedUtc) => set({ selectedUtc }),
  setView: (view) => set({ view }),
}));
