import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Check, Clock3, X } from 'lucide-react';
import {
  participantFormSchema,
  settingsSchema,
  type Participant,
  type ParticipantForm,
  type Settings,
} from './model';

import { weekdayLabels } from './format';

export function ParticipantDialog({
  person,
  onClose,
  onSave,
}: {
  person?: Participant;
  onClose: () => void;
  onSave: (person: Participant) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [failure, setFailure] = useState('');
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ParticipantForm>({
    resolver: zodResolver(participantFormSchema),
    defaultValues: {
      name: person?.name ?? '',
      timeZone: person?.timeZone ?? 'Europe/Moscow',
      workStart: person?.workStart ?? '09:00',
      workEnd: person?.workEnd ?? '18:00',
      days: person?.days ?? [1, 2, 3, 4, 5],
      strict: person?.strict ?? false,
      blockedDatesText: person?.blockedDates.join(', ') ?? '',
    },
  });
  const days = useWatch({ control, name: 'days' });
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLInputElement>('[name="name"]')?.focus();
    return () => element?.close();
  }, []);
  return (
    <dialog
      className="q-dialog"
      ref={dialog}
      aria-labelledby="person-title"
      onCancel={onClose}
    >
      <header>
        <div>
          <span className="q-eyebrow">У КАЖДОГО — СВОЙ РИТМ</span>
          <h2 id="person-title">
            {person ? 'Изменить участника' : 'Новый участник'}
          </h2>
        </div>
        <button
          className="q-icon-button"
          aria-label="Закрыть форму"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </header>
      <form
        noValidate
        onSubmit={handleSubmit((values) => {
          try {
            const { blockedDatesText, ...fields } = values;
            onSave({
              ...fields,
              id: person?.id ?? crypto.randomUUID(),
              blockedDates: [
                ...new Set(blockedDatesText.split(/[\s,;]+/).filter(Boolean)),
              ],
            });
          } catch {
            setFailure(
              'Не удалось сохранить. Проверьте данные и доступ к хранилищу (до 30 исключённых дат).',
            );
          }
        })}
      >
        <div className="q-field">
          <label htmlFor="person-name">Имя</label>
          <input
            id="person-name"
            {...register('name')}
            maxLength={40}
            placeholder="Как обращаться к участнику"
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <small className="q-error">{errors.name.message}</small>
          )}
        </div>
        <div className="q-field">
          <label htmlFor="person-zone">Часовой пояс IANA</label>
          <input
            id="person-zone"
            list="q-timezones"
            {...register('timeZone')}
            placeholder="Europe/Moscow"
            aria-invalid={!!errors.timeZone}
          />
          {errors.timeZone && (
            <small className="q-error">{errors.timeZone.message}</small>
          )}
        </div>
        <div className="q-form-row">
          <div className="q-field">
            <label htmlFor="work-start">Начало работы</label>
            <input
              id="work-start"
              type="time"
              step={900}
              {...register('workStart')}
            />
            {errors.workStart && (
              <small className="q-error">{errors.workStart.message}</small>
            )}
          </div>
          <div className="q-field">
            <label htmlFor="work-end">Конец работы</label>
            <input
              id="work-end"
              type="time"
              step={900}
              {...register('workEnd')}
            />
            {errors.workEnd && (
              <small className="q-error">{errors.workEnd.message}</small>
            )}
          </div>
        </div>
        <fieldset className="q-days-field">
          <legend>Рабочие дни</legend>
          <div>
            {weekdayLabels.map((label, index) => (
              <button
                type="button"
                key={label}
                aria-label={label}
                aria-pressed={days.includes(index + 1)}
                onClick={() =>
                  setValue(
                    'days',
                    days.includes(index + 1)
                      ? days.filter((day) => day !== index + 1)
                      : [...days, index + 1].sort(),
                    { shouldValidate: true },
                  )
                }
              >
                {label}
              </button>
            ))}
          </div>
          {errors.days && (
            <small className="q-error">{errors.days.message}</small>
          )}
        </fieldset>
        <label className="q-checkbox">
          <input type="checkbox" {...register('strict')} />
          <span>
            <strong>Только в рабочем окне</strong>
            <small>Вне окна встреча запрещена, а не просто неудобна.</small>
          </span>
        </label>
        <div className="q-field">
          <label htmlFor="blocked-dates">Исключённые даты</label>
          <textarea
            id="blocked-dates"
            rows={2}
            {...register('blockedDatesText')}
            placeholder="2026-11-02, 2026-11-03"
          />
          {errors.blockedDatesText && (
            <small className="q-error">{errors.blockedDatesText.message}</small>
          )}
          <small>
            Целые локальные дни недоступны. До 30 дат через запятую. Ночное окно
            относится к дню его начала.
          </small>
        </div>
        {failure && (
          <p className="q-form-error" role="alert">
            {failure}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="q-button q-button-ghost"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="q-button q-button-dark"
            disabled={isSubmitting}
          >
            Сохранить участника <Check size={15} />
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export function SettingsForm({
  settings,
  onSave,
}: {
  settings: Settings;
  onSave: (settings: Settings) => void;
}) {
  const [failure, setFailure] = useState('');
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<Settings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });
  const mode = useWatch({ control, name: 'mode' });
  return (
    <form
      className="q-settings"
      noValidate
      onSubmit={handleSubmit((values) => {
        try {
          onSave(values);
          setFailure('');
        } catch {
          setFailure('Изменения не сохранены. Проверьте локальное хранилище.');
        }
      })}
    >
      <div className="q-settings-top">
        <div>
          <Clock3 size={16} />
          <h2>Параметры встречи</h2>
        </div>
        <div className="q-mode" role="group" aria-label="Режим встречи">
          <button
            type="button"
            aria-pressed={mode === 'single'}
            onClick={() => setValue('mode', 'single')}
          >
            Разовая
          </button>
          <button
            type="button"
            aria-pressed={mode === 'series'}
            onClick={() => setValue('mode', 'series')}
          >
            Серия
          </button>
        </div>
      </div>
      <div className="q-settings-grid">
        <div className="q-field">
          <label htmlFor="meeting-date">Начиная с даты</label>
          <input id="meeting-date" type="date" {...register('startDate')} />
        </div>
        <div className="q-field">
          <label htmlFor="meeting-duration">Длительность</label>
          <select
            id="meeting-duration"
            {...register('duration', { valueAsNumber: true })}
          >
            {[15, 30, 45, 60, 90, 120].map((duration) => (
              <option key={duration} value={duration}>
                {duration} минут
              </option>
            ))}
          </select>
        </div>
        <div className="q-field">
          <label htmlFor="search-days">Дней поиска</label>
          <select
            id="search-days"
            {...register('days', { valueAsNumber: true })}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((days) => (
              <option value={days} key={days}>
                {days}
              </option>
            ))}
          </select>
        </div>
        {mode === 'series' && (
          <div className="q-field">
            <label htmlFor="occurrences">Встреч в серии</label>
            <select
              id="occurrences"
              {...register('occurrences', { valueAsNumber: true })}
            >
              {[2, 3, 4].map((count) => (
                <option value={count} key={count}>
                  {count} недели
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <details className="q-advanced">
        <summary>Название, часовой пояс и окно поиска</summary>
        <div className="q-advanced-grid">
          <div className="q-field">
            <label htmlFor="meeting-title">Название встречи</label>
            <input id="meeting-title" {...register('title')} maxLength={100} />
          </div>
          <div className="q-field">
            <label htmlFor="organizer-zone">Пояс организатора</label>
            <input
              id="organizer-zone"
              list="q-timezones"
              {...register('organizerZone')}
            />
          </div>
          <div className="q-field">
            <label htmlFor="search-start">Искать с</label>
            <input
              id="search-start"
              type="time"
              step={900}
              {...register('searchStart')}
            />
          </div>
          <div className="q-field">
            <label htmlFor="search-end">Искать до</label>
            <input
              id="search-end"
              type="time"
              step={900}
              {...register('searchEnd')}
            />
          </div>
        </div>
        <label className="q-checkbox">
          <input type="checkbox" {...register('excludePast')} />
          <span>
            <strong>Только будущие встречи</strong>
            <small>
              Выключите для исследования исторических дат и переходов DST.
            </small>
          </span>
        </label>
      </details>
      <div className="q-settings-bottom">
        <label className="q-checkbox">
          <input type="checkbox" {...register('fairness')} />
          <span>
            <strong>Учитывать прошлые уступки</strong>
            <small>Неудобство распределяется с оглядкой на историю.</small>
          </span>
        </label>
        <button className="q-button q-button-dark" type="submit">
          Подобрать время <ArrowRight size={15} />
        </button>
      </div>
      {(Object.keys(errors).length > 0 || failure) && (
        <p className="q-form-error" role="alert">
          {failure ||
            Object.values(errors)
              .map((error) => error.message)
              .join('. ')}
        </p>
      )}
    </form>
  );
}

export function ConfirmDialog({
  title,
  description,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [failure, setFailure] = useState('');
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      className="q-dialog q-confirm"
      ref={dialog}
      aria-labelledby="confirm-title"
      onCancel={onClose}
    >
      <header>
        <h2 id="confirm-title">{title}</h2>
        <button
          className="q-icon-button"
          onClick={onClose}
          aria-label="Закрыть подтверждение"
        >
          <X size={18} />
        </button>
      </header>
      <p>{description}</p>
      {failure && (
        <p className="q-form-error" role="alert">
          {failure}
        </p>
      )}
      <footer>
        <button className="q-button q-button-ghost" onClick={onClose}>
          Отмена
        </button>
        <button
          className="q-button q-button-dark"
          onClick={() => {
            try {
              onConfirm();
              onClose();
            } catch {
              setFailure(
                'Не удалось сохранить изменения. Проверьте доступ к хранилищу.',
              );
            }
          }}
        >
          Подтвердить
        </button>
      </footer>
    </dialog>
  );
}
