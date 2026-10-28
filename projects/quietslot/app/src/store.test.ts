import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoWorkspace, workspaceSchema } from './model';
import { STORAGE_KEY, useQuietStore } from './store';

beforeEach(() => {
  localStorage.clear();
  useQuietStore.setState({
    workspace: null,
    storageIssue: null,
    selectedUtc: null,
    view: 'heatmap',
  });
});
afterEach(() => vi.restoreAllMocks());

describe('Сохранность локального сценария', () => {
  it('сохраняет команду и историю со схемой версии 1', () => {
    const data = demoWorkspace(false, '2030-01-07');
    useQuietStore.getState().replace(data);
    expect(
      workspaceSchema.parse(JSON.parse(localStorage.getItem(STORAGE_KEY)!)),
    ).toEqual(data);
    expect(useQuietStore.getState().workspace).toEqual(data);
  });
  it('не заменяет прежний снимок при недопустимых данных', () => {
    const data = demoWorkspace();
    useQuietStore.getState().replace(data);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(() =>
      useQuietStore.getState().replace({ ...data, participants: [] }),
    ).toThrow();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    expect(useQuietStore.getState().workspace).toEqual(data);
  });
  it('ошибка квоты сохраняет прежний сценарий и показывает проблему', () => {
    const data = demoWorkspace();
    useQuietStore.getState().replace(data);
    const raw = localStorage.getItem(STORAGE_KEY);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() =>
      useQuietStore.getState().replace({ ...data, history: [] }),
    ).toThrow('Изменения не сохранены');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    expect(useQuietStore.getState().workspace).toEqual(data);
    expect(useQuietStore.getState().storageIssue).toBeTruthy();
  });
  it('изменение сценария сбрасывает устаревший выбор', () => {
    useQuietStore.getState().replace(demoWorkspace());
    useQuietStore.getState().select('2030-01-07T00:00:00.000Z');
    useQuietStore.getState().replace(demoWorkspace(true));
    expect(useQuietStore.getState().selectedUtc).toBeNull();
  });
});
