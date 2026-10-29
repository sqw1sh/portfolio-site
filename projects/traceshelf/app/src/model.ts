import { z } from 'zod';

export function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export const kindLabels = {
  source: 'Источник',
  claim: 'Утверждение',
  decision: 'Решение',
} as const;
export const statusLabels = {
  fresh: 'Актуально',
  review: 'На пересмотре',
  unsupported: 'Нет источников',
} as const;
export type Kind = keyof typeof kindLabels;
export type Status = keyof typeof statusLabels;

const referenceSchema = z
  .string()
  .max(500)
  .refine((value) => {
    if (!value) return true;
    try {
      return ['https:', 'http:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, 'Укажите полный http(s)-адрес или оставьте поле пустым');

export const entryFieldsSchema = z.object({
  kind: z.enum(['source', 'claim', 'decision']),
  title: z
    .string()
    .trim()
    .min(3, 'Минимум 3 символа')
    .max(120, 'Максимум 120 символов'),
  body: z.string().trim().max(4000, 'Максимум 4000 символов'),
  owner: z
    .string()
    .trim()
    .min(1, 'Укажите владельца')
    .max(60, 'Максимум 60 символов'),
  url: referenceSchema,
  checkedAt: z.iso.date('Укажите корректную дату'),
  freshForDays: z
    .number('Укажите число дней')
    .int()
    .min(1, 'Не меньше 1 дня')
    .max(3650, 'Не больше 3650 дней'),
});

export const entryFormSchema = entryFieldsSchema
  .extend({
    dependencies: z.array(z.uuid()).max(200),
  })
  .refine((value) => value.kind !== 'source' || value.checkedAt <= todayISO(), {
    path: ['checkedAt'],
    message: 'Дата проверки не может быть в будущем',
  });

const nodeSchema = entryFieldsSchema.extend({
  id: z.uuid(),
  revision: z.number().int().min(1).max(1_000_000_000),
  reviewedVersions: z.record(z.uuid(), z.number().int().min(1)),
  needsReview: z.boolean().optional(),
});
const workspaceSchema = z
  .object({
    schemaVersion: z.literal(1),
    demo: z.boolean(),
    nodes: z.array(nodeSchema).max(200),
    edges: z.array(z.object({ from: z.uuid(), to: z.uuid() })).max(800),
  })
  .strict();

export type EntryValues = z.infer<typeof entryFormSchema>;
export type Entry = z.infer<typeof nodeSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Reason = { message: string; path: string[] };
export type Health = { status: Status; reasons: Reason[] };

export function validateWorkspace(
  input: unknown,
  today = todayISO(),
): Workspace {
  const parsed = workspaceSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      'Некорректный формат JSON: нужна схема TraceShelf v1 (до 200 записей и 800 связей).',
    );
  const data = parsed.data;
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  if (byId.size !== data.nodes.length)
    throw new Error('ID записей не должны повторяться.');
  if (
    data.nodes.some((node) => node.kind === 'source' && node.checkedAt > today)
  )
    throw new Error('Дата проверки источника не может быть в будущем.');
  const seen = new Set<string>();
  const degrees = new Map(data.nodes.map((node) => [node.id, 0]));
  const children = new Map<string, string[]>();
  for (const edge of data.edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to))
      throw new Error('Связь ссылается на несуществующую запись.');
    if (byId.get(edge.to)?.kind === 'source')
      throw new Error('Источник не может зависеть от других записей.');
    const key = `${edge.from}:${edge.to}`;
    if (seen.has(key)) throw new Error('Эта связь уже существует.');
    seen.add(key);
    degrees.set(edge.to, degrees.get(edge.to)! + 1);
    children.set(edge.from, [...(children.get(edge.from) ?? []), edge.to]);
  }
  const queue = [...degrees]
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id);
  let visited = 0;
  for (let index = 0; index < queue.length; index++) {
    visited++;
    for (const child of children.get(queue[index]) ?? []) {
      degrees.set(child, degrees.get(child)! - 1);
      if (degrees.get(child) === 0) queue.push(child);
    }
  }
  if (visited !== data.nodes.length)
    throw new Error(
      'Связь создаёт цикл: запись не может зависеть от самой себя через цепочку.',
    );
  return data;
}

// One shortest provenance path per ancestor; never enumerate all paths in a DAG.
export function ancestorPaths(
  data: Workspace,
  id: string,
): Map<string, string[]> {
  const paths = new Map<string, string[]>();
  const queue = [{ id, path: [id] }];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const edge of data.edges.filter((item) => item.to === current.id)) {
      if (paths.has(edge.from)) continue;
      const path = [edge.from, ...current.path];
      paths.set(edge.from, path);
      queue.push({ id: edge.from, path });
    }
  }
  return paths;
}

function snapshot(data: Workspace, id: string) {
  const ancestors = ancestorPaths(data, id);
  return Object.fromEntries(
    data.nodes
      .filter((node) => ancestors.has(node.id))
      .map((node) => [node.id, node.revision]),
  );
}

export function getHealth(
  data: Workspace,
  today = todayISO(),
): Map<string, Health> {
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const result = new Map<string, Health>();
  const evaluate = (node: Entry): Health => {
    const cached = result.get(node.id);
    if (cached) return cached;
    let health: Health;
    if (node.kind === 'source') {
      const expiry = shiftDate(node.checkedAt, node.freshForDays);
      health =
        expiry <= today
          ? {
              status: 'review',
              reasons: [
                { message: `Истёк срок проверки: ${expiry}`, path: [node.id] },
              ],
            }
          : { status: 'fresh', reasons: [] };
    } else {
      const ancestors = ancestorPaths(data, node.id);
      const sources = [...ancestors.keys()]
        .map((id) => byId.get(id)!)
        .filter((entry) => entry.kind === 'source');
      const reasons: Reason[] = [];
      // Older v1 snapshots may predate explicit dependency-change tracking.
      if (Object.keys(node.reviewedVersions).some((id) => !ancestors.has(id)))
        reasons.push({
          message:
            'Прежние зависимости удалены. Проверьте состав доказательств.',
          path: [node.id],
        });
      if (node.needsReview)
        reasons.push({
          message:
            'Изменён состав зависимостей. Проверьте доказательства заново.',
          path: [node.id],
        });
      if (!sources.length)
        reasons.push({
          message: 'Добавьте зависимость, ведущую к первоисточнику.',
          path: [node.id],
        });
      for (const [id, path] of ancestors) {
        const ancestor = byId.get(id)!;
        if (
          ancestor.kind === 'source' &&
          shiftDate(ancestor.checkedAt, ancestor.freshForDays) <= today
        )
          reasons.push({
            message: `Устарел источник «${ancestor.title}»`,
            path,
          });
        if (node.reviewedVersions[id] !== ancestor.revision)
          reasons.push({
            message:
              node.reviewedVersions[id] === undefined
                ? `Новая зависимость: «${ancestor.title}»`
                : `Изменена запись «${ancestor.title}» (версия ${ancestor.revision})`,
            path,
          });
      }
      for (const edge of data.edges.filter((item) => item.to === node.id)) {
        const parent = byId.get(edge.from)!;
        if (parent.kind !== 'source' && evaluate(parent).status !== 'fresh')
          reasons.push({
            message: `Сначала пересмотрите «${parent.title}»`,
            path: [parent.id, node.id],
          });
      }
      health = {
        status: !sources.length
          ? 'unsupported'
          : reasons.length
            ? 'review'
            : 'fresh',
        reasons,
      };
    }
    result.set(node.id, health);
    return health;
  };
  data.nodes.forEach(evaluate);
  return result;
}

export function saveEntry(
  data: Workspace,
  input: EntryValues,
  id?: string,
): Workspace {
  const fields = entryFormSchema.parse(input);
  const previous = data.nodes.find((node) => node.id === id);
  if (id && !previous) throw new Error('Запись уже удалена.');
  if (previous && previous.kind !== fields.kind)
    throw new Error('Тип существующей записи менять нельзя.');
  const nodeId = previous?.id ?? crypto.randomUUID();
  const evidenceChanged =
    previous &&
    ['title', 'body', 'url'].some(
      (key) =>
        previous[key as 'title' | 'body' | 'url'] !==
        fields[key as 'title' | 'body' | 'url'],
    );
  const { dependencies, ...values } = fields;
  const previousDependencies = data.edges
    .filter((edge) => edge.to === nodeId)
    .map((edge) => edge.from);
  const dependenciesChanged =
    !!previous &&
    (previousDependencies.length !== dependencies.length ||
      previousDependencies.some(
        (dependency) => !dependencies.includes(dependency),
      ));
  const node: Entry = {
    ...values,
    id: nodeId,
    revision:
      (previous?.revision ?? 1) +
      (evidenceChanged || dependenciesChanged ? 1 : 0),
    reviewedVersions: previous?.reviewedVersions ?? {},
    needsReview: previous?.needsReview || dependenciesChanged,
  };
  const next = validateWorkspace({
    ...data,
    nodes: previous
      ? data.nodes.map((item) => (item.id === nodeId ? node : item))
      : [...data.nodes, node],
    edges: [
      ...data.edges.filter((edge) => edge.to !== nodeId),
      ...dependencies.map((from) => ({ from, to: nodeId })),
    ],
  });
  if (!previous) node.reviewedVersions = snapshot(next, nodeId);
  // validateWorkspace clones the parsed structure; update that returned node, not the input.
  if (!previous)
    next.nodes.find((item) => item.id === nodeId)!.reviewedVersions =
      node.reviewedVersions;
  return next;
}

export function addDependency(
  data: Workspace,
  dependentId: string,
  evidenceId: string,
) {
  return validateWorkspace({
    ...data,
    nodes: data.nodes.map((node) =>
      node.id === dependentId
        ? { ...node, revision: node.revision + 1, needsReview: true }
        : node,
    ),
    edges: [...data.edges, { from: evidenceId, to: dependentId }],
  });
}

export function removeDependency(
  data: Workspace,
  dependentId: string,
  evidenceId: string,
) {
  return validateWorkspace({
    ...data,
    nodes: data.nodes.map((node) =>
      node.id === dependentId &&
      data.edges.some(
        (edge) => edge.to === dependentId && edge.from === evidenceId,
      )
        ? { ...node, revision: node.revision + 1, needsReview: true }
        : node,
    ),
    edges: data.edges.filter(
      (edge) => !(edge.to === dependentId && edge.from === evidenceId),
    ),
  });
}

export function reviewEntry(data: Workspace, id: string): Workspace {
  const node = data.nodes.find((item) => item.id === id);
  if (!node) throw new Error('Запись не найдена.');
  if (node.kind === 'source')
    return validateWorkspace({
      ...data,
      nodes: data.nodes.map((item) =>
        item.id === id ? { ...item, checkedAt: todayISO() } : item,
      ),
    });
  const health = getHealth(data);
  const ancestors = ancestorPaths(data, id);
  if (
    ![...ancestors.keys()].some(
      (key) => data.nodes.find((item) => item.id === key)?.kind === 'source',
    )
  )
    throw new Error('Нельзя подтвердить запись без первоисточника.');
  if (
    data.edges
      .filter((edge) => edge.to === id)
      .some((edge) => health.get(edge.from)?.status !== 'fresh')
  )
    throw new Error('Сначала проверьте все зависимости этой записи.');
  return validateWorkspace({
    ...data,
    nodes: data.nodes.map((item) =>
      item.id === id
        ? { ...item, reviewedVersions: snapshot(data, id), needsReview: false }
        : item,
    ),
  });
}

export function deleteEntry(data: Workspace, id: string) {
  return validateWorkspace({
    ...data,
    nodes: data.nodes
      .filter((node) => node.id !== id)
      .map((node) =>
        data.edges.some((edge) => edge.from === id && edge.to === node.id)
          ? { ...node, revision: node.revision + 1, needsReview: true }
          : node,
      ),
    edges: data.edges.filter((edge) => edge.from !== id && edge.to !== id),
  });
}

export function createDemo(today = todayISO()): Workspace {
  const id = (number: number) =>
    `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
  const entries: {
    title: string;
    kind: Kind;
    owner: string;
    age?: number;
    body: string;
  }[] = [
    {
      title: 'Интервью с пользователями',
      kind: 'source',
      owner: 'Анна',
      age: 6,
      body: 'ДЕМОДАННЫЕ. Вымышленное исследование: участникам не хватало понятного первого шага. Это пример, а не результат реального исследования.',
    },
    {
      title: 'События воронки',
      kind: 'source',
      owner: 'Марк',
      age: 45,
      body: 'ДЕМОДАННЫЕ. Вымышленная сводка событий. Срок проверки истёк: проверьте источник, чтобы продолжить пересмотр решения.',
    },
    {
      title: 'Гайд по доступности',
      kind: 'source',
      owner: 'Анна',
      age: 3,
      body: 'ДЕМОДАННЫЕ. Пример внутренних требований: ключевые действия доступны без мыши.',
    },
    {
      title: 'Навигация должна быть короче',
      kind: 'claim',
      owner: 'Анна',
      body: 'ДЕМОДАННЫЕ. Утверждение на основе интервью; показывает связь между источником и решением.',
    },
    {
      title: 'Второй шаг требует внимания',
      kind: 'claim',
      owner: 'Марк',
      body: 'ДЕМОДАННЫЕ. Утверждение зависит от устаревшей сводки событий.',
    },
    {
      title: 'Ключевые действия без мыши',
      kind: 'claim',
      owner: 'Анна',
      body: 'ДЕМОДАННЫЕ. Утверждение для проверки доступности интерфейса.',
    },
    {
      title: 'Упростить первый запуск',
      kind: 'decision',
      owner: 'Марк',
      body: 'ДЕМОДАННЫЕ. Решение объединяет два утверждения. Посмотрите цепочку: устаревший источник → утверждение → решение.',
    },
    {
      title: 'Единая навигация с клавиатуры',
      kind: 'decision',
      owner: 'Анна',
      body: 'ДЕМОДАННЫЕ. Пример актуального решения с проверенным первоисточником.',
    },
  ];
  const nodes: Entry[] = entries.map((entry, index) => ({
    ...entry,
    id: id(index + 1),
    revision: 1,
    reviewedVersions: {},
    url: '',
    checkedAt: shiftDate(today, -(entry.age ?? 0)),
    freshForDays: 30,
  }));
  const data: Workspace = {
    schemaVersion: 1,
    demo: true,
    nodes,
    edges: [
      [1, 4],
      [2, 5],
      [3, 6],
      [4, 7],
      [5, 7],
      [6, 8],
    ].map(([from, to]) => ({ from: id(from), to: id(to) })),
  };
  data.nodes.forEach((node) => {
    node.reviewedVersions = snapshot(data, node.id);
  });
  return validateWorkspace(data, today);
}
