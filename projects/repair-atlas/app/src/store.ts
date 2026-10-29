import { create } from 'zustand';
import { draftSchema, type Draft } from './model';

export const STORAGE_KEY = 'repair-atlas.draft.v1';
let lastStored: string | null = null;
function read(): { draft: Draft | null; issue: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    lastStored = raw;
    return {
      draft: raw ? draftSchema.parse(JSON.parse(raw)) : null,
      issue: null,
    };
  } catch {
    return {
      draft: null,
      issue:
        'Сохранённый план не удалось прочитать. Исходные данные не перезаписаны. Импортируйте JSON или загрузите демо.',
    };
  }
}
export const useAtlasStore = create<{
  draft: Draft | null;
  issue: string | null;
  replace: (draft: Draft) => void;
}>((set) => ({
  ...read(),
  replace: (input) => {
    const draft = draftSchema.parse(input);
    let conflict = false;
    try {
      conflict = localStorage.getItem(STORAGE_KEY) !== lastStored;
      if (conflict) throw new Error('Storage conflict');
      const raw = JSON.stringify(draft);
      localStorage.setItem(STORAGE_KEY, raw);
      lastStored = raw;
    } catch {
      const message = conflict
        ? 'План изменён в другой вкладке. Перезагрузите страницу перед сохранением; новые данные не перезаписаны.'
        : 'Не удалось сохранить план в этом браузере';
      set({
        issue: message,
      });
      throw new Error(message);
    }
    set({ draft, issue: null });
  },
}));
