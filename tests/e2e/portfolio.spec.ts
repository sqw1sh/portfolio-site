import { expect, test } from '@playwright/test';

test('фильтры, страница проекта и прямое открытие маршрута', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'От идеи',
  );
  await expect(
    page.getByRole('link', { name: /— открыть (концепт|проект)/ }),
  ).toHaveCount(3);
  await page.getByRole('button', { name: 'Эксперименты', exact: true }).click();
  await expect(
    page.getByRole('link', { name: /— открыть (концепт|проект)/ }),
  ).toHaveCount(1);
  await page.getByRole('link', { name: 'QuietSlot — открыть проект' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'QuietSlot.',
  );
  await page.reload();
  await expect(page.getByText('Рабочий MVP', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Все проекты', exact: true }).click();
  await expect(
    page.getByRole('link', { name: /— открыть (концепт|проект)/ }),
  ).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('тема сохраняется после обновления', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Включить тёмную тему' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Включить светлую тему' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('клавиатура и навигация к секциям', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Перейти к содержимому' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Открыть меню' }).click();
    await expect(
      page
        .getByRole('navigation')
        .getByRole('link', { name: 'Проекты', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Открыть меню' }),
    ).toBeFocused();
    await page.getByRole('button', { name: 'Открыть меню' }).click();
  }
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Стек', exact: true })
    .click();
  await expect(page).toHaveURL(/#\/#stack$/);
  await expect(
    page.getByRole('heading', { name: /Меньше случайностей/ }),
  ).toBeInViewport();
  await expect(page.locator('#stack')).toBeFocused();
  if (testInfo.project.name === 'mobile')
    await expect(
      page.getByRole('button', { name: 'Открыть меню' }),
    ).toHaveAttribute('aria-expanded', 'false');
});

test('нет горизонтального переполнения', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('link', { name: 'TraceShelf — открыть проект' })
    .waitFor();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow, `Горизонтальное переполнение при ${width}px`).toBe(false);
  }
});

test('неизвестный адрес и восстановление навигации', async ({ page }) => {
  await page.goto('/#/projects/missing');
  await expect(
    page.getByRole('heading', { name: /Кажется, этой/ }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'На главную', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'От идеи',
  );
});
