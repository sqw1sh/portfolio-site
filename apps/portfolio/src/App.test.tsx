import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import projects from '../public/content/projects.json';
import { App } from './App';
import { usePreferences } from './store';

function renderApp(route = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  usePreferences.setState({ theme: 'light' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => projects }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Портфолио', () => {
  it('фильтрует концепты и возвращает полный список', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole('link', { name: 'QuietSlot — открыть проект' });
    const filters = screen.getByRole('group', { name: 'Фильтр проектов' });
    await user.click(
      within(filters).getByRole('button', { name: 'Приложения' }),
    );
    expect(
      screen.queryByRole('link', { name: 'QuietSlot — открыть проект' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'TraceShelf — открыть проект' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'RePair Atlas — открыть концепт' }),
    ).toBeInTheDocument();
    await user.click(
      within(filters).getByRole('button', { name: 'Эксперименты' }),
    );
    expect(
      screen.getByRole('link', { name: 'QuietSlot — открыть проект' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'TraceShelf — открыть проект' }),
    ).not.toBeInTheDocument();
    await user.click(
      within(filters).getByRole('button', { name: /Все проекты/ }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Показано проектов: 3',
    );
  });

  it('открывает страницу концепта и возвращается к проектам', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('link', { name: 'TraceShelf — открыть проект' }),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'TraceShelf.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Рабочий MVP')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Все проекты' }));
    expect(
      screen.getByRole('heading', { level: 1, name: /От идеи/ }),
    ).toBeInTheDocument();
  });

  it('показывает ошибку для неверной схемы и позволяет повторить загрузку', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'broken' }],
    } as Response);
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось загрузить проекты',
    );
    await user.click(
      screen.getByRole('button', { name: /Попробовать ещё раз/ }),
    );
    expect(
      await screen.findByRole('link', { name: 'QuietSlot — открыть проект' }),
    ).toBeInTheDocument();
  });

  it('переключает тему и сохраняет настройку', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(
      screen.getByRole('button', { name: 'Включить тёмную тему' }),
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(
      JSON.parse(localStorage.getItem('portfolio-preferences')!).state.theme,
    ).toBe('dark');
    await user.click(
      screen.getByRole('button', { name: 'Включить светлую тему' }),
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('закрывает мобильное меню по Escape и возвращает фокус', async () => {
    const user = userEvent.setup();
    renderApp();
    const button = screen.getByRole('button', { name: 'Открыть меню' });
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('обрабатывает неизвестный адрес проекта', async () => {
    renderApp('/projects/unknown');
    expect(
      await screen.findByRole('heading', { name: /Кажется, этой/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
