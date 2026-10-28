# GitHub Pages

Сайт собирается в статические файлы. Маршруты используют HashRouter, ресурсы Vite — относительный base `./`. Это позволяет обслуживать сайт по адресу репозитория без серверного fallback для вложенных маршрутов.

## Локально

```sh
npm ci
npm run check
npm run build
npm run test:e2e
npm run preview
```

Перед первым E2E-запуском установить Chromium: `npx playwright install chromium`.

## Публикация

1. Создать удалённый репозиторий и отправить ветку main после запроса владельца.
2. В Settings → Pages → Build and deployment выбрать GitHub Actions.
3. В Actions открыть Publish portfolio и вручную запустить workflow для main.
4. Проверить URL, полученный от deploy-pages: загрузку ресурсов, прямой адрес `/#/projects/traceshelf` и обновление страницы.

Workflow `.github/workflows/pages.yml` уже настроен, автоматически публикацию не запускает. CI при push в main и pull request выполняет check, production-сборку и E2E. Проверка CI в облаке ещё не запускалась.

Next.js с SSR/API требует отдельного серверного хостинга. На Pages возможен только совместимый статический экспорт; ограничения проверять при выборе архитектуры следующего проекта.

Документация: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [HashRouter](https://reactrouter.com/api/declarative-routers/HashRouter).
