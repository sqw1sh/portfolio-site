import { describe, expect, it } from 'vitest';
import { catalog } from './catalog';
import {
  completeStep,
  conflicts,
  deleteStep,
  importDraft,
  makeDraft,
  orderedSteps,
  saveStep,
  scenario,
  totals,
  undoStep,
  validateDraft,
} from './model';

describe('RePair Atlas: инварианты и расчёты', () => {
  it('создаёт совместимые планы двух устройств и альтернативы', () => {
    for (const device of catalog.devices) {
      const data = makeDraft(device.id, catalog);
      expect(conflicts(data, catalog)).toEqual([]);
      expect(conflicts(scenario(data, 'upgrade', catalog), catalog)).toEqual(
        [],
      );
    }
  });
  it('считает фиксированную смету без повторной оплаты инструментов', () => {
    const value = totals(makeDraft('mica', catalog), catalog);
    expect(value).toMatchObject({
      minutes: 35,
      parts: 180000,
      tools: 101000,
      labor: 52500,
      total: 333500,
      reused: 2,
    });
    expect(value.toolIds).toHaveLength(3);
  });
  it('сравнивает варианты при одинаковой работе и инструментах', () => {
    const data = makeDraft('mica', catalog);
    const upgraded = totals(scenario(data, 'upgrade', catalog), catalog);
    expect(upgraded).toMatchObject({
      parts: 700000,
      tools: 101000,
      labor: 52500,
      total: 853500,
      reused: 0,
    });
    expect(totals(scenario(data, 'economy', catalog), catalog).total).toBe(
      333500,
    );
  });
  it('собственные инструменты и нулевая ставка исключают покупки и труд', () => {
    const data = makeDraft('mica', catalog);
    data.ownedTools = catalog.tools.map((tool) => tool.id);
    data.rate = 0;
    expect(totals(data, catalog)).toMatchObject({
      tools: 0,
      labor: 0,
      total: 180000,
    });
  });
  it('различает формат устройства и межмодульный протокол', () => {
    const data = makeDraft('mica', catalog);
    data.selections.keys = { partId: 'keys-b', owned: false };
    expect(conflicts(data, catalog)[0].reason).toContain(
      'Протоколы различаются',
    );
    data.selections.controller = { partId: 'core-b', owned: false };
    expect(conflicts(data, catalog)).toHaveLength(1);
    expect(conflicts(data, catalog)[0].reason).toContain(
      'не подходит устройству',
    );
  });
  it('отклоняет циклы и сохраняет исходный план', () => {
    const data = makeDraft('mica', catalog);
    const original = JSON.stringify(data);
    expect(() =>
      saveStep(data, { ...data.steps[0], dependencies: ['finish'] }, catalog),
    ).toThrow(/Цикл/);
    expect(JSON.stringify(data)).toBe(original);
  });
  it('отклоняет самоссылки, неизвестные и повторяющиеся зависимости', () => {
    const data = makeDraft('mica', catalog);
    for (const dependencies of [['assess'], ['missing'], ['access', 'access']])
      expect(() =>
        saveStep(data, { ...data.steps[0], dependencies }, catalog),
      ).toThrow();
  });
  it('сортирует разветвлённый маршрут по зависимостям, независимо от массива', () => {
    const data = makeDraft('mica', catalog);
    const next = saveStep(
      data,
      {
        id: 'parallel',
        title: 'Параллельная проверка',
        notes: '',
        minutes: 5,
        tools: [],
        dependencies: ['assess'],
      },
      catalog,
    );
    next.steps.reverse();
    const ids = orderedSteps(next).map((step) => step.id);
    expect(ids.indexOf('assess')).toBeLessThan(ids.indexOf('parallel'));
    for (const step of next.steps)
      for (const dep of step.dependencies)
        expect(ids.indexOf(dep)).toBeLessThan(ids.indexOf(step.id));
  });
  it('не разрешает начать шаг до зависимостей или при конфликте', () => {
    const data = makeDraft('mica', catalog);
    expect(() => completeStep(data, 'replace', catalog)).toThrow(/зависимости/);
    data.selections.keys.partId = 'keys-b';
    expect(() => completeStep(data, 'assess', catalog)).toThrow(/конфликты/);
    expect(data.completed).toEqual([]);
  });
  it('проводит полный маршрут и отменяет все транзитивные отметки', () => {
    let data = makeDraft('mica', catalog);
    for (const step of orderedSteps(data))
      data = completeStep(data, step.id, catalog);
    expect(data.completed).toHaveLength(5);
    data = completeStep(data, 'finish', catalog);
    expect(data.completed).toHaveLength(5);
    expect(undoStep(data, 'access', catalog).completed).toEqual(['assess']);
  });
  it('изменение шага сбрасывает прохождение, удаление ссылки блокируется', () => {
    const data = completeStep(makeDraft('mica', catalog), 'assess', catalog);
    expect(
      saveStep(data, { ...data.steps[0], minutes: 10 }, catalog).completed,
    ).toEqual([]);
    expect(() => deleteStep(data, 'assess', catalog)).toThrow(/зависимост/);
    expect(deleteStep(data, 'finish', catalog).steps).toHaveLength(4);
  });
  it('восстанавливает JSON без потери выбранных модулей и прогресса', () => {
    const data = completeStep(makeDraft('orbit', catalog), 'assess', catalog);
    expect(importDraft(JSON.stringify(data), catalog)).toEqual(data);
  });
  it('проверяет каталог, версии, уникальность и целостность прогресса при импорте', () => {
    const data = makeDraft('mica', catalog);
    for (const patch of [
      { version: 2 },
      { catalogVersion: 2 },
      { deviceId: 'unknown' },
      { completed: ['finish'] },
      { steps: [...data.steps, data.steps[0]] },
      { ownedTools: ['unknown'] },
      { rate: -1 },
    ])
      expect(() => validateDraft({ ...data, ...patch }, catalog)).toThrow();
    data.selections.shell.partId = 'core-a';
    expect(() => validateDraft(data, catalog)).toThrow(/раздел/);
  });
  it('не принимает выполненный план с конфликтами и слишком большой файл', () => {
    const data = makeDraft('mica', catalog);
    data.selections.keys.partId = 'keys-b';
    data.completed = ['assess'];
    expect(() => importDraft(JSON.stringify(data), catalog)).toThrow(
      /несовместимыми/,
    );
    expect(() => importDraft('я'.repeat(140000), catalog)).toThrow(/256 КБ/);
    expect(() => importDraft('{oops', catalog)).toThrow();
  });
});
