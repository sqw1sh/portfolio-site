import { afterEach, expect, it, vi } from 'vitest';
import { usePreferences } from './store';

afterEach(() => vi.restoreAllMocks());
it('переключает тему без необработанной ошибки при запрете записи', () => {
  usePreferences.setState({ theme: 'light' });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Denied', 'SecurityError');
  });
  expect(() => usePreferences.getState().toggleTheme()).not.toThrow();
  expect(usePreferences.getState().theme).toBe('dark');
});
