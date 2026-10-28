# Ревью кода и безопасности

Проверено 2026-10-28: исходники React/TypeScript, загрузка JSON, браузерное хранилище, сборка Vite, npm-зависимости и GitHub Actions. Подтверждённых критических, высоких или средних уязвимостей в рассмотренном коде не обнаружено. Это ревью и автоматические проверки, а не гарантия отсутствия всех уязвимостей.

## Низкий риск — устранено

### SEC-01. Не было Content Security Policy

- Правило: REACT-CSP-001.
- Место исправления: `apps/portfolio/vite.config.ts:14`.
- Ранее HTML приложения не задавал CSP. Без неё отсутствовал дополнительный браузерный барьер для сторонних скриптов при возможной HTML-инъекции; сама возможность такой инъекции в приложении не обнаружена.
- Исправлено: при production-сборке добавляется meta CSP с `script-src 'self'`, `style-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`. Нет `unsafe-inline` и `unsafe-eval`.
- `assetsInlineLimit: 0` (`apps/portfolio/vite.config.ts:9`) сохраняет шрифты отдельными файлами, поэтому разрешать data: для шрифтов не требуется. Тема теперь меняет color-scheme через CSS.
- Ограничение: meta CSP не поддерживает frame-ancestors и не заменяет HTTP-заголовки. Защита от встраивания должна настраиваться на уровне хостинга, если появятся чувствительные функции. Сейчас сайт статический, без учётных записей и форм отправки.

### SEC-02. Actions использовали перемещаемые теги

- Место исправления: `.github/workflows/ci.yml:14`, `.github/workflows/pages.yml:14`.
- Ранее `uses: actions/checkout@v4` и остальные actions ссылались на теги. Смена тега upstream могла изменить исполняемый код без изменения репозитория.
- Исправлено: все actions закреплены полными SHA, проверенными через refs официальных репозиториев actions/*. Добавлен Dependabot для npm и GitHub Actions.
- Checkout использует `persist-credentials: false`; build имеет только contents: read. pages: write и id-token: write выданы отдельному deploy-job, без установки npm-пакетов. Таймауты заданий — 15 минут.

## Замечания по качеству — устранено

### QA-01. E2E проверяли dev-сервер вместо production-сборки

- Место: `playwright.config.ts:10`, `playwright.config.ts:25`.
- Ошибки CSP, production-ресурсов и сборки могли оставаться незамеченными.
- Исправлено: E2E используют vite preview на отдельном порту 4175. И CI, и публикация сначала собирают сайт, затем проверяют именно production. Ошибки консоли учитываются в основном сценарии. Локально прошли 6 компонентных и 10 браузерных проверок.

### QA-02. Фокус мобильной навигации

- Место: `apps/portfolio/src/App.tsx:43`, `apps/portfolio/src/App.tsx:733`.
- После открытия меню клавиатурный фокус оставался на кнопке после навигации; после выбора секции мог остаться в скрытом меню.
- Исправлено: фокус переходит в открытое меню, затем в выбранную секцию. Escape возвращает его на кнопку меню. Удалена принудительная smooth-прокрутка из ссылки «Наверх», чтобы учитывать reduced motion.

## Проверенные границы

- Содержимое JSON рендерится обычным JSX; dangerouslySetInnerHTML, eval и прямых HTML-sinks в приложении нет.
- JSON проверяется Zod до использования: `apps/portfolio/src/projects.ts:28`.
- Значение темы из localStorage ограничено light/dark: `apps/portfolio/src/store.ts:19`. Авторизация и секреты в хранилище отсутствуют.
- Внешние скрипты, аналитика и сторонние CDN не подключены. Шрифты обслуживаются с сайта.
- В production не создаются source maps. Каталоги сборки, окружение, зависимости и результаты тестов исключены из Git.
- npm audit: 0 известных уязвимостей в момент проверки. Результат зависит от актуальности базы advisories.
- Перед push выполнен поиск типичных форматов токенов и закрытых ключей в публикуемых файлах; совпадений не найдено.

## Первичные источники

- [GitHub: безопасное использование Actions и SHA pinning](https://docs.github.com/en/actions/reference/security/secure-use).
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP).
- [MDN: ограничения frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).
