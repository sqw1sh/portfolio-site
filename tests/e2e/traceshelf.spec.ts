import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const demoId = (value: number) =>
  `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
const inspector = (page: Page) =>
  page.getByRole('complementary', { name: 'Панель записи' });

async function create(
  page: Page,
  kind: string,
  title: string,
  dependencies: string[] = [],
) {
  await page.getByRole('button', { name: 'Новая запись', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Тип записи').selectOption(kind);
  await dialog.getByLabel('Название').fill(title);
  await dialog.getByLabel('Владелец').fill('QA');
  await dialog
    .getByLabel('Контекст', { exact: true })
    .fill('Тестовое доказательство');
  if (kind !== 'source')
    await dialog
      .getByLabel('На чём основана запись')
      .selectOption(dependencies);
  await dialog
    .getByRole('button', { name: 'Создать запись', exact: true })
    .click();
  await expect(inspector(page).getByRole('heading', { level: 2 })).toHaveText(
    title,
  );
  return page.url().split('/node/')[1];
}

test('TraceShelf: источник → утверждение → решение → пересмотр', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/traceshelf/');
  const source = await create(page, 'source', 'Источник QA');
  const claim = await create(page, 'claim', 'Утверждение QA', [source]);
  const decision = await create(page, 'decision', 'Решение QA', [claim]);
  await expect(
    inspector(page).getByText('Актуально', { exact: true }),
  ).toBeVisible();
  await page.goto(`/traceshelf/#/node/${source}`);
  await inspector(page)
    .getByRole('button', { name: 'Редактировать запись', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Контекст', { exact: true })
    .fill('Источник изменился: другая доказательная база');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Сохранить изменения' })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto(`/traceshelf/#/node/${decision}`);
  await expect(
    inspector(page).getByText('На пересмотре', { exact: true }),
  ).toBeVisible();
  await expect(
    inspector(page).getByText('Изменена запись «Источник QA» (версия 2)'),
  ).toBeVisible();
  await inspector(page)
    .getByRole('button', { name: 'Подтвердить пересмотр' })
    .click();
  await expect(page.getByRole('alert')).toContainText('Сначала проверьте');
  await page.goto(`/traceshelf/#/node/${claim}`);
  await inspector(page)
    .getByRole('button', { name: 'Подтвердить пересмотр' })
    .click();
  await expect(
    inspector(page).getByText('Актуально', { exact: true }),
  ).toBeVisible();
  await page.goto(`/traceshelf/#/node/${decision}`);
  await inspector(page)
    .getByRole('button', { name: 'Подтвердить пересмотр' })
    .click();
  await expect(
    inspector(page).getByText('Актуально', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(inspector(page).getByRole('heading', { level: 2 })).toHaveText(
    'Решение QA',
  );
  await expect(
    inspector(page).getByText('Актуально', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('TraceShelf: таблица, фильтры, отклонение цикла и удаление зависимости', async ({
  page,
}) => {
  await page.goto('/traceshelf/');
  await page.getByRole('button', { name: 'Таблица', exact: true }).click();
  await page.getByLabel('Владелец', { exact: true }).selectOption('Анна');
  await page.getByLabel('Тип', { exact: true }).selectOption('source');
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(3);
  await page.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await page.getByLabel('Поиск записей').fill('Навигация должна');
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(2);
  const recordLink = page.getByRole('link', {
    name: 'Открыть утверждение: Навигация должна быть короче',
    exact: true,
  });
  await recordLink.focus();
  await page.keyboard.press('Enter');
  await expect(inspector(page).getByRole('heading', { level: 2 })).toHaveText(
    'Навигация должна быть короче',
  );
  await inspector(page)
    .getByLabel('Добавить зависимость')
    .selectOption(demoId(7));
  await inspector(page).getByRole('button', { name: 'Связать записи' }).click();
  await expect(page.getByRole('alert')).toContainText('создаёт цикл');
  await inspector(page)
    .getByRole('button', { name: 'Удалить связь: Интервью с пользователями' })
    .click();
  await expect(
    inspector(page).getByText('Нет источников', { exact: true }),
  ).toBeVisible();
  await inspector(page)
    .getByRole('button', { name: 'Подтвердить пересмотр' })
    .click();
  await expect(page.getByRole('alert')).toContainText('без первоисточника');
});

test('TraceShelf: импорт и экспорт сохраняют пространство, неверный файл его не повреждает', async ({
  page,
}) => {
  await page.goto('/traceshelf/');
  await page
    .getByRole('link', { name: 'Открыть источник: Интервью с пользователями' })
    .waitFor();
  const fileInput = page.getByLabel('Файл пространства JSON');
  await fileInput.setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":1,"nodes":[]}'),
  });
  await expect(page.getByRole('alert')).toContainText('Некорректный формат');
  await expect(
    page.getByRole('link', {
      name: 'Открыть источник: Интервью с пользователями',
    }),
  ).toBeVisible();
  await page.locator('summary').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспорт JSON', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const exported = await readFile(path!, 'utf8');
  expect(JSON.parse(exported).nodes).toHaveLength(8);
  await page.locator('summary').click();
  await page
    .getByRole('button', { name: 'Пустое пространство', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Создать пустое пространство', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Всё начинается с источника' }),
  ).toBeVisible();
  await fileInput.setInputFiles({
    name: 'workspace.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exported),
  });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Импортировать JSON', exact: true })
    .click();
  await expect(
    page.getByRole('link', {
      name: 'Открыть источник: Интервью с пользователями',
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('link', {
      name: 'Открыть решение: Упростить первый запуск',
    }),
  ).toBeVisible();
});

test('TraceShelf: валидация формы, удаление записи и отсутствие горизонтального переполнения', async ({
  page,
}) => {
  await page.goto('/traceshelf/');
  await page.getByRole('button', { name: 'Новая запись', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('button', { name: 'Создать запись', exact: true })
    .click();
  await expect(dialog.getByText('Минимум 3 символа')).toBeVisible();
  await dialog.getByLabel('Название').fill('Тест безопасной формы');
  await dialog.getByLabel('Владелец').fill('QA');
  await dialog
    .getByLabel('Ссылка на первоисточник')
    .fill('javascript:alert(1)');
  await dialog
    .getByRole('button', { name: 'Создать запись', exact: true })
    .click();
  await expect(
    dialog.getByText('Укажите полный http(s)-адрес или оставьте поле пустым'),
  ).toBeVisible();
  await dialog.getByLabel('Тип записи').selectOption('claim');
  await dialog
    .getByRole('button', { name: 'Создать запись', exact: true })
    .click();
  await expect(
    inspector(page).getByText('Нет источников', { exact: true }),
  ).toBeVisible();
  await inspector(page)
    .getByRole('button', { name: 'Удалить запись', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Удалить запись', exact: true })
    .click();
  await expect(inspector(page)).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
      `Ширина ${width}`,
    ).toBe(false);
  }
});

test('портфолио открывает рабочий TraceShelf вместо заглушки', async ({
  page,
}) => {
  await page.goto('/#/projects/traceshelf');
  await expect(page.getByText('Рабочий MVP', { exact: true })).toBeVisible();
  await page
    .getByRole('link', { name: 'Открыть TraceShelf', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Карта решений.' }),
  ).toBeVisible();
  await expect(
    page.getByText('Вымышленные данные для знакомства с инструментом.'),
  ).toBeVisible();
});
