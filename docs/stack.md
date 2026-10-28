# Принятый стек

| Задача                  | Решение                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Язык и UI               | TypeScript (strict), React                                                         |
| Статические сайты и SPA | Vite + React Router                                                                |
| SSR, серверные функции  | Next.js вместо Vite, по сложности проекта                                          |
| Запросы и кеш сервера   | TanStack React Query                                                               |
| Клиентское состояние    | Zustand                                                                            |
| Стили                   | Tailwind CSS; Astryx — альтернатива после проверки точного продукта                |
| Формы и схемы           | React Hook Form + Zod                                                              |
| Проверки                | ESLint, Prettier, TypeScript; Vitest + Testing Library и Playwright при реализации |

В сайте используются React Router (HashRouter), React Query для JSON-каталога концептов, Zustand с сохранением темы и Zod для проверки данных. Tailwind подключён через Vite; стили дополняет обычный CSS. Формы пока не нужны: контакты оставлены заглушками, React Hook Form установлен для будущих задач. Next.js не устанавливается в Vite-приложение; решение принимается отдельно для каждого проекта.

Источники для проверки: [Vite](https://vite.dev/guide/), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
