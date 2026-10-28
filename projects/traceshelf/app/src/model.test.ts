import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDependency,
  ancestorPaths,
  createDemo,
  deleteEntry,
  getHealth,
  reviewEntry,
  saveEntry,
  validateWorkspace,
  type EntryValues,
  type Workspace,
} from './model';
import {
  importWorkspace,
  readWorkspace,
  STORAGE_KEY,
  writeWorkspace,
} from './repository';

const today = '2026-10-28';
const values = (
  title: string,
  kind: EntryValues['kind'] = 'source',
  dependencies: string[] = [],
): EntryValues => ({
  title,
  kind,
  dependencies,
  owner: 'QA',
  body: 'Проверяемая запись',
  url: '',
  checkedAt: today,
  freshForDays: 30,
});
const empty = (): Workspace => ({
  schemaVersion: 1,
  demo: false,
  nodes: [],
  edges: [],
});
const inputOf = (data: Workspace, id: string): EntryValues => ({
  ...data.nodes.find((node) => node.id === id)!,
  dependencies: data.edges
    .filter((edge) => edge.to === id)
    .map((edge) => edge.from),
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${today}T12:00:00Z`));
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Граф доказательств', () => {
  it('показывает транзитивный путь от устаревшего источника до решения', () => {
    const data = createDemo(today);
    const source = data.nodes[1];
    const decision = data.nodes[6];
    const health = getHealth(data, today);
    expect(health.get(source.id)?.status).toBe('review');
    expect(
      health
        .get(decision.id)
        ?.reasons.some(
          (reason) =>
            reason.path.join('/') ===
            [source.id, data.nodes[4].id, decision.id].join('/'),
        ),
    ).toBe(true);
    expect(health.get(data.nodes[7].id)?.status).toBe('fresh');
  });

  it('обновление источника требует последовательного пересмотра утверждения и решения', () => {
    let data = saveEntry(empty(), values('Первоисточник'));
    const sourceId = data.nodes[0].id;
    data = saveEntry(data, values('Утверждение', 'claim', [sourceId]));
    const claimId = data.nodes[1].id;
    data = saveEntry(data, values('Решение', 'decision', [claimId]));
    const decisionId = data.nodes[2].id;
    expect(getHealth(data).get(decisionId)?.status).toBe('fresh');
    data = saveEntry(
      data,
      { ...inputOf(data, sourceId), body: 'Изменившиеся доказательства' },
      sourceId,
    );
    expect(data.nodes[0].revision).toBe(2);
    expect(getHealth(data).get(claimId)?.status).toBe('review');
    expect(getHealth(data).get(decisionId)?.status).toBe('review');
    expect(() => reviewEntry(data, decisionId)).toThrow('Сначала проверьте');
    data = reviewEntry(data, claimId);
    data = reviewEntry(data, decisionId);
    expect(getHealth(data).get(decisionId)?.status).toBe('fresh');
  });

  it('считает источник устаревшим в день следующей проверки', () => {
    const data = saveEntry(empty(), {
      ...values('Источник на границе срока'),
      checkedAt: '2026-10-27',
      freshForDays: 1,
    });
    expect(getHealth(data, '2026-10-27').get(data.nodes[0].id)?.status).toBe(
      'fresh',
    );
    expect(getHealth(data, today).get(data.nodes[0].id)?.status).toBe('review');
    expect(
      getHealth(reviewEntry(data, data.nodes[0].id)).get(data.nodes[0].id)
        ?.status,
    ).toBe('fresh');
  });

  it('отклоняет цикл, самоссылку, дубликат и отсутствующую запись', () => {
    const data = createDemo(today);
    expect(() =>
      addDependency(data, data.nodes[3].id, data.nodes[6].id),
    ).toThrow('цикл');
    expect(() =>
      addDependency(data, data.nodes[3].id, data.nodes[3].id),
    ).toThrow('цикл');
    expect(() =>
      addDependency(data, data.nodes[3].id, data.nodes[0].id),
    ).toThrow('уже существует');
    expect(() =>
      addDependency(data, data.nodes[3].id, crypto.randomUUID()),
    ).toThrow('несуществующую');
  });

  it('изменение владельца не меняет доказательства, изменение утверждения меняет downstream-статус', () => {
    let data = createDemo(today);
    const claim = data.nodes[5];
    const decision = data.nodes[7];
    data = saveEntry(
      data,
      { ...inputOf(data, claim.id), owner: 'Новый владелец' },
      claim.id,
    );
    expect(getHealth(data).get(decision.id)?.status).toBe('fresh');
    data = saveEntry(
      data,
      { ...inputOf(data, claim.id), body: 'Другой смысл утверждения' },
      claim.id,
    );
    expect(getHealth(data).get(decision.id)?.status).toBe('review');
  });

  it('новая транзитивная зависимость требует пересмотра, даже без изменения текста', () => {
    let data = createDemo(today);
    data = addDependency(data, data.nodes[5].id, data.nodes[0].id);
    expect(getHealth(data).get(data.nodes[7].id)?.status).toBe('review');
    data = reviewEntry(data, data.nodes[5].id);
    expect(getHealth(data).get(data.nodes[7].id)?.status).toBe('review');
    data = reviewEntry(data, data.nodes[7].id);
    expect(getHealth(data).get(data.nodes[7].id)?.status).toBe('fresh');
  });

  it('удаление первоисточника не оставляет решение ложноположительно актуальным', () => {
    const data = createDemo(today);
    const next = deleteEntry(data, data.nodes[2].id);
    expect(next.edges.some((edge) => edge.from === data.nodes[2].id)).toBe(
      false,
    );
    expect(getHealth(next).get(data.nodes[7].id)?.status).toBe('unsupported');
    expect(() => reviewEntry(next, data.nodes[7].id)).toThrow(
      'без первоисточника',
    );
  });

  it('обходит ромбовидный граф без дублирования предков', () => {
    let data = saveEntry(empty(), values('Общий источник'));
    const source = data.nodes[0].id;
    data = saveEntry(data, values('Первое утверждение', 'claim', [source]));
    data = saveEntry(data, values('Второе утверждение', 'claim', [source]));
    data = saveEntry(
      data,
      values('Общее решение', 'decision', [data.nodes[1].id, data.nodes[2].id]),
    );
    const ancestors = ancestorPaths(data, data.nodes[3].id);
    expect(ancestors.size).toBe(3);
    expect(ancestors.get(source)).toHaveLength(3);
  });

  it('не принимает небезопасный URL, будущую дату и повторяющиеся ID', () => {
    expect(() =>
      saveEntry(empty(), {
        ...values('Небезопасная ссылка'),
        url: 'javascript:alert(1)',
      }),
    ).toThrow();
    expect(() =>
      saveEntry(empty(), {
        ...values('Будущая проверка'),
        checkedAt: '2026-10-29',
      }),
    ).toThrow();
    const data = createDemo(today);
    expect(() =>
      validateWorkspace({ ...data, nodes: [...data.nodes, data.nodes[0]] }),
    ).toThrow('не должны повторяться');
  });
});

describe('Локальный адаптер и импорт', () => {
  it('некорректный JSON, оборванные ссылки и циклы не повреждают сохранённые данные', () => {
    const data = writeWorkspace(createDemo(today));
    const original = localStorage.getItem(STORAGE_KEY);
    expect(() => importWorkspace('{broken')).toThrow('корректным JSON');
    expect(() =>
      importWorkspace(
        JSON.stringify({
          ...data,
          edges: [{ from: crypto.randomUUID(), to: data.nodes[3].id }],
        }),
      ),
    ).toThrow('несуществующую');
    expect(() =>
      importWorkspace(
        JSON.stringify({
          ...data,
          edges: [
            ...data.edges,
            { from: data.nodes[6].id, to: data.nodes[3].id },
          ],
        }),
      ),
    ).toThrow('цикл');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  });

  it('экспортированный JSON можно восстановить без потери связей и версий', () => {
    const data = createDemo(today);
    const restored = importWorkspace(JSON.stringify(data));
    expect(restored).toEqual(data);
    expect(readWorkspace()).toEqual(data);
  });

  it('не перезаписывает повреждённое хранилище демонабором', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid');
    expect(() => readWorkspace()).toThrow('повреждены');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('invalid');
  });

  it('ошибка квоты не теряет прежний снимок', () => {
    const data = writeWorkspace(createDemo(today));
    const original = localStorage.getItem(STORAGE_KEY);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => writeWorkspace(deleteEntry(data, data.nodes[0].id))).toThrow(
      'Не удалось сохранить',
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  });

  it('отклоняет большой файл до записи в хранилище', () => {
    writeWorkspace(createDemo(today));
    const original = localStorage.getItem(STORAGE_KEY);
    expect(() => importWorkspace(' '.repeat(1_048_577))).toThrow('1 МБ');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  });
});
