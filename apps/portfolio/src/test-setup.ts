import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(() => ({ matches: false })),
});
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();
