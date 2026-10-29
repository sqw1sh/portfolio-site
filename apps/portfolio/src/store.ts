import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
      // Theme persistence is optional; a denied/quota-limited store must not break navigation.
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          try {
            return localStorage.getItem(name);
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, value);
          } catch {
            /* Keep the in-memory theme. */
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {
            /* Non-essential preference. */
          }
        },
      })),
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
