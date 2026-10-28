# Портфолио

Адаптивное портфолио на React + TypeScript + Vite и рабочие локальные MVP TraceShelf и QuietSlot. Личные данные, контакты и RePair Atlas пока обозначены заглушками.

## Запуск

Node.js 24 и npm 11. Зависимости закреплены в package-lock.json.

```sh
npm ci
npm run dev
```

Открыть адрес из вывода Vite. Светлая и тёмная темы, мобильная навигация, фильтры проектов и страницы концептов работают локально без внешних API. Шрифты включены в сборку.

Разработка проектов отдельно: `npm run dev:traceshelf` (порт 4180), `npm run dev:quietslot` (порт 4190). После `npm run build` общий preview обслуживает портфолио, `/traceshelf/` и `/quietslot/` с одного сервера. Сборка всех трёх приложений включена в CI и workflow публикации.

## Проверки и сборка

```sh
npm run check
npx playwright install chromium
npm run build
npm run test:e2e
npm run preview
```

`check` запускает форматирование (без изменения файлов), ESLint, TypeScript и компонентные тесты. E2E запускаются после сборки в Chromium для desktop и мобильной эмуляции через production preview. Production-файлы находятся в `apps/portfolio/dist/`.

## Структура

```text
apps/portfolio/src/           интерфейс, состояние, загрузка данных, стили
apps/portfolio/public/       favicon и content/projects.json
projects/                    идеи проектов, места для кода и материалов
projects/traceshelf/app/     рабочий MVP: граф доказательств, локальный адаптер
projects/quietslot/app/      рабочий MVP: планировщик встреч, UTC/IANA, ICS
packages/                    место для общих пакетов при необходимости
tests/e2e/                   браузерные сценарии
docs/                        стек, публикация, QA и инструменты
.github/workflows/           CI и ручная публикация на GitHub Pages
```

## Замена заглушек

- Личные данные и контакты: `apps/portfolio/src/App.tsx` (Hero, About, Contact).
- Содержание проектов: `apps/portfolio/public/content/projects.json`.
- Графические превью: `apps/portfolio/src/ProjectVisual.tsx`.
- Скриншот работающего TraceShelf: `apps/portfolio/public/projects/traceshelf-preview.png`.
- Цвета и адаптивная вёрстка: `apps/portfolio/src/styles.css`.

Репозиторий: [sqw1sh/portfolio-site](https://github.com/sqw1sh/portfolio-site). Адрес GitHub Pages: [sqw1sh.github.io/portfolio-site](https://sqw1sh.github.io/portfolio-site/). Навигация использует HashRouter для статического хостинга. Обновления публикуются вручную через workflow Publish portfolio после проверок production-сборки.

Подробнее: [правила](AGENTS.md), [стек](docs/stack.md), [QA](docs/qa.md), [публикация](docs/deployment.md).
