import { z } from 'zod';
import {
  slots,
  slotLabels,
  type Catalog,
  type Part,
  type Slot,
} from './catalog';

const key = z.string().regex(/^[a-z][a-z0-9-]{0,49}$/);
export const stepFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Минимум 3 символа')
    .max(80, 'Максимум 80 символов'),
  notes: z.string().trim().max(500, 'Максимум 500 символов'),
  minutes: z
    .number()
    .int()
    .min(1, 'От 1 минуты')
    .max(240, 'Максимум 240 минут'),
  dependencies: z.array(key).max(29),
  tools: z.array(key).max(10),
});
export type StepForm = z.infer<typeof stepFormSchema>;
export const stepSchema = stepFormSchema.extend({ id: key });
export type Step = z.infer<typeof stepSchema>;
export const draftSchema = z
  .object({
    version: z.literal(1),
    catalogVersion: z.literal(1),
    name: z.string().trim().min(3).max(80),
    deviceId: key,
    selections: z.record(
      z.enum(slots),
      z.object({ partId: key, owned: z.boolean() }),
    ),
    ownedTools: z.array(key).max(10),
    rate: z.number().int().min(0).max(10000),
    steps: z.array(stepSchema).min(1).max(30),
    completed: z.array(key).max(30),
  })
  .superRefine((data, ctx) => {
    const error = (message: string) =>
      ctx.addIssue({ code: 'custom', message });
    const ids = new Set(data.steps.map((step) => step.id));
    if (ids.size !== data.steps.length)
      error('Идентификаторы шагов должны быть уникальны');
    for (const step of data.steps) {
      if (new Set(step.dependencies).size !== step.dependencies.length)
        error('Зависимости повторяются');
      if (new Set(step.tools).size !== step.tools.length)
        error('Инструменты повторяются');
      if (step.dependencies.some((dep) => !ids.has(dep)))
        error('Зависимость указывает на отсутствующий шаг');
      if (step.dependencies.includes(step.id))
        error('Шаг не может зависеть от себя');
    }
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const visit = (id: string): boolean => {
      if (visiting.has(id)) return false;
      if (visited.has(id)) return true;
      visiting.add(id);
      const step = data.steps.find((item) => item.id === id);
      if (step && !step.dependencies.every(visit)) return false;
      visiting.delete(id);
      visited.add(id);
      return true;
    };
    if (!data.steps.every((step) => visit(step.id)))
      error('Цикл зависимостей: маршрут должен оставаться направленным');
    if (new Set(data.ownedTools).size !== data.ownedTools.length)
      error('Инструменты в наличии повторяются');
    if (new Set(data.completed).size !== data.completed.length)
      error('Выполненные шаги повторяются');
    for (const id of data.completed) {
      const step = data.steps.find((item) => item.id === id);
      if (!step) error('Выполнен отсутствующий шаг');
      else if (!step.dependencies.every((dep) => data.completed.includes(dep)))
        error('Выполненный шаг имеет незавершённые зависимости');
    }
  });
export type Draft = z.infer<typeof draftSchema>;
export type Conflict = { slot: Slot; reason: string };

export function partReason(
  data: Draft,
  part: Part,
  catalog: Catalog,
): string | null {
  const device = catalog.devices.find((item) => item.id === data.deviceId);
  if (!device || !part.deviceIds.includes(data.deviceId))
    return `Формат ${part.name} не подходит устройству ${device?.name ?? data.deviceId}.`;
  if (part.slot === 'controller' && part.protocol !== device.protocol)
    return `Ревизия устройства требует ${device.protocol}, у модуля ${part.protocol}.`;
  if (part.slot === 'keys') {
    const core = catalog.parts.find(
      (item) => item.id === data.selections.controller.partId,
    );
    if (core && part.protocol !== core.protocol)
      return `Клавиши используют ${part.protocol}, контроллер ${core.name} — ${core.protocol}. Протоколы различаются.`;
  }
  return null;
}
export function conflicts(data: Draft, catalog: Catalog): Conflict[] {
  return slots.flatMap((slot) => {
    const part = catalog.parts.find(
      (item) => item.id === data.selections[slot].partId,
    );
    const reason =
      !part || part.slot !== slot
        ? `Неизвестная деталь для раздела «${slotLabels[slot]}».`
        : partReason(data, part, catalog);
    return reason ? [{ slot, reason }] : [];
  });
}
export function validateDraft(input: unknown, catalog: Catalog): Draft {
  const data = draftSchema.parse(input);
  if (!catalog.devices.some((device) => device.id === data.deviceId))
    throw new Error('Устройство отсутствует в каталоге');
  for (const slot of slots)
    if (
      !catalog.parts.some(
        (part) =>
          part.id === data.selections[slot].partId && part.slot === slot,
      )
    )
      throw new Error('Неизвестная деталь или неверный раздел');
  if (
    [...data.ownedTools, ...data.steps.flatMap((step) => step.tools)].some(
      (id) => !catalog.tools.some((tool) => tool.id === id),
    )
  )
    throw new Error('Инструмент отсутствует в каталоге');
  if (data.completed.length && conflicts(data, catalog).length)
    throw new Error(
      'Нельзя импортировать выполненные шаги с несовместимыми деталями',
    );
  return data;
}
export function orderedSteps(data: Draft): Step[] {
  const result: Step[] = [];
  const added = new Set<string>();
  const add = (step: Step) => {
    if (added.has(step.id)) return;
    added.add(step.id);
    step.dependencies.forEach((dep) => {
      const parent = data.steps.find((item) => item.id === dep);
      if (parent) add(parent);
    });
    result.push(step);
  };
  data.steps.forEach(add);
  return result;
}
export function makeDraft(deviceId: string, catalog: Catalog): Draft {
  const device = catalog.devices.find((item) => item.id === deviceId);
  if (!device) throw new Error('Устройство не найдено');
  return validateDraft(
    {
      version: 1,
      catalogVersion: 1,
      name: `Маршрут ${device.name}`,
      deviceId,
      selections: Object.fromEntries(
        slots.map((slot) => [
          slot,
          { partId: device.defaults[slot], owned: slot !== 'controller' },
        ]),
      ),
      ownedTools: ['bits'],
      rate: 900,
      completed: [],
      steps: [
        {
          id: 'assess',
          title: 'Зафиксировать исходное состояние',
          minutes: 4,
          dependencies: [],
          tools: [],
          notes:
            'Демо: запишите условный результат диагностики. Это не инструкция для реальной техники.',
        },
        {
          id: 'access',
          title: 'Подготовить доступ к модулю',
          minutes: 8,
          dependencies: ['assess'],
          tools: ['bits'],
          notes:
            'Учебный этап доступа. Реальные способы разборки здесь не описаны.',
        },
        {
          id: 'replace',
          title: 'Заменить выбранный модуль',
          minutes: 12,
          dependencies: ['access'],
          tools: ['bits', 'tweezers'],
          notes: 'Демо: условная замена совместимой детали из каталога.',
        },
        {
          id: 'verify',
          title: 'Проверить результат',
          minutes: 6,
          dependencies: ['replace'],
          tools: ['tester'],
          notes:
            'Отметьте условную проверку. Приложение не получает показания настоящего устройства.',
        },
        {
          id: 'finish',
          title: 'Завершить маршрут',
          minutes: 5,
          dependencies: ['verify'],
          tools: ['bits'],
          notes: 'Зафиксируйте завершение учебного плана.',
        },
      ],
    },
    catalog,
  );
}
export function scenario(
  data: Draft,
  kind: 'economy' | 'upgrade',
  catalog: Catalog,
): Draft {
  const device = catalog.devices.find((item) => item.id === data.deviceId)!;
  return validateDraft(
    {
      ...data,
      completed: [],
      selections: Object.fromEntries(
        slots.map((slot) => [
          slot,
          {
            partId: device[kind === 'economy' ? 'defaults' : 'upgrade'][slot],
            owned: kind === 'economy' && slot !== 'controller',
          },
        ]),
      ),
    },
    catalog,
  );
}
export function totals(data: Draft, catalog: Catalog) {
  const minutes = data.steps.reduce((sum, step) => sum + step.minutes, 0);
  const parts = slots.reduce(
    (sum, slot) =>
      sum +
      (data.selections[slot].owned
        ? 0
        : catalog.parts.find(
            (part) => part.id === data.selections[slot].partId,
          )!.price * 100),
    0,
  );
  const toolIds = [...new Set(data.steps.flatMap((step) => step.tools))];
  const tools = toolIds.reduce(
    (sum, id) =>
      sum +
      (data.ownedTools.includes(id)
        ? 0
        : catalog.tools.find((tool) => tool.id === id)!.price * 100),
    0,
  );
  const labor = Math.round((minutes * data.rate * 100) / 60);
  return {
    minutes,
    parts,
    tools,
    labor,
    total: parts + tools + labor,
    reused: slots.filter((slot) => data.selections[slot].owned).length,
    toolIds,
  };
}
export function saveStep(data: Draft, step: Step, catalog: Catalog): Draft {
  return validateDraft(
    {
      ...data,
      completed: [],
      steps: data.steps.some((item) => item.id === step.id)
        ? data.steps.map((item) => (item.id === step.id ? step : item))
        : [...data.steps, step],
    },
    catalog,
  );
}
export function deleteStep(data: Draft, id: string, catalog: Catalog): Draft {
  if (data.steps.some((step) => step.dependencies.includes(id)))
    throw new Error('Сначала уберите ссылки на этот шаг в зависимостях');
  return validateDraft(
    {
      ...data,
      completed: [],
      steps: data.steps.filter((step) => step.id !== id),
    },
    catalog,
  );
}
export function completeStep(data: Draft, id: string, catalog: Catalog): Draft {
  const step = data.steps.find((item) => item.id === id);
  if (!step) throw new Error('Шаг не найден');
  if (conflicts(data, catalog).length)
    throw new Error('Сначала устраните конфликты совместимости');
  if (!step.dependencies.every((dep) => data.completed.includes(dep)))
    throw new Error('Сначала завершите зависимости шага');
  return validateDraft(
    { ...data, completed: [...new Set([...data.completed, id])] },
    catalog,
  );
}
export function undoStep(data: Draft, id: string, catalog: Catalog): Draft {
  const removed = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of data.steps)
      if (
        !removed.has(step.id) &&
        step.dependencies.some((dep) => removed.has(dep))
      ) {
        removed.add(step.id);
        changed = true;
      }
  }
  return validateDraft(
    { ...data, completed: data.completed.filter((item) => !removed.has(item)) },
    catalog,
  );
}
export function importDraft(text: string, catalog: Catalog): Draft {
  if (new TextEncoder().encode(text).length > 256 * 1024)
    throw new Error('Файл больше 256 КБ');
  return validateDraft(JSON.parse(text), catalog);
}
export function errorText(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues.map((issue) => issue.message).join('. ');
  return error instanceof Error
    ? error.message
    : 'Не удалось выполнить действие';
}
export function money(kopeks: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(kopeks / 100);
}
