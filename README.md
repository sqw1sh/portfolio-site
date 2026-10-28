# Портфолио

Адаптивный сайт на React + TypeScript + Vite. Личные данные, контакты и три проекта пока обозначены заглушками.

## Запуск

Node.js 24 и npm 11. Зависимости закреплены в package-lock.json.

```sh
npm ci
npm run dev
```

Открыть адрес из вывода Vite. Светлая и тёмная темы, мобильная навигация, фильтры проектов и страницы концептов работают локально без внешних API. Шрифты включены в сборку.

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
packages/                    место для общих пакетов при необходимости
tests/e2e/                   браузерные сценарии
docs/                        стек, публикация, QA и инструменты
.github/workflows/           CI и ручная публикация на GitHub Pages
```

## Замена заглушек

- Личные данные и контакты: `apps/portfolio/src/App.tsx` (Hero, About, Contact).
- Содержание проектов: `apps/portfolio/public/content/projects.json`.
- Графические превью: `apps/portfolio/src/ProjectVisual.tsx`.
- Цвета и адаптивная вёрстка: `apps/portfolio/src/styles.css`.

Навигация использует HashRouter для статического хостинга. Публикация запускается вручную после создания удалённого репозитория и настройки GitHub Pages; сейчас сайт не опубликован.

Подробнее: [правила](AGENTS.md), [стек](docs/stack.md), [QA](docs/qa.md), [публикация](docs/deployment.md).
