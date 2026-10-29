import { beforeEach, describe, expect, it, vi } from 'vitest';
import { catalog } from './catalog';
import { makeDraft } from './model';

describe('RePair Atlas: хранилище', () => {
  it('отклоняет запись поверх нового плана другой вкладки', async () => {
    const { useAtlasStore, STORAGE_KEY } = await import('./store');
    const data = makeDraft('mica', catalog);
    useAtlasStore.getState().replace(data);
    const fresh = { ...data, name: 'План из другой вкладки' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    expect(() =>
      useAtlasStore.getState().replace({ ...data, rate: 0 }),
    ).toThrow('другой вкладке');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(fresh);
    expect(useAtlasStore.getState().draft).toEqual(data);
  });
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });
  it('сохраняет и восстанавливает план', async () => {
    const { useAtlasStore } = await import('./store');
    const data = makeDraft('mica', catalog);
    useAtlasStore.getState().replace(data);
    vi.resetModules();
    const fresh = await import('./store');
    expect(fresh.useAtlasStore.getState().draft).toEqual(data);
  });
  it('не перезаписывает повреждённую запись при чтении', async () => {
    localStorage.setItem('repair-atlas.draft.v1', '{broken');
    const { useAtlasStore } = await import('./store');
    expect(useAtlasStore.getState().draft).toBeNull();
    expect(useAtlasStore.getState().issue).toContain('не перезаписаны');
    expect(localStorage.getItem('repair-atlas.draft.v1')).toBe('{broken');
  });
  it('при переполнении сохраняет предыдущий план в памяти и хранилище', async () => {
    const { useAtlasStore } = await import('./store');
    const data = makeDraft('mica', catalog);
    useAtlasStore.getState().replace(data);
    const before = localStorage.getItem('repair-atlas.draft.v1');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota', 'QuotaExceededError');
    });
    expect(() =>
      useAtlasStore.getState().replace({ ...data, name: 'Новый план' }),
    ).toThrow(/сохранить/);
    expect(useAtlasStore.getState().draft).toEqual(data);
    expect(localStorage.getItem('repair-atlas.draft.v1')).toBe(before);
  });
  it('некорректные данные не заменяют сохранённый план', async () => {
    const { useAtlasStore } = await import('./store');
    const data = makeDraft('mica', catalog);
    useAtlasStore.getState().replace(data);
    expect(() =>
      useAtlasStore.getState().replace({ ...data, completed: ['finish'] }),
    ).toThrow();
    expect(useAtlasStore.getState().draft).toEqual(data);
  });
});
