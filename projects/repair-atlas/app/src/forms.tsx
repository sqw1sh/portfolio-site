import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { z } from 'zod';
import {
  stepFormSchema,
  errorText,
  type Step,
  type Draft,
  type StepForm,
} from './model';
import type { Catalog } from './catalog';

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="r-dialog"
      aria-labelledby={titleId}
      onCancel={onClose}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          className="r-icon"
          aria-label="Закрыть диалог"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  description,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [error, setError] = useState('');
  return (
    <Modal title={title} onClose={onClose}>
      <p className="r-dialog-description">{description}</p>
      {error && (
        <p role="alert" className="r-error">
          {error}
        </p>
      )}
      <footer>
        <button className="r-button r-outline" onClick={onClose}>
          Отмена
        </button>
        <button
          className="r-button r-dark"
          onClick={() => {
            try {
              onConfirm();
              onClose();
            } catch (e) {
              setError(errorText(e));
            }
          }}
        >
          Подтвердить
        </button>
      </footer>
    </Modal>
  );
}
export function StepDialog({
  step,
  data,
  catalog,
  onSave,
  onClose,
}: {
  step?: Step;
  data: Draft;
  catalog: Catalog;
  onSave: (step: Step) => void;
  onClose: () => void;
}) {
  const [failure, setFailure] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StepForm>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: step ?? {
      title: '',
      notes: '',
      minutes: 10,
      dependencies: [],
      tools: [],
    },
  });
  return (
    <Modal title={step ? 'Редактировать шаг' : 'Новый шаг'} onClose={onClose}>
      <form
        noValidate
        onSubmit={handleSubmit((values) => {
          try {
            onSave({
              ...values,
              id: step?.id ?? `step-${crypto.randomUUID()}`,
            });
            onClose();
          } catch (e) {
            setFailure(errorText(e));
          }
        })}
      >
        <label className="r-field">
          Название шага
          <input autoFocus {...register('title')} />
          {errors.title && (
            <span className="r-error">{errors.title.message}</span>
          )}
        </label>
        <label className="r-field">
          Длительность, минут
          <input
            type="number"
            min="1"
            max="240"
            {...register('minutes', { valueAsNumber: true })}
          />
          {errors.minutes && (
            <span className="r-error">{errors.minutes.message}</span>
          )}
        </label>
        <label className="r-field">
          Заметка
          <textarea rows={3} {...register('notes')} />
          {errors.notes && (
            <span className="r-error">{errors.notes.message}</span>
          )}
        </label>
        <fieldset>
          <legend>Зависимости — завершить перед этим шагом</legend>
          {data.steps
            .filter((item) => item.id !== step?.id)
            .map((item) => (
              <label className="r-check" key={item.id}>
                <input
                  type="checkbox"
                  value={item.id}
                  {...register('dependencies')}
                />
                {item.title}
              </label>
            ))}
        </fieldset>
        <fieldset>
          <legend>Нужные инструменты</legend>
          {catalog.tools.map((tool) => (
            <label className="r-check" key={tool.id}>
              <input type="checkbox" value={tool.id} {...register('tools')} />
              {tool.name}
            </label>
          ))}
        </fieldset>
        <p className="r-form-hint">
          Изменение маршрута сбрасывает отметки прохождения. Циклические
          зависимости сохранять нельзя.
        </p>
        {failure && (
          <p role="alert" className="r-error">
            {failure}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="r-button r-outline"
            onClick={onClose}
          >
            Отмена
          </button>
          <button className="r-button r-dark" type="submit">
            Сохранить шаг
          </button>
        </footer>
      </form>
    </Modal>
  );
}
const settingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Минимум 3 символа')
    .max(80, 'Максимум 80 символов'),
  rate: z
    .number()
    .int()
    .min(0, 'Ставка от 0')
    .max(10000, 'Максимум 10 000 ₽/ч'),
});
export function SettingsDialog({
  data,
  onSave,
  onClose,
}: {
  data: Draft;
  onSave: (values: z.infer<typeof settingsSchema>) => void;
  onClose: () => void;
}) {
  const [failure, setFailure] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { name: data.name, rate: data.rate },
  });
  return (
    <Modal title="Параметры плана" onClose={onClose}>
      <form
        noValidate
        onSubmit={handleSubmit((values) => {
          try {
            onSave(values);
            onClose();
          } catch (e) {
            setFailure(errorText(e));
          }
        })}
      >
        <label className="r-field">
          Название плана
          <input {...register('name')} />
          {errors.name && (
            <span className="r-error">{errors.name.message}</span>
          )}
        </label>
        <label className="r-field">
          Условная ставка, ₽/час
          <input type="number" {...register('rate', { valueAsNumber: true })} />
          {errors.rate && (
            <span className="r-error">{errors.rate.message}</span>
          )}
        </label>
        <p className="r-form-hint">
          Это допущение для сравнения, а не цена сервисного центра. Укажите 0
          для самостоятельной работы.
        </p>
        {failure && (
          <p role="alert" className="r-error">
            {failure}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="r-button r-outline"
            onClick={onClose}
          >
            Отмена
          </button>
          <button className="r-button r-dark">Сохранить параметры</button>
        </footer>
      </form>
    </Modal>
  );
}
