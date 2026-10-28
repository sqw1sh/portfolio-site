import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

export const usePreferences = create<{
  theme: Theme;
  toggleTheme: () => void;
}>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'portfolio-preferences',
      version: 1,
      merge: (persisted, current) => {
        const stored = persisted as { theme?: unknown } | undefined;
        return {
          ...current,
          theme: stored?.theme === 'dark' ? 'dark' : 'light',
        };
      },
    },
  ),
);
