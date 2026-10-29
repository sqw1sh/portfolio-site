import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Database,
  Download,
  FilePlus2,
  GitBranch,
  HelpCircle,
  Layers3,
  LayoutGrid,
  Link2,
  Network,
  Plus,
  Search,
  Table2,
  Upload,
  X,
} from 'lucide-react';
import {
  addDependency,
  createDemo,
  deleteEntry,
  getHealth,
  kindLabels,
  removeDependency,
  reviewEntry,
  saveEntry,
  statusLabels,
  todayISO,
  validateWorkspace,
  type EntryValues,
  type Kind,
  type Status,
  type Workspace,
} from './model';
import {
  downloadJSON,
  importWorkspace,
  readWorkspace,
  STORAGE_KEY,
  updateWorkspace,
  writeWorkspace,
} from './repository';
import {
  ConfirmDialog,
  EntryDialog,
  Graph,
  HealthBadge,
  Inspector,
  KindIcon,
} from './components';
import { useWorkspaceUI } from './ui-store';

type Confirmation = {
  title: string;
  description: string;
  label: string;
  run: () => Promise<void>;
};
const queryKey = ['traceshelf', 'workspace'];

export function TraceShelf() {
  const queryClient = useQueryClient();
  const { data, isPending, error, refetch } = useQuery({
    queryKey,
    queryFn: readWorkspace,
  });
  const mutation = useMutation({
    mutationFn: async (operation: () => Workspace) => operation(),
    onSuccess: (next) => queryClient.setQueryData(queryKey, next),
  });
  const ui = useWorkspaceUI();
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const importInput = useRef<HTMLInputElement>(null);
  const [today, setToday] = useState(todayISO());
  const [form, setForm] = useState<{ kind: Kind; id?: string } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState<{
    kind: 'error' | 'success';
    text: string;
  } | null>(null);
  const selected = data?.nodes.find((node) => node.id === nodeId);
  const selectedId = selected?.id;
  const selectedTitle = selected?.title;
  const health = useMemo(
    () => (data ? getHealth(data, today) : new Map()),
    [data, today],
  );
  const owners = [...new Set(data?.nodes.map((node) => node.owner))].sort();
  const visible =
    data?.nodes.filter(
      (node) =>
        (ui.kind === 'all' || node.kind === ui.kind) &&
        (ui.status === 'all' || health.get(node.id)?.status === ui.status) &&
        (!ui.owner || node.owner === ui.owner) &&
        `${node.title} ${node.body} ${node.owner}`
          .toLocaleLowerCase('ru')
          .includes(ui.search.trim().toLocaleLowerCase('ru')),
    ) ?? [];
  const reviewCount =
    data?.nodes.filter((node) => health.get(node.id)?.status === 'review')
      .length ?? 0;
  const portfolioURL = import.meta.env.DEV ? 'http://127.0.0.1:4173/' : '../';

  useEffect(() => {
    const timer = setInterval(() => setToday(todayISO()), 60_000);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null)
        void queryClient.invalidateQueries({ queryKey });
    };
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, [queryClient]);

  useEffect(() => {
    document.title = selectedTitle
      ? `${selectedTitle} — TraceShelf`
      : 'TraceShelf — карта решений';
    if (selectedId) {
      const panel = document.querySelector<HTMLElement>('.ts-inspector');
      const heading = panel?.querySelector('h2');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
      if (window.matchMedia('(max-width: 1100px)').matches)
        panel?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 'instant'
            : 'smooth',
          block: 'start',
        });
    }
  }, [nodeId, selectedId, selectedTitle]);

  const mutate = async (operation: () => Workspace, message: string) => {
    try {
      const result = await mutation.mutateAsync(operation);
      setNotice({ kind: 'success', text: message });
      return result;
    } catch (failure) {
      setNotice({
        kind: 'error',
        text:
          failure instanceof Error ? failure.message : 'Действие не выполнено.',
      });
      throw failure;
    }
  };
  const change = (update: (current: Workspace) => Workspace, message: string) =>
    mutate(() => updateWorkspace(update), message);
  const ignoreFailure = (operation: Promise<unknown>) => {
    void operation.catch(() => {});
  };
  const exportData = () => {
    try {
      downloadJSON(JSON.stringify(readWorkspace(), null, 2));
      setNotice({ kind: 'success', text: 'JSON подготовлен для скачивания.' });
    } catch (failure) {
      setNotice({
        kind: 'error',
        text:
          failure instanceof Error
            ? failure.message
            : 'Не удалось экспортировать данные.',
      });
    }
  };
  const replaceWorkspace = (demo: boolean) =>
    setConfirmation({
      title: demo ? 'Загрузить демопространство?' : 'Начать с чистого листа?',
      description:
        'Текущие записи будут заменены. Сначала экспортируйте JSON, если хотите сохранить свою работу. Это действие нельзя отменить без резервной копии.',
      label: demo ? 'Загрузить демо' : 'Создать пустое пространство',
      run: async () => {
        await mutate(
          () =>
            writeWorkspace(
              demo
                ? createDemo()
                : { schemaVersion: 1, demo: false, nodes: [], edges: [] },
            ),
          demo
            ? 'Демопространство восстановлено.'
            : 'Пустое пространство создано.',
        );
        ui.reset();
        navigate('/');
      },
    });
  const save = async (values: EntryValues, id?: string) => {
    const previousIds = new Set(data?.nodes.map((node) => node.id));
    const next = await change(
      (current) => saveEntry(current, values, id),
      id
        ? 'Запись обновлена. Зависимые статусы пересчитаны.'
        : 'Запись добавлена.',
    );
    setForm(null);
    navigate(
      `/node/${id ?? next.nodes.find((node) => !previousIds.has(node.id))!.id}`,
    );
  };
  const readImport = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 1_048_576)
        throw new Error('Файл слишком большой: максимум 1 МБ.');
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Файл не является корректным JSON.');
      }
      const candidate = validateWorkspace(parsed);
      setConfirmation({
        title: 'Импортировать пространство?',
        description: `В файле ${candidate.nodes.length} записей и ${candidate.edges.length} связей. Текущие данные будут полностью заменены. Сохраните резервную копию через экспорт.`,
        label: 'Импортировать JSON',
        run: async () => {
          await mutate(
            () => importWorkspace(text),
            'Пространство импортировано.',
          );
          ui.reset();
          navigate('/');
        },
      });
    } catch (failure) {
      setNotice({
        kind: 'error',
        text:
          failure instanceof Error
            ? failure.message
            : 'Не удалось прочитать файл.',
      });
    }
  };

  return (
    <div className="ts-app">
      <a
        className="ts-skip"
        href="#workspace-main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('workspace-main')?.focus();
        }}
      >
        К содержимому
      </a>
      <aside className="ts-sidebar">
        <Link to="/" className="ts-logo">
          <span>
            <Layers3 size={23} />
          </span>
          TraceShelf<span className="ts-logo-dot">.</span>
        </Link>
        <div className="ts-workspace-switch">
          <span className="ts-workspace-icon">P</span>
          <div>
            <strong>
              {data?.demo === false ? 'Моё пространство' : 'Product workspace'}
            </strong>
            <small>Локальное пространство</small>
          </div>
          <ChevronDown size={13} />
        </div>
        <span className="ts-sidebar-kicker">ПРОСТРАНСТВО</span>
        <nav aria-label="Навигация TraceShelf">
          <button
            className={
              ui.view === 'graph' && ui.status === 'all' ? 'active' : ''
            }
            onClick={() => {
              ui.reset();
              ui.set({ view: 'graph' });
              navigate('/');
            }}
          >
            <Network size={17} />
            Карта решений
          </button>
          <button
            className={
              ui.view === 'table' && ui.status === 'all' ? 'active' : ''
            }
            onClick={() => {
              ui.reset();
              ui.set({ view: 'table' });
              navigate('/');
            }}
          >
            <Table2 size={17} />
            Все записи<span>{data?.nodes.length ?? 0}</span>
          </button>
          <button
            className={ui.status === 'review' ? 'active' : ''}
            onClick={() => {
              ui.reset();
              ui.set({ status: 'review', view: 'table' });
              navigate('/');
            }}
          >
            <AlertTriangle size={17} />
            На пересмотре<span className="ts-count-warning">{reviewCount}</span>
          </button>
        </nav>
        <div className="ts-sidebar-note">
          <div className="ts-note-symbol">
            <Link2 size={20} />
          </div>
          <strong>У решений есть история.</strong>
          <p>Свяжите их с доказательствами, чтобы не терять контекст.</p>
          <button
            onClick={() =>
              setNotice({
                kind: 'success',
                text: 'Начните с источника, добавьте утверждение и свяжите с ним решение. Измените источник — зависимые записи попадут на пересмотр. Все операции доступны в таблице.',
              })
            }
          >
            Как это работает <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="ts-sidebar-bottom">
          <div>
            <Database size={14} />
            <span>Данные в вашем браузере</span>
          </div>
          <a href={portfolioURL}>
            <ArrowLeft size={14} />
            Вернуться в портфолио
          </a>
          <span className="ts-version">TRACESHELF / MVP 1.0</span>
        </div>
      </aside>
      <div className="ts-main-shell">
        <header className="ts-topbar">
          <div className="ts-breadcrumb">
            <Layers3 size={16} />
            <span>Workspace</span>
            <span>/</span>
            <strong>Карта решений</strong>
          </div>
          <div className="ts-topbar-right">
            <span className="ts-local-label">
              <i />
              Локальное сохранение
            </span>
            <details
              className="ts-data-menu"
              onClick={(event) => {
                if ((event.target as Element).closest('button'))
                  event.currentTarget.open = false;
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector('summary')?.focus();
                }
              }}
            >
              <summary>
                <Database size={14} />
                Данные
                <ChevronDown size={12} />
              </summary>
              <div>
                <button
                  onClick={() => {
                    importInput.current?.click();
                  }}
                >
                  <Upload size={14} />
                  Импорт JSON
                </button>
                <button onClick={exportData} disabled={!data}>
                  <Download size={14} />
                  Экспорт JSON
                </button>
                <button
                  onClick={() => replaceWorkspace(false)}
                  disabled={mutation.isPending}
                >
                  <FilePlus2 size={14} />
                  Пустое пространство
                </button>
                <button
                  onClick={() => replaceWorkspace(true)}
                  disabled={mutation.isPending}
                >
                  <Layers3 size={14} />
                  Загрузить демо
                </button>
              </div>
            </details>
            <span className="ts-header-avatar">TS</span>
          </div>
        </header>
        <main id="workspace-main" tabIndex={-1} className="ts-main">
          <div className="ts-page-heading">
            <div>
              <div className="ts-kicker">
                ПРОДУМАННЫЕ РЕШЕНИЯ НАЧИНАЮТСЯ С ФАКТОВ
              </div>
              <h1>
                Карта решений<span>.</span>
              </h1>
              <p>Свяжите факты. Сохраняйте контекст.</p>
            </div>
            <button
              className="ts-button ts-button-primary"
              disabled={!data || mutation.isPending}
              onClick={() => setForm({ kind: 'source' })}
            >
              <Plus size={17} />
              Новая запись
            </button>
          </div>
          {notice && (
            <div
              className={`ts-notice notice-${notice.kind}`}
              role={notice.kind === 'error' ? 'alert' : 'status'}
            >
              {notice.kind === 'error' ? (
                <AlertTriangle size={16} />
              ) : (
                <Check size={16} />
              )}
              <p>{notice.text}</p>
              <button
                className="ts-icon-button"
                aria-label="Скрыть уведомление"
                onClick={() => setNotice(null)}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {isPending && (
            <div className="ts-loading" role="status">
              Открываем пространство…
            </div>
          )}
          {error && (
            <section className="ts-storage-error" role="alert">
              <AlertTriangle size={28} />
              <h2>Не удалось открыть пространство</h2>
              <p>{error.message}</p>
              <div>
                <button
                  className="ts-button ts-button-outline"
                  onClick={() =>
                    downloadJSON(
                      localStorage.getItem(STORAGE_KEY) ?? '{}',
                      'traceshelf-recovery.json',
                    )
                  }
                >
                  Скачать сохранённый JSON
                </button>
                <button
                  className="ts-button ts-button-outline"
                  onClick={() => void refetch()}
                >
                  Повторить
                </button>
                <button
                  className="ts-button ts-button-primary"
                  onClick={() => replaceWorkspace(true)}
                >
                  Восстановить демо
                </button>
              </div>
            </section>
          )}
          {data && (
            <>
              <div className="ts-demo-banner">
                <span>
                  <span className="ts-demo-chip">
                    {data.demo ? 'ДЕМО' : 'ЛОКАЛЬНО'}
                  </span>
                  {data.demo
                    ? 'Вымышленные данные для знакомства с инструментом.'
                    : 'Ваше пространство. Данные не отправляются на сервер.'}
                </span>
                <span>
                  {data.demo
                    ? 'Можно редактировать и экспериментировать'
                    : `${data.nodes.length} / 200 записей`}
                </span>
              </div>
              <div className="ts-stats">
                {[
                  {
                    label: 'Всего записей',
                    value: data.nodes.length,
                    icon: LayoutGrid,
                    cls: 'all',
                  },
                  {
                    label: 'Источники',
                    value: data.nodes.filter((node) => node.kind === 'source')
                      .length,
                    icon: BookOpen,
                    cls: 'source',
                  },
                  {
                    label: 'Решения',
                    value: data.nodes.filter((node) => node.kind === 'decision')
                      .length,
                    icon: GitBranch,
                    cls: 'decision',
                  },
                  {
                    label: 'На пересмотре',
                    value: reviewCount,
                    icon: AlertTriangle,
                    cls: 'review',
                  },
                ].map(({ icon: Icon, ...stat }) => (
                  <div className={`ts-stat stat-${stat.cls}`} key={stat.cls}>
                    <div>
                      <span>{stat.label}</span>
                      <strong>{stat.value.toString().padStart(2, '0')}</strong>
                    </div>
                    <span className="ts-stat-icon">
                      <Icon size={20} strokeWidth={1.6} />
                    </span>
                  </div>
                ))}
              </div>
              <section
                className="ts-workspace-section"
                aria-label="Записи пространства"
              >
                <div className="ts-workspace-toolbar">
                  <div
                    className="ts-view-toggle"
                    role="group"
                    aria-label="Вид записей"
                  >
                    <button
                      aria-pressed={ui.view === 'graph'}
                      onClick={() => ui.set({ view: 'graph' })}
                    >
                      <Network size={15} />
                      Граф
                    </button>
                    <button
                      aria-pressed={ui.view === 'table'}
                      onClick={() => ui.set({ view: 'table' })}
                    >
                      <Table2 size={15} />
                      Таблица
                    </button>
                  </div>
                  <div className="ts-search">
                    <Search size={15} />
                    <input
                      aria-label="Поиск записей"
                      placeholder="Найти запись…"
                      value={ui.search}
                      onChange={(event) =>
                        ui.set({ search: event.target.value })
                      }
                    />
                    {ui.search && (
                      <button
                        className="ts-icon-button"
                        aria-label="Очистить поиск"
                        onClick={() => ui.set({ search: '' })}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="ts-filter-row">
                  <div className="ts-select-wrap">
                    <label htmlFor="filter-kind">Тип</label>
                    <select
                      id="filter-kind"
                      value={ui.kind}
                      onChange={(event) =>
                        ui.set({ kind: event.target.value as Kind | 'all' })
                      }
                    >
                      <option value="all">Все типы</option>
                      {Object.entries(kindLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ts-select-wrap">
                    <label htmlFor="filter-status">Статус</label>
                    <select
                      id="filter-status"
                      value={ui.status}
                      onChange={(event) =>
                        ui.set({ status: event.target.value as Status | 'all' })
                      }
                    >
                      <option value="all">Все статусы</option>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ts-select-wrap">
                    <label htmlFor="filter-owner">Владелец</label>
                    <select
                      id="filter-owner"
                      value={ui.owner}
                      onChange={(event) =>
                        ui.set({ owner: event.target.value })
                      }
                    >
                      <option value="">Все владельцы</option>
                      {owners.map((owner) => (
                        <option key={owner}>{owner}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="ts-filter-reset"
                    onClick={ui.reset}
                    disabled={
                      !ui.search &&
                      ui.kind === 'all' &&
                      ui.status === 'all' &&
                      !ui.owner
                    }
                  >
                    Сбросить
                  </button>
                  <span className="ts-result-count" role="status">
                    {visible.length} из {data.nodes.length} записей
                  </span>
                </div>
                <div className="ts-workspace-layout">
                  <div className="ts-records-area">
                    {visible.length === 0 ? (
                      <div className="ts-empty">
                        <Search size={30} />
                        <h2>
                          {data.nodes.length
                            ? 'Ничего не нашлось'
                            : 'Всё начинается с источника'}
                        </h2>
                        <p>
                          {data.nodes.length
                            ? 'Попробуйте другой запрос или сбросьте фильтры.'
                            : 'Добавьте первый факт, затем свяжите с ним утверждение и решение.'}
                        </p>
                        <button
                          className="ts-button ts-button-outline"
                          onClick={
                            data.nodes.length
                              ? ui.reset
                              : () => setForm({ kind: 'source' })
                          }
                        >
                          {data.nodes.length
                            ? 'Сбросить фильтры'
                            : 'Добавить источник'}
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : ui.view === 'graph' ? (
                      <Graph
                        data={data}
                        visible={visible}
                        health={health}
                        selectedId={nodeId}
                      />
                    ) : (
                      <div
                        className="ts-table-wrap"
                        tabIndex={0}
                        role="region"
                        aria-label="Прокручиваемая таблица записей"
                      >
                        <table className="ts-record-table">
                          <caption className="sr-only">
                            Записи и статусы зависимостей. Откройте запись для
                            редактирования и управления связями.
                          </caption>
                          <thead>
                            <tr>
                              <th>Запись</th>
                              <th>Статус</th>
                              <th>Владелец</th>
                              <th>
                                <span className="sr-only">Открыть</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {visible.map((node) => (
                              <tr
                                key={node.id}
                                className={
                                  node.id === nodeId ? 'selected-row' : ''
                                }
                              >
                                <td>
                                  <Link
                                    to={`/node/${node.id}`}
                                    aria-label={`Открыть ${kindLabels[node.kind].toLowerCase()}: ${node.title}`}
                                  >
                                    <span
                                      className={`ts-kind-icon kind-${node.kind}`}
                                    >
                                      <KindIcon kind={node.kind} />
                                    </span>
                                    <span>
                                      <strong>{node.title}</strong>
                                      <small>
                                        {kindLabels[node.kind]} · v
                                        {node.revision}
                                      </small>
                                    </span>
                                  </Link>
                                </td>
                                <td>
                                  <HealthBadge health={health.get(node.id)!} />
                                </td>
                                <td>
                                  <span className="ts-table-owner">
                                    <span className="ts-avatar">
                                      {node.owner.slice(0, 1)}
                                    </span>
                                    {node.owner}
                                  </span>
                                </td>
                                <td>
                                  <ArrowUpRight size={14} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="ts-board-hint">
                      <Link2 size={13} />
                      <span>
                        Стрелка: доказательство → запись. Статус рассчитывается
                        по всей цепочке.
                      </span>
                    </div>
                  </div>
                  {selected ? (
                    <Inspector
                      key={selected.id}
                      data={data}
                      node={selected}
                      health={health}
                      pending={mutation.isPending}
                      onEdit={() =>
                        setForm({ kind: selected.kind, id: selected.id })
                      }
                      onDelete={() =>
                        setConfirmation({
                          title: 'Удалить запись?',
                          description: `«${selected.title}» и все её связи будут удалены. Зависимые записи останутся, их статусы будут пересчитаны.`,
                          label: 'Удалить запись',
                          run: async () => {
                            await change(
                              (current) => deleteEntry(current, selected.id),
                              'Запись и её связи удалены.',
                            );
                            navigate('/');
                          },
                        })
                      }
                      onReview={() =>
                        ignoreFailure(
                          change(
                            (current) => reviewEntry(current, selected.id),
                            selected.kind === 'source'
                              ? 'Дата проверки обновлена.'
                              : 'Пересмотр подтверждён.',
                          ),
                        )
                      }
                      onLink={(id) =>
                        ignoreFailure(
                          change(
                            (current) =>
                              addDependency(current, selected.id, id),
                            'Связь добавлена.',
                          ),
                        )
                      }
                      onUnlink={(id) =>
                        ignoreFailure(
                          change(
                            (current) =>
                              removeDependency(current, selected.id, id),
                            'Связь удалена.',
                          ),
                        )
                      }
                    />
                  ) : nodeId ? (
                    <aside className="ts-overview">
                      <h2>Запись не найдена</h2>
                      <p>Она могла быть удалена в другом окне.</p>
                      <Link to="/" className="ts-button ts-button-outline">
                        К карте
                      </Link>
                    </aside>
                  ) : (
                    <aside className="ts-overview">
                      <div className="ts-overview-title">
                        <span className="ts-focus-dot" />
                        <h2>Фокус на сегодня</h2>
                        <span>{reviewCount}</span>
                      </div>
                      <p>
                        Контекст меняется.
                        <br />
                        Решения должны меняться с ним.
                      </p>
                      <div className="ts-attention-list">
                        {data.nodes
                          .filter(
                            (node) => health.get(node.id)?.status === 'review',
                          )
                          .sort(
                            (a, b) =>
                              Number(b.kind === 'decision') -
                              Number(a.kind === 'decision'),
                          )
                          .slice(0, 3)
                          .map((node) => (
                            <Link key={node.id} to={`/node/${node.id}`}>
                              <span
                                className={`ts-kind-icon kind-${node.kind}`}
                              >
                                <KindIcon kind={node.kind} size={14} />
                              </span>
                              <div>
                                <strong>{node.title}</strong>
                                <small>
                                  {health.get(node.id)?.reasons[0]?.message}
                                </small>
                              </div>
                              <ArrowUpRight size={14} />
                            </Link>
                          ))}
                        {reviewCount === 0 && (
                          <div className="ts-all-clear">
                            <Check size={24} />
                            <strong>Всё актуально</strong>
                            <span>
                              Записей на пересмотре нет. Записи без источников
                              можно найти фильтром статуса.
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ts-overview-how">
                        <HelpCircle size={17} />
                        <h3>Что стоит за решением?</h3>
                        <p>
                          Выберите запись на карте или в таблице. Здесь появятся
                          её контекст, зависимости и причины пересмотра.
                        </p>
                        <span>
                          <BookOpen size={13} />
                          <ArrowRight size={11} />
                          <QuoteGlyph />
                          <ArrowRight size={11} />
                          <GitBranch size={13} />
                        </span>
                      </div>
                    </aside>
                  )}
                </div>
              </section>
              <footer className="ts-workspace-footer">
                <span>
                  <Check size={12} />
                  Сохранено локально · без сервера и регистрации
                </span>
                <span>Ваши данные остаются у вас</span>
              </footer>
            </>
          )}
        </main>
      </div>
      <input
        ref={importInput}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        aria-label="Файл пространства JSON"
        onChange={(event) => {
          void readImport(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {form && data && (
        <EntryDialog
          key={`${form.id ?? 'new'}-${form.kind}`}
          data={data}
          kind={form.kind}
          entry={data.nodes.find((node) => node.id === form.id)}
          onClose={() => setForm(null)}
          onSave={save}
        />
      )}
      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          description={confirmation.description}
          confirmLabel={confirmation.label}
          onClose={() => setConfirmation(null)}
          onConfirm={confirmation.run}
        />
      )}
    </div>
  );
}

function QuoteGlyph() {
  return <span className="ts-quote-glyph">“</span>;
}
