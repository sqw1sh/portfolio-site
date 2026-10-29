import { expect, test, type Locator, type Page } from '@playwright/test';

const viewports = [
  { width: 320, height: 740 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

async function checkDialog(page: Page, dialog: Locator) {
  await expect(dialog).toBeVisible();
  const geometry = await dialog.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return {
      left: box.left,
      top: box.top,
      right: box.right,
      bottom: box.bottom,
      width: innerWidth,
      height: innerHeight,
      overflow: el.scrollWidth - el.clientWidth,
      fieldsOutside: [...el.querySelectorAll('input,textarea,select,button')]
        .filter((field) => field.checkVisibility())
        .filter((field) => {
          const rect = field.getBoundingClientRect();
          return rect.left < box.left - 1 || rect.right > box.right + 1;
        })
        .map((field) => field.getAttribute('aria-label') || field.textContent),
    };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.height + 1);
  expect(
    Math.abs(geometry.left - (geometry.width - geometry.right)),
  ).toBeLessThan(3);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.fieldsOutside).toEqual([]);
  for (const button of await dialog.locator('footer button').all()) {
    await button.scrollIntoViewIfNeeded();
    // Scroll positions are rounded to device pixels; allow a subpixel edge.
    await expect(button).toBeInViewport({ ratio: 0.99 });
    const clipped = await button.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()].some(
        (r) =>
          r.left < box.left - 1 ||
          r.right > box.right + 1 ||
          r.top < box.top - 1 ||
          r.bottom > box.bottom + 1,
      );
    });
    expect(clipped).toBe(false);
  }
}

for (const scenario of [
  { path: '/traceshelf/', open: 'Новая запись', save: 'Создать запись' },
  {
    path: '/quietslot/',
    open: 'Добавить участника',
    save: 'Сохранить участника',
  },
  {
    path: '/repair-atlas/',
    open: 'Параметры плана',
    save: 'Сохранить параметры',
  },
  { path: '/repair-atlas/', open: 'Добавить шаг', save: 'Сохранить шаг' },
]) {
  test(`формы и кнопки без обрезки: ${scenario.path} ${scenario.open}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(scenario.path);
    const trigger = page.getByRole('button', {
      name: scenario.open,
      exact: true,
    });
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => document.fonts.ready);
      await trigger.click();
      const dialog = page.getByRole('dialog');
      await checkDialog(page, dialog);
      if (scenario.open !== 'Параметры плана') {
        await dialog
          .getByRole('button', { name: scenario.save, exact: true })
          .click();
        await expect(dialog).toBeVisible();
        await checkDialog(page, dialog);
      }
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
  });
}

test('профиль: контакты, фото и логотипы доступны на узком экране', async ({
  page,
}) => {
  await page.goto('/');
  const links = page.getByRole('navigation', { name: 'Контакты и профили' });
  await expect(links.getByRole('link')).toHaveCount(7);
  await expect(links.getByRole('link', { name: /VK/ })).toHaveAttribute(
    'href',
    'https://vk.ru/6qw1sh',
  );
  await expect(links.getByRole('link', { name: /FL.ru/ })).toHaveAttribute(
    'href',
    'https://www.fl.ru/users/babyyoda/',
  );
  await expect(
    links.getByRole('link', { name: /Основная почта/ }),
  ).toHaveAttribute('href', 'mailto:zebraalaalaa@gmail.com');
  await expect(page.getByAltText('Родион Шаповалов')).toBeVisible();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await links.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await links.evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
    for (const link of await links.getByRole('link').all()) {
      expect(
        await link.evaluate((el) => el.scrollWidth - el.clientWidth),
      ).toBeLessThanOrEqual(1);
    }
  }
  const assets = await page
    .locator('.profile-portrait,.profile-links img')
    .evaluateAll(async (images) => {
      return Promise.all(
        images.map(async (image) => {
          const img = image as HTMLImageElement;
          await img.decode();
          return img.naturalWidth > 0;
        }),
      );
    });
  expect(assets).toEqual(Array(6).fill(true));
});

test('широкие таблицы прокручиваются внутри страницы и доступны с клавиатуры', async ({
  page,
}) => {
  const scenarios = [
    {
      path: '/traceshelf/',
      toggle: 'Таблица',
      region: 'Прокручиваемая таблица записей',
    },
    {
      path: '/quietslot/',
      toggle: 'Таблица вариантов',
      region: 'Прокручиваемая таблица вариантов',
    },
    {
      path: '/repair-atlas/#/catalog',
      region: 'Прокручиваемая матрица совместимости',
    },
  ];
  for (const scenario of scenarios) {
    await page.goto(scenario.path);
    if (scenario.toggle)
      await page
        .getByRole('button', { name: scenario.toggle, exact: true })
        .click();
    const region = page.getByRole('region', { name: scenario.region });
    await expect(region.getByRole('table')).toBeVisible();
    for (const width of [320, 390, 768, 1366, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      await region.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        )
        .toBeLessThanOrEqual(1);
      await region.focus();
      await expect(region).toBeFocused();
      await region.evaluate((el) => {
        el.scrollLeft = 0;
      });
      const overflow = await region.evaluate(
        (el) => el.scrollWidth > el.clientWidth,
      );
      await page.keyboard.press('ArrowRight');
      if (overflow)
        await expect
          .poll(() => region.evaluate((el) => el.scrollLeft))
          .toBeGreaterThan(0);
    }
  }
});
