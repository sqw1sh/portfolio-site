import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('длинные пользовательские подписи не ломают мобильные страницы', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const fits = async () =>
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
  await page.goto('/repair-atlas/');
  await page.getByRole('button', { name: 'Добавить шаг', exact: true }).click();
  await page.getByLabel('Название шага').fill('Ш'.repeat(80));
  await page
    .getByRole('button', { name: 'Сохранить шаг', exact: true })
    .click();
  await fits();
  await page.getByRole('link', { name: 'Пройти маршрут', exact: true }).click();
  await fits();
  await page.goto('/quietslot/');
  await page
    .getByRole('button', { name: 'Редактировать Аня', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Имя', { exact: true })
    .fill('Ш'.repeat(40));
  await page
    .getByRole('button', { name: 'Сохранить участника', exact: true })
    .click();
  await fits();
  await page.goto('/traceshelf/');
  await page.getByRole('button', { name: 'Новая запись', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Название').fill('Ш'.repeat(120));
  await page.getByRole('dialog').getByLabel('Владелец').fill('Ш'.repeat(60));
  await page
    .getByRole('button', { name: 'Создать запись', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await fits();
});

for (const path of ['/', '/traceshelf/', '/quietslot/', '/repair-atlas/']) {
  test(`доступность основных экранов: ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const paths =
      path === '/'
        ? ['/', '/#/projects/repair-atlas']
        : path === '/quietslot/'
          ? [path, path + '#/history']
          : path === '/repair-atlas/'
            ? [path, path + '#/compare', path + '#/catalog', path + '#/run']
            : [path];
    for (const current of paths) {
      await page.goto(current);
      await page.getByRole('heading', { level: 1 }).waitFor();
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        result.violations,
        `${current}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, reason: n.failureSummary })) })))}`,
      ).toEqual([]);
    }
    if (path === '/') {
      await page.goto('/');
      await page
        .getByRole('button', { name: 'Включить тёмную тему', exact: true })
        .click();
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(result.violations).toEqual([]);
    }
  });
}

test('текст с HTML не становится исполняемой разметкой в проектах', async ({
  page,
}) => {
  const payload = '<img src=x onerror=alert(1)>';
  const dialogs: string[] = [];
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  await page.goto('/traceshelf/');
  await page.getByRole('button', { name: 'Новая запись', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Название').fill(payload);
  await page.getByRole('dialog').getByLabel('Владелец').fill('QA');
  await page
    .getByRole('button', { name: 'Создать запись', exact: true })
    .click();
  await expect(
    page
      .getByRole('complementary', { name: 'Панель записи' })
      .getByRole('heading', { level: 2 }),
  ).toHaveText(payload);
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  await page.goto('/quietslot/');
  await page
    .getByRole('button', { name: 'Редактировать Аня', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Имя', { exact: true })
    .fill(payload);
  await page
    .getByRole('button', { name: 'Сохранить участника', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: payload, exact: true }),
  ).toBeVisible();
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  await page.goto('/repair-atlas/');
  await page
    .getByRole('button', { name: 'Параметры плана', exact: true })
    .click();
  await page.getByLabel('Название плана', { exact: true }).fill(payload);
  await page
    .getByRole('button', { name: 'Сохранить параметры', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: payload, exact: true }),
  ).toBeVisible();
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  expect(dialogs).toEqual([]);
});

for (const path of ['/', '/traceshelf/', '/quietslot/', '/repair-atlas/']) {
  test(`защита CSP и адаптивность: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(path);
    await page.getByRole('heading', { level: 1 }).waitFor();
    const policy = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    expect(policy).toContain("script-src 'self'");
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.textContent = "document.body.dataset.cspProbe='executed'";
        document.head.append(script);
        return document.body.dataset.cspProbe;
      }),
    ).toBeUndefined();
    for (const width of [320, 360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        ),
        `${path} ${width}`,
      ).toBe(false);
    }
    expect(errors).toEqual([]);
  });
}

test('тема портфолио работает при запрете localStorage', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Denied', 'SecurityError');
    };
    Storage.prototype.getItem = () => {
      throw new DOMException('Denied', 'SecurityError');
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Включить тёмную тему', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page
    .getByRole('button', { name: 'Включить светлую тему', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(errors).toEqual([]);
});

test('RePair Atlas не теряет план при сохранении из устаревшей вкладки', async ({
  page,
  context,
}) => {
  await page.goto('/repair-atlas/');
  await page
    .getByRole('heading', { name: 'Маршрут ремонта', exact: true })
    .waitFor();
  const other = await context.newPage();
  await other.goto('/repair-atlas/');
  await other
    .getByRole('heading', { name: 'Маршрут ремонта', exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: 'Параметры плана', exact: true })
    .click();
  await page
    .getByLabel('Название плана', { exact: true })
    .fill('Свежий план из первой вкладки');
  await page
    .getByRole('button', { name: 'Сохранить параметры', exact: true })
    .click();
  await other
    .getByRole('button', { name: 'Параметры плана', exact: true })
    .click();
  await other
    .getByLabel('Название плана', { exact: true })
    .fill('Устаревший план');
  await other
    .getByRole('button', { name: 'Сохранить параметры', exact: true })
    .click();
  await expect(other.getByRole('dialog').getByRole('alert')).toContainText(
    'другой вкладке',
  );
  await other.reload();
  await expect(
    other.getByRole('heading', {
      name: 'Свежий план из первой вкладки',
      exact: true,
    }),
  ).toBeVisible();
  await other.close();
});

test('QuietSlot не перезаписывает команду из другой вкладки', async ({
  page,
  context,
}) => {
  await page.goto('/quietslot/');
  await page
    .getByRole('heading', { name: 'Ваша команда', exact: true })
    .waitFor();
  const other = await context.newPage();
  await other.goto('/quietslot/');
  await other
    .getByRole('heading', { name: 'Ваша команда', exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: 'Редактировать Аня', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByLabel('Имя', { exact: true })
    .fill('Новая Аня');
  await page
    .getByRole('button', { name: 'Сохранить участника', exact: true })
    .click();
  await other
    .getByRole('button', { name: 'Редактировать Аня', exact: true })
    .click();
  await other
    .getByRole('dialog')
    .getByLabel('Имя', { exact: true })
    .fill('Старая Аня');
  await other
    .getByRole('button', { name: 'Сохранить участника', exact: true })
    .click();
  await expect(other.locator('.q-notice.is-error')).toContainText(
    'другой вкладке',
  );
  await other.reload();
  await expect(
    other.getByRole('heading', { name: 'Новая Аня', exact: true }),
  ).toBeVisible();
  await other.close();
});
