import { z } from 'zod';

export const slots = ['controller', 'keys', 'shell'] as const;
export type Slot = (typeof slots)[number];
export const slotLabels: Record<Slot, string> = {
  controller: 'Контроллер',
  keys: 'Модуль клавиш',
  shell: 'Корпус',
};
const id = z.string().regex(/^[a-z][a-z0-9-]{0,49}$/);
export const catalogSchema = z.object({
  version: z.literal(1),
  devices: z
    .array(
      z.object({
        id,
        name: z.string(),
        subtitle: z.string(),
        revision: z.string(),
        protocol: z.string(),
        defaults: z.record(z.enum(slots), id),
        upgrade: z.record(z.enum(slots), id),
      }),
    )
    .min(1),
  parts: z.array(
    z.object({
      id,
      name: z.string(),
      slot: z.enum(slots),
      deviceIds: z.array(id),
      protocol: z.string().nullable(),
      price: z.number().int().nonnegative(),
      description: z.string(),
    }),
  ),
  tools: z.array(
    z.object({ id, name: z.string(), price: z.number().int().nonnegative() }),
  ),
});
export type Catalog = z.infer<typeof catalogSchema>;
export type Part = Catalog['parts'][number];
export type Device = Catalog['devices'][number];

export const catalog = catalogSchema.parse({
  version: 1,
  devices: [
    {
      id: 'mica',
      name: 'Mica / 75',
      subtitle: 'Модульная клавиатура',
      revision: 'Ревизия A · 75 клавиш',
      protocol: 'Link-A',
      defaults: { controller: 'core-a', keys: 'keys-a', shell: 'shell-mica' },
      upgrade: {
        controller: 'core-a-plus',
        keys: 'keys-quiet',
        shell: 'shell-clear',
      },
    },
    {
      id: 'orbit',
      name: 'Orbit / Pad',
      subtitle: 'Настольный контроллер',
      revision: 'Ревизия B · 12 клавиш',
      protocol: 'Link-B',
      defaults: { controller: 'core-b', keys: 'keys-b', shell: 'shell-orbit' },
      upgrade: { controller: 'core-b', keys: 'keys-b', shell: 'shell-orbit' },
    },
  ],
  parts: [
    {
      id: 'core-a',
      name: 'Core A',
      slot: 'controller',
      deviceIds: ['mica'],
      protocol: 'Link-A',
      price: 1800,
      description: 'Базовый контроллер для ревизии A.',
    },
    {
      id: 'core-a-plus',
      name: 'Core A+',
      slot: 'controller',
      deviceIds: ['mica'],
      protocol: 'Link-A',
      price: 3200,
      description: 'Альтернативный модуль того же протокола.',
    },
    {
      id: 'core-b',
      name: 'Core B',
      slot: 'controller',
      deviceIds: ['orbit'],
      protocol: 'Link-B',
      price: 2100,
      description: 'Формат платы подходит только Orbit.',
    },
    {
      id: 'keys-a',
      name: 'Keys A · штатный',
      slot: 'keys',
      deviceIds: ['mica'],
      protocol: 'Link-A',
      price: 1200,
      description: 'Сохраняем существующий модуль клавиш.',
    },
    {
      id: 'keys-quiet',
      name: 'Keys A · quiet',
      slot: 'keys',
      deviceIds: ['mica'],
      protocol: 'Link-A',
      price: 1600,
      description: 'Альтернативный набор для Link-A.',
    },
    {
      id: 'keys-b',
      name: 'Keys B · compact',
      slot: 'keys',
      deviceIds: ['mica', 'orbit'],
      protocol: 'Link-B',
      price: 900,
      description:
        'Крепления подходят обоим устройствам, но нужен контроллер Link-B.',
    },
    {
      id: 'shell-mica',
      name: 'Shell · graphite',
      slot: 'shell',
      deviceIds: ['mica'],
      protocol: null,
      price: 1700,
      description: 'Штатный корпус Mica.',
    },
    {
      id: 'shell-clear',
      name: 'Shell · translucent',
      slot: 'shell',
      deviceIds: ['mica'],
      protocol: null,
      price: 2200,
      description: 'Альтернативный корпус Mica.',
    },
    {
      id: 'shell-orbit',
      name: 'Shell · sand',
      slot: 'shell',
      deviceIds: ['orbit'],
      protocol: null,
      price: 1100,
      description: 'Штатный корпус Orbit.',
    },
  ],
  tools: [
    { id: 'bits', name: 'Набор бит', price: 490 },
    { id: 'tweezers', name: 'Пинцет', price: 260 },
    { id: 'tester', name: 'Демо-тестер', price: 750 },
  ],
});

export async function loadCatalog(): Promise<Catalog> {
  return catalogSchema.parse(catalog);
}
