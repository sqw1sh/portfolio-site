import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BookOpen,
  Quote,
  GitBranch,
  X,
  Plus,
  ArrowUpRight,
  Minus,
  RotateCcw,
  Link2,
  Pencil,
  Trash2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router';
import {
  ancestorPaths,
  entryFormSchema,
  kindLabels,
  shiftDate,
  statusLabels,
  todayISO,
  type Entry,
  type EntryValues,
  type Health,
  type Kind,
  type Workspace,
} from './model';
import { useWorkspaceUI } from './ui-store';

export function KindIcon({ kind, size = 16 }: { kind: Kind; size?: number }) {
  const Icon = { source: BookOpen, claim: Quote, decision: GitBranch }[kind];
  return <Icon size={size} aria-hidden="true" />;
}

export function HealthBadge({ health }: { health: Health }) {
  return (
    <span className={`ts-health health-${health.status}`}>
      <i />
      {statusLabels[health.status]}
    </span>
  );
}

export function EntryDialog({
  data,
  entry,
  kind,
  onClose,
  onSave,
}: {
  data: Workspace;
  entry?: Entry;
  kind: Kind;
  onClose: () => void;
  onSave: (values: EntryValues, id?: string) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EntryValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      kind,
      title: entry?.title ?? '',
      body: entry?.body ?? '',
      owner: entry?.owner ?? '',
      url: entry?.url ?? '',
      checkedAt: entry?.checkedAt ?? todayISO(),
      freshForDays: entry?.freshForDays ?? 30,
      dependencies: data.edges
        .filter((edge) => edge.to === entry?.id)
        .map((edge) => edge.from),
    },
  });
  const selectedKind = useWatch({ control, name: 'kind' });
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    element?.showModal();
    element?.querySelector<HTMLInputElement>('input[name="title"]')?.focus();
    return () => {
      element?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus({ preventScroll: true });
    };
  }, []);
  const submit = handleSubmit(async (values) => {
    setError('');
    try {
      await onSave(
        {
          ...values,
          dependencies: values.kind === 'source' ? [] : values.dependencies,
        },
        entry?.id,
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Не удалось сохранить запись.',
      );
    }
  });
  return (
    <dialog
      className="ts-dialog"
      ref={dialog}
      aria-labelledby="entry-dialog-title"
      onCancel={onClose}
    >
      <div className="ts-dialog-header">
        <div>
          <span className="ts-kicker">СОХРАНЯЕМ КОНТЕКСТ</span>
          <h2 id="entry-dialog-title">
            {entry ? 'Редактировать запись' : 'Новая запись'}
          </h2>
        </div>
        <button
          className="ts-icon-button"
          onClick={onClose}
          aria-label="Закрыть форму"
        >
          <X size={19} />
        </button>
      </div>
      <form onSubmit={submit} noValidate>
        <div className="ts-field">
          <label htmlFor="entry-kind">Тип записи</label>
          <select
            id="entry-kind"
            {...register('kind', {
              onChange: (event) => {
                if (event.target.value === 'source')
                  setValue('dependencies', []);
                else {
                  setValue('url', '');
                  setValue('checkedAt', todayISO());
                  setValue('freshForDays', 30);
                }
              },
            })}
            disabled={!!entry}
          >
            {Object.entries(kindLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="ts-field">
          <label htmlFor="entry-title">
            Название <span>*</span>
          </label>
          <input
            id="entry-title"
            {...register('title')}
            maxLength={120}
            placeholder="Какую мысль важно сохранить?"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'title-error' : undefined}
          />
          {errors.title && (
            <small id="title-error" className="ts-field-error">
              {errors.title.message}
            </small>
          )}
        </div>
        <div className="ts-field">
          <label htmlFor="entry-body">Контекст</label>
          <textarea
            id="entry-body"
            {...register('body')}
            rows={3}
            maxLength={4000}
            placeholder="Наблюдения, аргументы и важные оговорки…"
          />
          {errors.body && (
            <small className="ts-field-error">{errors.body.message}</small>
          )}
        </div>
        <div className="ts-field">
          <label htmlFor="entry-owner">
            Владелец <span>*</span>
          </label>
          <input
            id="entry-owner"
            {...register('owner')}
            maxLength={60}
            placeholder="Кто следит за актуальностью"
            aria-invalid={!!errors.owner}
          />
          {errors.owner && (
            <small className="ts-field-error">{errors.owner.message}</small>
          )}
        </div>
        {selectedKind === 'source' ? (
          <>
            <div className="ts-field">
              <label htmlFor="entry-url">Ссылка на первоисточник</label>
              <input
                id="entry-url"
                type="url"
                {...register('url')}
                placeholder="https://… (необязательно)"
              />
              {errors.url && (
                <small className="ts-field-error">{errors.url.message}</small>
              )}
            </div>
            <div className="ts-field-row">
              <div className="ts-field">
                <label htmlFor="entry-checked">Дата проверки</label>
                <input
                  id="entry-checked"
                  type="date"
                  max={todayISO()}
                  {...register('checkedAt')}
                />
                {errors.checkedAt && (
                  <small className="ts-field-error">
                    {errors.checkedAt.message}
                  </small>
                )}
              </div>
              <div className="ts-field">
                <label htmlFor="entry-freshness">Актуален, дней</label>
                <input
                  id="entry-freshness"
                  type="number"
                  min={1}
                  max={3650}
                  {...register('freshForDays', { valueAsNumber: true })}
                />
                {errors.freshForDays && (
                  <small className="ts-field-error">
                    {errors.freshForDays.message}
                  </small>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="ts-field">
            <label htmlFor="entry-dependencies">На чём основана запись</label>
            <select
              id="entry-dependencies"
              multiple
              size={Math.min(5, Math.max(2, data.nodes.length))}
              {...register('dependencies')}
            >
              {data.nodes
                .filter((node) => node.id !== entry?.id)
                .map((node) => (
                  <option key={node.id} value={node.id}>
                    {kindLabels[node.kind]} · {node.title}
                  </option>
                ))}
            </select>
            <small>
              Можно выбрать несколько записей с Ctrl / Cmd. Связи также доступны
              в панели записи.
            </small>
          </div>
        )}
        {error && (
          <p className="ts-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="ts-dialog-footer">
          <button
            className="ts-button ts-button-ghost"
            type="button"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className="ts-button ts-button-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Сохранение…'
              : entry
                ? 'Сохранить изменения'
                : 'Создать запись'}
            <Plus size={15} />
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      className="ts-dialog ts-confirm"
      ref={dialog}
      aria-labelledby="confirm-title"
      onCancel={() => {
        if (!pending) onClose();
      }}
    >
      <div className="ts-dialog-header">
        <h2 id="confirm-title">{title}</h2>
        <button
          className="ts-icon-button"
          disabled={pending}
          onClick={onClose}
          aria-label="Закрыть подтверждение"
        >
          <X size={19} />
        </button>
      </div>
      <p className="ts-confirm-description">{description}</p>
      {error && (
        <p role="alert" className="ts-form-error">
          {error}
        </p>
      )}
      <div className="ts-dialog-footer">
        <button
          className="ts-button ts-button-ghost"
          disabled={pending}
          onClick={onClose}
        >
          Отмена
        </button>
        <button
          className="ts-button ts-button-primary"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              await onConfirm();
              onClose();
            } catch (failure) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : 'Не удалось выполнить действие.',
              );
              setPending(false);
            }
          }}
        >
          {pending ? 'Подождите…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

export function Graph({
  data,
  visible,
  health,
  selectedId,
}: {
  data: Workspace;
  visible: Entry[];
  health: Map<string, Health>;
  selectedId?: string;
}) {
  const { zoom, set } = useWorkspaceUI();
  const ranks = new Map<string, number>();
  const rank = (id: string): number => {
    if (ranks.has(id)) return ranks.get(id)!;
    const parents = data.edges.filter((edge) => edge.to === id);
    const value = parents.length
      ? Math.max(...parents.map((edge) => rank(edge.from) + 1))
      : { source: 0, claim: 1, decision: 2 }[
          data.nodes.find((node) => node.id === id)!.kind
        ];
    ranks.set(id, value);
    return value;
  };
  data.nodes.forEach((node) => rank(node.id));
  const columns = new Map<number, Entry[]>();
  visible.forEach((node) =>
    columns.set(rank(node.id), [...(columns.get(rank(node.id)) ?? []), node]),
  );
  const positions = new Map<string, { x: number; y: number }>();
  columns.forEach((nodes, column) =>
    nodes.forEach((node, row) =>
      positions.set(node.id, { x: 24 + column * 280, y: 65 + row * 184 }),
    ),
  );
  const width = Math.max(864, (Math.max(0, ...columns.keys()) + 1) * 280 + 24);
  const height = Math.max(
    560,
    Math.max(0, ...[...columns.values()].map((items) => items.length)) * 184 +
      82,
  );
  const ancestors = selectedId ? ancestorPaths(data, selectedId) : new Map();
  return (
    <section className="ts-graph-panel" aria-label="Граф зависимостей">
      <div className="ts-graph-title">
        <span>
          <i />
          Связи в контексте
        </span>
        <small>
          От источника к решению <ArrowUpRight size={12} />
        </small>
      </div>
      <div className="ts-graph-viewport">
        <div
          className="ts-graph-extent"
          style={{ width: width * zoom, height: height * zoom }}
        >
          <div
            className="ts-graph-world"
            style={{ width, height, transform: `scale(${zoom})` }}
          >
            {[...columns].map(([column, nodes]) => (
              <div
                key={column}
                className="ts-column-label"
                style={{ left: 24 + column * 280 }}
              >
                <span>
                  {nodes.every((node) => node.kind === nodes[0].kind)
                    ? {
                        source: 'Источники',
                        claim: 'Утверждения',
                        decision: 'Решения',
                      }[nodes[0].kind]
                    : 'Зависимости'}
                </span>
                <b>{nodes.length.toString().padStart(2, '0')}</b>
              </div>
            ))}
            <svg
              width={width}
              height={height}
              className="ts-graph-lines"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="ts-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#b7aecb" />
                </marker>
              </defs>
              {data.edges.map((edge) => {
                const from = positions.get(edge.from);
                const to = positions.get(edge.to);
                if (!from || !to) return null;
                const highlighted =
                  selectedId &&
                  ancestors.has(edge.from) &&
                  (ancestors.has(edge.to) || edge.to === selectedId);
                return (
                  <path
                    key={`${edge.from}:${edge.to}`}
                    d={`M ${from.x + 240} ${from.y + 78} C ${from.x + 285} ${from.y + 78}, ${to.x - 45} ${to.y + 78}, ${to.x} ${to.y + 78}`}
                    className={highlighted ? 'is-highlighted' : ''}
                    markerEnd="url(#ts-arrow)"
                  />
                );
              })}
            </svg>
            {visible.map((node) => {
              const position = positions.get(node.id)!;
              const state = health.get(node.id)!;
              return (
                <Link
                  key={node.id}
                  to={`/node/${node.id}`}
                  className={`ts-graph-node node-${node.kind} ${selectedId === node.id ? 'is-selected' : ''}`}
                  style={{ left: position.x, top: position.y }}
                  aria-label={`Открыть ${kindLabels[node.kind].toLowerCase()}: ${node.title}`}
                >
                  <div className="ts-node-top">
                    <span className={`ts-kind-icon kind-${node.kind}`}>
                      <KindIcon kind={node.kind} size={13} />
                    </span>
                    <span>{kindLabels[node.kind]}</span>
                    {state.status !== 'fresh' && (
                      <AlertTriangle size={12} className="ts-warning-icon" />
                    )}
                  </div>
                  <strong>{node.title}</strong>
                  <div className="ts-node-bottom">
                    <HealthBadge health={state} />
                    <span className="ts-avatar">{node.owner.slice(0, 1)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ts-graph-footer">
        <span>
          <i className="legend-source" />
          Источник
          <i className="legend-claim" />
          Утверждение
          <i className="legend-decision" />
          Решение
        </span>
        <div>
          <button
            className="ts-icon-button"
            aria-label="Уменьшить граф"
            onClick={() =>
              set({ zoom: Math.max(0.6, +(zoom - 0.1).toFixed(1)) })
            }
            disabled={zoom <= 0.6}
          >
            <Minus size={15} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            className="ts-icon-button"
            aria-label="Увеличить граф"
            onClick={() =>
              set({ zoom: Math.min(1.3, +(zoom + 0.1).toFixed(1)) })
            }
            disabled={zoom >= 1.3}
          >
            <Plus size={15} />
          </button>
          <button
            className="ts-icon-button"
            aria-label="Сбросить масштаб"
            onClick={() => set({ zoom: 1 })}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>
    </section>
  );
}

export function Inspector({
  data,
  node,
  health,
  pending,
  onEdit,
  onDelete,
  onReview,
  onLink,
  onUnlink,
}: {
  data: Workspace;
  node: Entry;
  health: Map<string, Health>;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReview: () => void;
  onLink: (id: string) => void;
  onUnlink: (id: string) => void;
}) {
  const [dependency, setDependency] = useState('');
  const state = health.get(node.id)!;
  const dependencies = data.edges
    .filter((edge) => edge.to === node.id)
    .map((edge) => data.nodes.find((entry) => entry.id === edge.from)!);
  return (
    <aside className="ts-inspector" aria-label="Панель записи">
      <div className="ts-inspector-header">
        <span>КОНТЕКСТ ЗАПИСИ</span>
        <Link
          to="/"
          className="ts-icon-button"
          aria-label="Закрыть панель записи"
        >
          <X size={17} />
        </Link>
      </div>
      <div className="ts-inspector-content">
        <span className={`ts-type-label kind-${node.kind}`}>
          <KindIcon kind={node.kind} size={14} />
          {kindLabels[node.kind]}
          <small>v{node.revision}</small>
        </span>
        <h2>{node.title}</h2>
        <HealthBadge health={state} />
        <div className="ts-record-owner">
          <span className="ts-avatar">{node.owner.slice(0, 1)}</span>
          <span>{node.owner}</span>
          <button
            className="ts-icon-button"
            onClick={onEdit}
            aria-label="Редактировать запись"
          >
            <Pencil size={14} />
          </button>
        </div>
        <p className="ts-record-body">
          {node.body || 'Контекст пока не добавлен.'}
        </p>
        {node.kind === 'source' && (
          <div className="ts-source-details">
            <div>
              <span>Проверен</span>
              <b>{node.checkedAt}</b>
            </div>
            <div>
              <span>Следующая проверка</span>
              <b>{shiftDate(node.checkedAt, node.freshForDays)}</b>
            </div>
            {node.url && (
              <a href={node.url} target="_blank" rel="noopener noreferrer">
                Открыть первоисточник <ArrowUpRight size={13} />
              </a>
            )}
          </div>
        )}
        {state.reasons.length > 0 && (
          <section className="ts-reasons">
            <h3>
              <AlertTriangle size={14} />
              Почему нужен пересмотр
            </h3>
            {state.reasons.map((reason, index) => (
              <div className="ts-reason" key={index}>
                <p>{reason.message}</p>
                <ol>
                  {reason.path.map((id) => {
                    const entry = data.nodes.find((item) => item.id === id)!;
                    return (
                      <li key={id}>
                        <Link to={`/node/${id}`}>
                          <KindIcon kind={entry.kind} size={11} />
                          {entry.title}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </section>
        )}
        {node.kind !== 'source' && (
          <section className="ts-dependencies">
            <h3>
              <Link2 size={14} />
              Основано на <span>{dependencies.length}</span>
            </h3>
            {dependencies.length === 0 && (
              <p className="ts-muted">Добавьте первую зависимость.</p>
            )}
            {dependencies.map((entry) => (
              <div className="ts-dependency" key={entry.id}>
                <Link to={`/node/${entry.id}`}>
                  <KindIcon kind={entry.kind} size={13} />
                  <span>{entry.title}</span>
                </Link>
                <button
                  className="ts-icon-button"
                  disabled={pending}
                  aria-label={`Удалить связь: ${entry.title}`}
                  onClick={() => onUnlink(entry.id)}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <div className="ts-add-link">
              <select
                aria-label="Добавить зависимость"
                value={dependency}
                onChange={(event) => setDependency(event.target.value)}
              >
                <option value="">Выберите запись…</option>
                {data.nodes
                  .filter(
                    (entry) =>
                      entry.id !== node.id &&
                      !dependencies.some((item) => item.id === entry.id),
                  )
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {kindLabels[entry.kind]} · {entry.title}
                    </option>
                  ))}
              </select>
              <button
                className="ts-icon-button"
                disabled={!dependency || pending}
                aria-label="Связать записи"
                onClick={() => {
                  onLink(dependency);
                  setDependency('');
                }}
              >
                <Plus size={17} />
              </button>
            </div>
            <small className="ts-muted">
              Стрелка идёт от доказательства к записи.
            </small>
          </section>
        )}
        <div className="ts-inspector-actions">
          <button
            className="ts-button ts-button-primary"
            disabled={pending}
            onClick={onReview}
          >
            <Check size={15} />
            {node.kind === 'source'
              ? 'Проверен сегодня'
              : 'Подтвердить пересмотр'}
          </button>
          <div>
            <button
              className="ts-button ts-button-ghost"
              disabled={pending}
              onClick={onEdit}
            >
              <Pencil size={13} />
              Редактировать
            </button>
            <button
              className="ts-icon-button ts-danger"
              disabled={pending}
              onClick={onDelete}
              aria-label="Удалить запись"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
