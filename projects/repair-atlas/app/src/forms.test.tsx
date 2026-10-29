import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StepDialog, SettingsDialog } from './forms';
import { catalog } from './catalog';
import { makeDraft, saveStep } from './model';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(cleanup);
it('показывает ошибки формы шага и не вызывает сохранение', async () => {
  const save = vi.fn();
  const user = userEvent.setup();
  render(
    <StepDialog
      data={makeDraft('mica', catalog)}
      catalog={catalog}
      onSave={save}
      onClose={vi.fn()}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Сохранить шаг' }));
  expect(await screen.findByText('Минимум 3 символа')).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});
it('показывает причину отклонения цикла и сохраняет форму открытой', async () => {
  const data = makeDraft('mica', catalog);
  const user = userEvent.setup();
  const close = vi.fn();
  render(
    <StepDialog
      step={data.steps[0]}
      data={data}
      catalog={catalog}
      onSave={(step) => {
        saveStep(data, step, catalog);
      }}
      onClose={close}
    />,
  );
  await user.click(screen.getByRole('checkbox', { name: 'Завершить маршрут' }));
  await user.click(screen.getByRole('button', { name: 'Сохранить шаг' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Цикл зависимостей',
  );
  expect(close).not.toHaveBeenCalled();
});
it('сохраняет название и нулевую ставку как числовое значение', async () => {
  const save = vi.fn();
  const user = userEvent.setup();
  render(
    <SettingsDialog
      data={makeDraft('mica', catalog)}
      onSave={save}
      onClose={vi.fn()}
    />,
  );
  await user.clear(screen.getByLabelText('Название плана'));
  await user.type(screen.getByLabelText('Название плана'), 'Мой маршрут');
  await user.clear(screen.getByLabelText('Условная ставка, ₽/час'));
  await user.type(screen.getByLabelText('Условная ставка, ₽/час'), '0');
  await user.click(screen.getByRole('button', { name: 'Сохранить параметры' }));
  expect(save).toHaveBeenCalledWith({ name: 'Мой маршрут', rate: 0 });
});
