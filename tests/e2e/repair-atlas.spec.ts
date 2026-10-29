import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { catalog } from '../../projects/repair-atlas/app/src/catalog';
import { makeDraft } from '../../projects/repair-atlas/app/src/model';

test('RePair Atlas: выбрать устройство → конфликт → совместимость → экспорт', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/repair-atlas/');
  await page
    .getByRole('button', { name: /Orbit \/ Pad Настольный контроллер/ })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Подтвердить', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Маршрут Orbit / Pad', exact: true }),
  ).toBeVisible();
  await page
    .getByLabel('Модуль клавиш', { exact: true })
    .selectOption('keys-a');
  await expect(
    page.getByText(/Формат Keys A · штатный не подходит/),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Пройти маршрут', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Завершить шаг 1', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Совместимость', exact: true })
    .click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(
    page.getByRole('row', { name: /Keys A · штатный/ }),
  ).toContainText('не подходит');
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Маршрут', exact: true })
    .click();
  await page
    .getByLabel('Модуль клавиш', { exact: true })
    .selectOption('keys-b');
  await expect(
    page.getByText('Детали совместимы', { exact: true }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспорт JSON', exact: true }).click();
  const download = await downloadPromise;
  const file = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(file.deviceId).toBe('orbit');
  expect(file.selections.keys.partId).toBe('keys-b');
  await page.reload();
  await expect(page.getByLabel('Модуль клавиш', { exact: true })).toHaveValue(
    'keys-b',
  );
  expect(errors).toEqual([]);
});

test('RePair Atlas: редактор отклоняет цикл и удаление зависимости', async ({
  page,
}) => {
  await page.goto('/repair-atlas/');
  await page.getByRole('button', { name: 'Добавить шаг', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Сохранить шаг' }).click();
  await expect(dialog.getByText('Минимум 3 символа')).toBeVisible();
  await dialog.getByLabel('Название шага').fill('Итоговая заметка');
  await dialog.getByLabel('Длительность, минут').fill('7');
  await dialog
    .getByRole('checkbox', { name: 'Завершить маршрут', exact: true })
    .check();
  await dialog.getByRole('button', { name: 'Сохранить шаг' }).click();
  await expect(
    page.getByRole('heading', { name: 'Итоговая заметка', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: 'Редактировать шаг Зафиксировать исходное состояние',
      exact: true,
    })
    .click();
  await dialog
    .getByRole('checkbox', { name: 'Итоговая заметка', exact: true })
    .check();
  await dialog.getByRole('button', { name: 'Сохранить шаг' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Цикл зависимостей');
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', {
      name: 'Удалить шаг Зафиксировать исходное состояние',
      exact: true,
    })
    .click();
  await dialog
    .getByRole('button', { name: 'Подтвердить', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toContainText(
    'Сначала уберите ссылки',
  );
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Удалить шаг Итоговая заметка', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Подтвердить', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Итоговая заметка', exact: true }),
  ).toHaveCount(0);
});

test('RePair Atlas: сравнение, применение варианта и пересчёт сметы', async ({
  page,
}) => {
  await page.goto('/repair-atlas/#/compare');
  const cards = page.locator('.r-compare-grid article');
  await expect(cards.nth(0).locator('.r-compare-price')).toHaveText(/3\s?335/);
  await expect(cards.nth(2).locator('.r-compare-price')).toHaveText(/8\s?535/);
  await page
    .getByRole('button', { name: 'Применить вариант 3', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Подтвердить', exact: true })
    .click();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Маршрут', exact: true })
    .click();
  await expect(page.getByLabel('Контроллер', { exact: true })).toHaveValue(
    'core-a-plus',
  );
  await page
    .getByRole('button', { name: 'Параметры плана', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Название плана')
    .fill('Мой вариант QA');
  await page.getByRole('dialog').getByLabel('Условная ставка, ₽/час').fill('0');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Сохранить параметры' })
    .click();
  await page.getByRole('checkbox', { name: /Пинцет/ }).check();
  await page.getByRole('checkbox', { name: /Демо-тестер/ }).check();
  await expect(page.locator('.r-total dd')).toHaveText(/7\s?000/);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Мой вариант QA', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.r-total dd')).toHaveText(/7\s?000/);
});

test('RePair Atlas: прохождение, восстановление, отмена и сброс', async ({
  page,
}) => {
  await page.goto('/repair-atlas/#/run');
  await expect(
    page.getByRole('button', { name: 'Завершить шаг 2', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Завершить шаг 1', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Завершить шаг 2', exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Отменить шаг 2', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Отменить шаг 1', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Завершить шаг 2', exact: true }),
  ).toBeDisabled();
  for (let i = 1; i <= 5; i++)
    await page
      .getByRole('button', { name: `Завершить шаг ${i}`, exact: true })
      .click();
  await expect(
    page.getByRole('heading', { name: 'Маршрут пройден', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Сбросить прохождение', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Отмена', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Маршрут пройден', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Сбросить прохождение', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Подтвердить', exact: true })
    .click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0');
});

test('RePair Atlas: импорт заменяет план только после проверки и подтверждения', async ({
  page,
}) => {
  await page.goto('/repair-atlas/');
  const data = makeDraft('orbit', catalog);
  data.name = 'Импорт QA';
  await page.getByLabel('Файл плана JSON', { exact: true }).setInputFiles({
    name: 'plan.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Отмена', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Маршрут Mica / 75', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Файл плана JSON', { exact: true }).setInputFiles({
    name: 'plan.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Подтвердить', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Импорт QA', exact: true }),
  ).toBeVisible();
  data.completed = ['finish'];
  for (const contents of [
    JSON.stringify(data),
    '{bad',
    'x'.repeat(256 * 1024 + 1),
  ]) {
    await page.getByLabel('Файл плана JSON', { exact: true }).setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from(contents),
    });
    await expect(page.getByRole('alert')).toContainText('Импорт отклонён');
    await expect(
      page.getByRole('heading', { name: 'Импорт QA', exact: true }),
    ).toBeVisible();
  }
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Импорт QA', exact: true }),
  ).toBeVisible();
});

test('RePair Atlas: повреждённое хранилище требует явного восстановления', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('repair-atlas.draft.v1', '{broken'),
  );
  await page.goto('/repair-atlas/');
  await expect(page.getByRole('alert')).toContainText('не перезаписаны');
  expect(
    await page.evaluate(() => localStorage.getItem('repair-atlas.draft.v1')),
  ).toBe('{broken');
  await page
    .getByRole('button', { name: 'Загрузить демоплан', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Подтвердить', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Маршрут ремонта', exact: true }),
  ).toBeVisible();
});

test('RePair Atlas: клавиатура, адаптивность и ссылка из портфолио', async ({
  page,
}) => {
  await page.goto('/#/projects/repair-atlas');
  await expect(page.getByText('Рабочий MVP', { exact: true })).toBeVisible();
  await page
    .getByRole('link', { name: 'Открыть RePair Atlas', exact: true })
    .click();
  await page
    .getByRole('heading', { name: 'Маршрут ремонта', exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole('heading', { name: 'Маршрут ремонта', exact: true })
    .waitFor();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'К содержимому', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  for (const route of ['Маршрут', 'Сравнение', 'Совместимость']) {
    await page
      .getByRole('navigation')
      .getByRole('link', { name: route, exact: true })
      .click();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        ),
        `${route} ${width}`,
      ).toBe(false);
    }
  }
  await page.getByRole('link', { name: 'Пройти маршрут', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});
