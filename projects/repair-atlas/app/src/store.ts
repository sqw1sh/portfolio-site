import { create } from 'zustand';
import { draftSchema, type Draft } from './model';

export const STORAGE_KEY = 'repair-atlas.draft.v1';
function read(): { draft: Draft | null; issue: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      set({
        issue: 'Хранилище недоступно или заполнено. Изменения не сохранены.',
      });
      throw new Error('Не удалось сохранить план в этом браузере');
    }
    set({ draft, issue: null });
  },
}));
