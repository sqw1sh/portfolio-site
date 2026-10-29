import { expect, test } from '@playwright/test';

const screens = [
  {
    name: 'Портфолио',
    paths: [
      '/',
      '/#/projects/traceshelf',
      '/#/projects/quietslot',
      '/#/projects/repair-atlas',
    ],
  },
  { name: 'TraceShelf', paths: ['/traceshelf/'] },
  { name: 'QuietSlot', paths: ['/quietslot/', '/quietslot/#/history'] },
  {
    name: 'RePair Atlas',
    paths: [
      '/repair-atlas/',
      '/repair-atlas/#/compare',
      '/repair-atlas/#/catalog',
      '/repair-atlas/#/run',
    ],
  },
];
const widths = [320, 360, 390, 768, 1024, 1280, 1366, 1440, 1920, 2560, 3840];
const heights: Record<number, number> = {
  320: 844,
  360: 800,
  390: 844,
  768: 1024,
  1024: 768,
  1280: 720,
  1366: 768,
  1440: 900,
  1920: 1080,
  2560: 1440,
  3840: 2160,
};

for (const screen of screens) {
  test(`читаемые размеры текста и адаптивность: ${screen.name}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const path of screen.paths) {
      await page.goto(path);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      for (const width of widths) {
        await page.setViewportSize({ width, height: heights[width] });
        await page.evaluate(() => document.fonts.ready);
        await expect
          .poll(
            () =>
              page.evaluate(
                () =>
                  document.documentElement.scrollWidth >
                  document.documentElement.clientWidth,
              ),
            { message: `${path} ${width}px: горизонтальное переполнение` },
          )
          .toBe(false);
        const result = await page.evaluate(() => {
          const small: { text: string; size: number }[] = [];
          const smallControls = Array.from(
            document.querySelectorAll(
              'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]),select,textarea',
            ),
          )
            .filter(
              (el) =>
                el.checkVisibility({
                  checkOpacity: true,
                  checkVisibilityCSS: true,
                }) && parseFloat(getComputedStyle(el).fontSize) < 14,
            )
            .map((el) => ({
              label: el.getAttribute('aria-label') || el.id,
              size: getComputedStyle(el).fontSize,
            }));
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
          );
          while (walker.nextNode()) {
            const node = walker.currentNode;
            const el = node.parentElement;
            if (
              !el ||
              !node.textContent?.trim() ||
              el.closest(
                'svg,script,style,option,[aria-hidden="true"],[role="img"],.sr-only,.r-sr',
              )
            )
              continue;
            if (
              !el.checkVisibility({
                checkOpacity: true,
                checkVisibilityCSS: true,
              })
            )
              continue;
            const box = el.getBoundingClientRect();
            if (box.width <= 1 || box.height <= 1) continue;
            const textRange = document.createRange();
            textRange.selectNodeContents(node);
            const textBox = textRange.getBoundingClientRect();
            if (textBox.width === 0 || textBox.height === 0) continue;
            const style = getComputedStyle(el);
            if (style.clip === 'rect(0px, 0px, 0px, 0px)') continue;
            const size = parseFloat(style.fontSize);
            if (size < 12)
              small.push({ text: node.textContent.trim().slice(0, 70), size });
          }
          return {
            overflow:
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
            small,
            smallControls,
          };
        });
        expect(
          result.overflow,
          `${path} ${width}px: горизонтальное переполнение`,
        ).toBe(false);
        expect(result.small, `${path} ${width}px: текст меньше 12px`).toEqual(
          [],
        );
        expect(
          result.smallControls,
          `${path} ${width}px: мелкий текст полей`,
        ).toEqual([]);
      }
    }
  });
}

test('увеличенные карточки графа не перекрывают друг друга', async ({
  page,
}) => {
  await page.goto('/traceshelf/');
  await page.locator('.ts-graph-node').first().waitFor();
  const layout = await page.locator('.ts-graph-node').evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      const title = node.querySelector('strong')!;
      const footer = node.querySelector('.ts-node-bottom')!;
      return {
        x: box.x,
        y: box.y,
        right: box.right,
        bottom: box.bottom,
        titleSize: parseFloat(getComputedStyle(title).fontSize),
        footerBottom: footer.getBoundingClientRect().bottom,
      };
    }),
  );
  for (let i = 0; i < layout.length; i++) {
    const a = layout[i];
    expect(a.titleSize).toBeGreaterThanOrEqual(14);
    expect(a.footerBottom).toBeLessThanOrEqual(a.bottom);
    for (let j = i + 1; j < layout.length; j++) {
      const b = layout[j];
      expect(
        a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y,
      ).toBe(false);
    }
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => document.fonts.ready);
  const back = page.locator('.ts-sidebar a[href="../"]');
  await expect
    .poll(
      async () => {
        await back.scrollIntoViewIfNeeded();
        const bounds = await back.boundingBox();
        return !!bounds && bounds.y >= 0 && bounds.y + bounds.height <= 768;
      },
      {
        message:
          'Нижняя ссылка боковой панели должна быть доступна на 1366×768',
      },
    )
    .toBe(true);
});
