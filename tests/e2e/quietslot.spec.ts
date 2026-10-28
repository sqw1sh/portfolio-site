import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ICAL from 'ical.js';
import { localInfo } from '../../projects/quietslot/app/src/model';

test('QuietSlot: команда → сравнение → ICS → история', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/quietslot/');
  await page
    .getByRole('button', { name: 'Добавить участника', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Имя', { exact: true }).fill('Участник QA');
  await dialog.getByLabel('Часовой пояс IANA').fill('Europe/Berlin');
  await dialog.getByRole('button', { name: 'Сохранить участника' }).click();
  await expect(
    page.getByRole('heading', { name: 'Участник QA', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Начиная с даты').fill('2030-01-07');
  await page.getByLabel('Длительность', { exact: true }).selectOption('45');
  await page
    .getByText('Название, часовой пояс и окно поиска', { exact: true })
    .click();
  await page.getByLabel('Название встречи').fill('Синхронизация команды QA');
  await page
    .getByRole('button', { name: 'Подобрать время', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Варианты пересчитаны');
  await page.getByRole('button', { name: /Вариант 2/ }).click();
  await expect(page.getByRole('button', { name: /Вариант 2/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByText(/Почему такой штраф:/).click();
  await expect(page.getByText(/Итог усредняется по людям/)).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать .ics', exact: true }).click();
  const download = await downloadPromise;
  const text = await readFile((await download.path())!, 'utf8');
  const calendar = new ICAL.Component(ICAL.parse(text));
  const events = calendar.getAllSubcomponents('vevent');
  expect(events).toHaveLength(1);
  const event = new ICAL.Event(events[0]);
  expect(event.summary).toBe('Синхронизация команды QA');
  expect(
    event.endDate.toJSDate().getTime() - event.startDate.toJSDate().getTime(),
  ).toBe(45 * 60_000);
  expect(event.description).toContain('Участник QA');
  await page.getByRole('button', { name: 'В историю', exact: true }).click();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /История/ })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Синхронизация команды QA',
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', {
      name: 'Синхронизация команды QA',
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('QuietSlot: валидация участника, строгие ограничения и удаление', async ({
  page,
}) => {
  await page.goto('/quietslot/');
  await page
    .getByRole('button', { name: 'Добавить участника', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Сохранить участника' }).click();
  await expect(dialog.getByText('Укажите имя')).toBeVisible();
  await dialog.getByLabel('Имя', { exact: true }).fill('Проверка');
  await dialog.getByLabel('Часовой пояс IANA').fill('Mars/Olympus');
  await dialog.getByRole('button', { name: 'Сохранить участника' }).click();
  await expect(
    dialog.getByText(/Укажите существующий IANA-пояс/),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Редактировать Аня', exact: true })
    .click();
  await page.getByRole('dialog').getByLabel('Начало работы').fill('00:00');
  await page.getByRole('dialog').getByLabel('Конец работы').fill('01:00');
  await page.getByRole('dialog').getByLabel('Только в рабочем окне').check();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Сохранить участника' })
    .click();
  await page.getByLabel('Начиная с даты').fill('2030-01-07');
  await page.getByLabel('Дней поиска').selectOption('1');
  await page
    .getByRole('button', { name: 'Подобрать время', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Общего времени не нашлось' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Скачать .ics', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Удалить Аня', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Отмена', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Аня', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Удалить Аня', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Подтвердить', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Аня', exact: true }),
  ).toHaveCount(0);
});

test('QuietSlot: недельная серия сохраняет локальный час при DST и экспортирует три события', async ({
  page,
}) => {
  await page.goto('/quietslot/');
  await page
    .getByText('Название, часовой пояс и окно поиска', { exact: true })
    .click();
  await page.getByLabel('Только будущие встречи').uncheck();
  await page.getByLabel('Пояс организатора').fill('America/New_York');
  await page.getByLabel('Начиная с даты').fill('2026-10-25');
  await page.getByLabel('Дней поиска').selectOption('1');
  await page.getByLabel('Длительность', { exact: true }).selectOption('30');
  await page.getByLabel('Искать с', { exact: true }).fill('09:00');
  await page.getByLabel('Искать до', { exact: true }).fill('12:00');
  await page.getByRole('button', { name: 'Серия', exact: true }).click();
  await page.getByLabel('Встреч в серии').selectOption('3');
  await page
    .getByRole('button', { name: 'Подобрать время', exact: true })
    .click();
  await expect(
    page.getByText('Все встречи серии', { exact: true }),
  ).toBeVisible();
  await page
    .getByText('Локальное время и нагрузка на всех встречах', { exact: true })
    .click();
  await expect(page.locator('.q-series-team tbody tr')).toHaveCount(9);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать .ics', exact: true }).click();
  const download = await downloadPromise;
  const calendar = new ICAL.Component(
    ICAL.parse(await readFile((await download.path())!, 'utf8')),
  );
  const events = calendar
    .getAllSubcomponents('vevent')
    .map((component) => new ICAL.Event(component));
  expect(events).toHaveLength(3);
  const locals = events.map((event) =>
    localInfo(event.startDate.toJSDate().getTime(), 'America/New_York'),
  );
  expect(new Set(locals.map((local) => local.time)).size).toBe(1);
  expect(new Set(locals.map((local) => local.offset)).size).toBe(2);
});

test('QuietSlot: сценарии, клавиатура, таблица и адаптивность', async ({
  page,
}) => {
  await page.goto('/quietslot/');
  await page.getByRole('heading', { name: 'Ваша команда' }).waitFor();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'К содержимому', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.getByText('Сценарии', { exact: true }).click();
  await page.getByRole('button', { name: /Тихий океан/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Подтвердить', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Юки', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Юки', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Таблица вариантов', exact: true })
    .click();
  const pick = page.getByRole('button', { name: /Выбрать / }).nth(1);
  await pick.focus();
  await page.keyboard.press('Enter');
  await expect(pick).toHaveAttribute('aria-pressed', 'true');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
      `Table ${width}`,
    ).toBe(false);
  }
  await page
    .getByRole('button', { name: 'Тепловая карта', exact: true })
    .click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
      `Heatmap ${width}`,
    ).toBe(false);
  }
});

test('портфолио открывает рабочий QuietSlot вместо заглушки', async ({
  page,
}) => {
  await page.goto('/#/projects/quietslot');
  await expect(page.getByText('Рабочий MVP', { exact: true })).toBeVisible();
  await page
    .getByRole('link', { name: 'Открыть QuietSlot', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Ваша команда' }),
  ).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /История/ })
    .click();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Сохранённые встречи', exact: true }),
  ).toBeVisible();
});

test('QuietSlot: своя команда заменяет демо только после сохранения участника', async ({
  page,
}) => {
  await page.goto('/quietslot/');
  const start = async () => {
    await page.getByText('Сценарии', { exact: true }).click();
    await page.getByRole('button', { name: /Своя команда/ }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Подтвердить', exact: true })
      .click();
  };
  await start();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('heading', { name: 'Аня', exact: true }),
  ).toBeVisible();
  await start();
  await page
    .getByRole('dialog')
    .getByLabel('Имя', { exact: true })
    .fill('Моя команда');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Сохранить участника' })
    .click();
  await expect(
    page.getByText('ЛОКАЛЬНЫЙ СЦЕНАРИЙ', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Аня', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /История/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'История начинается с первой встречи' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('ЛОКАЛЬНЫЙ СЦЕНАРИЙ', { exact: true }),
  ).toBeVisible();
});
