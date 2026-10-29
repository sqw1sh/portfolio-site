import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  CircleHelp,
  Download,
  GitBranch,
  Layers3,
  LockKeyhole,
  Package,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import {
  loadCatalog,
  slots,
  slotLabels,
  type Catalog,
  type Device,
} from './catalog';
import {
  completeStep,
  conflicts,
  deleteStep,
  errorText,
  importDraft,
  makeDraft,
  money,
  orderedSteps,
  partReason,
  saveStep,
  scenario,
  totals,
  undoStep,
  validateDraft,
  type Draft,
  type Step,
} from './model';
import { useAtlasStore } from './store';
import { Confirm, SettingsDialog, StepDialog } from './forms';

function DeviceArt({
  device,
  small = false,
}: {
  device: Device;
  small?: boolean;
}) {
  return (
    <div
      className={`r-device-art ${device.id === 'orbit' ? 'is-pad' : ''} ${small ? 'is-small' : ''}`}
      role="img"
      aria-label={`Условная модель ${device.name}`}
    >
      <div className="r-art-plate">
        <div className="r-art-keys">
          {Array.from({ length: device.id === 'orbit' ? 12 : 60 }, (_, i) => (
            <span key={i} className={i === 15 || i === 31 ? 'is-accent' : ''}>
              {i === 0 ? 'esc' : i === 14 ? '↵' : ''}
            </span>
          ))}
        </div>
        <span className="r-art-mark">
          {device.id === 'orbit' ? 'o / 12' : 'm / 75'}
        </span>
      </div>
      <div className="r-art-base" />
    </div>
  );
}
function Budget({ data, catalog }: { data: Draft; catalog: Catalog }) {
  const value = totals(data, catalog);
  return (
    <section className="r-budget">
      <div className="r-section-title">
        <h2>Смета маршрута</h2>
        <span>ДЕМО · ₽</span>
      </div>
      <dl>
        <div>
          <dt>Новые детали</dt>
          <dd>{money(value.parts)}</dd>
        </div>
        <div>
          <dt>Недостающие инструменты</dt>
          <dd>{money(value.tools)}</dd>
        </div>
        <div>
          <dt>
            Работа · {value.minutes} мин × {data.rate} ₽/ч
          </dt>
          <dd>{money(value.labor)}</dd>
        </div>
        <div className="r-total">
          <dt>Условный итог</dt>
          <dd>{money(value.total)}</dd>
        </div>
      </dl>
      <p>
        Условные цены. Без доставки и налогов. Инструменты считаются один раз;
        детали «уже есть» — 0 ₽.
      </p>
    </section>
  );
}
function Plan({
  data,
  catalog,
  commit,
  onEdit,
  onDelete,
  onAdd,
}: {
  data: Draft;
  catalog: Catalog;
  commit: (data: Draft) => void;
  onEdit: (step: Step) => void;
  onDelete: (step: Step) => void;
  onAdd: () => void;
}) {
  const problems = conflicts(data, catalog);
  const steps = orderedSteps(data);
  return (
    <>
      <div className="r-plan-grid">
        <section className="r-route-panel">
          <div className="r-section-title">
            <div>
              <GitBranch size={17} />
              <h2>Маршрут ремонта</h2>
            </div>
            <span>{steps.length} ШАГОВ</span>
          </div>
          <p className="r-muted r-section-description">
            От исходного состояния до проверки. Порядок задают зависимости.
          </p>
          <ol className="r-route-list">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className={data.completed.includes(step.id) ? 'is-done' : ''}
              >
                <div className="r-node-number">
                  {data.completed.includes(step.id) ? (
                    <Check size={15} />
                  ) : (
                    String(index + 1).padStart(2, '0')
                  )}
                </div>
                <div className="r-node-body">
                  <div className="r-node-title">
                    <h3>{step.title}</h3>
                    <span>{step.minutes} мин</span>
                  </div>
                  <p>{step.notes || 'Без дополнительной заметки.'}</p>
                  <div className="r-node-deps">
                    {step.dependencies.length ? (
                      step.dependencies.map((id) => (
                        <span key={id}>
                          <GitBranch size={11} />
                          {data.steps.find((item) => item.id === id)?.title}
                        </span>
                      ))
                    ) : (
                      <span>Начало маршрута</span>
                    )}
                  </div>
                  <div className="r-node-footer">
                    <span>
                      {step.tools.length
                        ? step.tools
                            .map(
                              (id) =>
                                catalog.tools.find((tool) => tool.id === id)
                                  ?.name,
                            )
                            .join(' · ')
                        : 'Без инструментов'}
                    </span>
                    <div>
                      <button
                        className="r-icon"
                        aria-label={`Редактировать шаг ${step.title}`}
                        onClick={() => onEdit(step)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="r-icon"
                        aria-label={`Удалить шаг ${step.title}`}
                        onClick={() => onDelete(step)}
                        disabled={data.steps.length <= 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <button
            className="r-add"
            disabled={data.steps.length >= 30}
            onClick={onAdd}
          >
            <Plus size={16} />
            Добавить шаг
          </button>
          <div className="r-route-note">
            <ShieldCheck size={17} />
            <span>Циклы не сохраняются. Прохождение следует зависимостям.</span>
          </div>
        </section>
        <div className="r-plan-side">
          <section className="r-parts-panel">
            <div className="r-section-title">
              <div>
                <Package size={17} />
                <h2>Детали плана</h2>
              </div>
              <span>3 МОДУЛЯ</span>
            </div>
            {slots.map((slot) => {
              const selection = data.selections[slot];
              const reason = problems.find(
                (item) => item.slot === slot,
              )?.reason;
              return (
                <div
                  key={slot}
                  className={`r-part ${reason ? 'has-conflict' : ''}`}
                >
                  <div className="r-field">
                    <label htmlFor={`r-part-${slot}`}>{slotLabels[slot]}</label>
                    <select
                      id={`r-part-${slot}`}
                      value={selection.partId}
                      onChange={(event) =>
                        commit({
                          ...data,
                          completed: [],
                          selections: {
                            ...data.selections,
                            [slot]: {
                              partId: event.target.value,
                              owned: false,
                            },
                          },
                        })
                      }
                    >
                      {catalog.parts
                        .filter((part) => part.slot === slot)
                        .map((part) => (
                          <option key={part.id} value={part.id}>
                            {part.name} · {part.price} ₽
                          </option>
                        ))}
                    </select>
                  </div>
                  <label className="r-check">
                    <input
                      type="checkbox"
                      aria-label={`${slotLabels[slot]} уже есть`}
                      checked={selection.owned}
                      onChange={(event) =>
                        commit({
                          ...data,
                          completed: [],
                          selections: {
                            ...data.selections,
                            [slot]: {
                              ...selection,
                              owned: event.target.checked,
                            },
                          },
                        })
                      }
                    />
                    Деталь уже есть · не покупать
                  </label>
                  {reason ? (
                    <p className="r-conflict">
                      <CircleHelp size={14} />
                      {reason}
                    </p>
                  ) : (
                    <span className="r-compatible">
                      <Check size={12} />
                      Совместимо
                    </span>
                  )}
                </div>
              );
            })}
          </section>
          <section className="r-tools-panel">
            <div className="r-section-title">
              <div>
                <Wrench size={16} />
                <h2>Инструменты в наличии</h2>
              </div>
            </div>
            {catalog.tools.map((tool) => (
              <label className="r-check r-tool-check" key={tool.id}>
                <input
                  type="checkbox"
                  checked={data.ownedTools.includes(tool.id)}
                  onChange={(event) =>
                    commit({
                      ...data,
                      ownedTools: event.target.checked
                        ? [...data.ownedTools, tool.id]
                        : data.ownedTools.filter((id) => id !== tool.id),
                    })
                  }
                />
                <span>
                  {tool.name}
                  <small>{money(tool.price * 100)}</small>
                </span>
              </label>
            ))}
            <p className="r-muted">
              Отметьте свои. Остальные попадут в смету, если нужны в маршруте.
            </p>
          </section>
          <Budget data={data} catalog={catalog} />
        </div>
      </div>
    </>
  );
}
function Compare({
  data,
  catalog,
  onApply,
}: {
  data: Draft;
  catalog: Catalog;
  onApply: (data: Draft) => void;
}) {
  const options = [
    { name: 'Текущий план', data },
    { name: 'Сохранить больше', data: scenario(data, 'economy', catalog) },
    { name: 'Все модули новые', data: scenario(data, 'upgrade', catalog) },
  ];
  return (
    <section className="r-compare">
      <div className="r-section-title">
        <div>
          <SlidersHorizontal size={18} />
          <h2>Три варианта. Одни допущения.</h2>
        </div>
      </div>
      <p className="r-muted">
        Одинаковые шаги, длительность, инструменты и ставка. Меняются детали и
        их наличие. Для Orbit альтернативных модулей пока нет.
      </p>
      <div className="r-compare-grid">
        {options.map((option, index) => {
          const value = totals(option.data, catalog);
          const problems = conflicts(option.data, catalog);
          return (
            <article
              key={option.name}
              className={index === 1 ? 'is-highlight' : ''}
            >
              <span className="r-eyebrow">ВАРИАНТ 0{index + 1}</span>
              <h3>{option.name}</h3>
              <strong className="r-compare-price">{money(value.total)}</strong>
              <dl>
                <div>
                  <dt>Детали</dt>
                  <dd>{money(value.parts)}</dd>
                </div>
                <div>
                  <dt>Инструменты</dt>
                  <dd>{money(value.tools)}</dd>
                </div>
                <div>
                  <dt>Работа</dt>
                  <dd>{money(value.labor)}</dd>
                </div>
                <div>
                  <dt>Длительность</dt>
                  <dd>{value.minutes} мин</dd>
                </div>
                <div>
                  <dt>Деталей уже есть</dt>
                  <dd>{value.reused} из 3</dd>
                </div>
              </dl>
              <ul>
                {slots.map((slot) => (
                  <li key={slot}>
                    <Check size={13} />
                    {
                      catalog.parts.find(
                        (part) =>
                          part.id === option.data.selections[slot].partId,
                      )?.name
                    }
                    <small>
                      {option.data.selections[slot].owned
                        ? 'уже есть'
                        : 'покупка'}
                    </small>
                  </li>
                ))}
              </ul>
              <p className={problems.length ? 'r-error' : 'r-compatible'}>
                {problems.length
                  ? `Конфликтов: ${problems.length}. Прохождение заблокировано.`
                  : 'Все модули совместимы'}
              </p>
              {index === 0 ? (
                <Link className="r-button r-outline" to="/">
                  Редактировать план
                </Link>
              ) : (
                <button
                  className="r-button r-dark"
                  onClick={() => onApply(option.data)}
                >
                  Применить вариант {index + 1}
                  <ArrowRight size={14} />
                </button>
              )}
            </article>
          );
        })}
      </div>
      <div className="r-assumptions">
        <CircleHelp size={20} />
        <div>
          <h3>Что означает сравнение</h3>
          <p>
            Цены и устройства вымышлены. Сценарий «Сохранить больше»
            предполагает, что штатные клавиши и корпус исправны и уже есть.
            Работа считается последовательной: сумма минут × ставка / 60.
            Экономия ресурсов и срок службы не измерялись.
          </p>
        </div>
      </div>
    </section>
  );
}
function Matrix({ data, catalog }: { data: Draft; catalog: Catalog }) {
  return (
    <section className="r-matrix">
      <div className="r-section-title">
        <div>
          <Layers3 size={18} />
          <h2>Матрица совместимости</h2>
        </div>
      </div>
      <p className="r-muted">
        Для выбранного устройства и текущего контроллера. Проверяем формат,
        ревизию и совпадение протоколов клавиш.
      </p>
      <p className="r-form-hint r-matrix-hint">
        На узком экране прокрутите таблицу вправо, чтобы увидеть причины
        конфликтов.
      </p>
      <div
        className="r-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Прокручиваемая матрица совместимости"
      >
        <table>
          <caption className="r-sr">
            Совместимость деталей с текущим планом
          </caption>
          <thead>
            <tr>
              <th scope="col">Деталь / условная цена</th>
              <th scope="col">Модуль</th>
              <th scope="col">Проверка и причина</th>
            </tr>
          </thead>
          <tbody>
            {catalog.parts.map((part) => {
              const reason = partReason(data, part, catalog);
              return (
                <tr key={part.id}>
                  <th scope="row">
                    {part.name}
                    <small>
                      {money(part.price * 100)} ·{' '}
                      {part.protocol ?? 'без протокола'}
                    </small>
                  </th>
                  <td>{slotLabels[part.slot]}</td>
                  <td>
                    {reason ? (
                      <span className="r-conflict">{reason}</span>
                    ) : (
                      <span className="r-compatible">
                        <Check size={13} />
                        Совместимо
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="r-form-hint">
        Проверки относятся только к этому вымышленному каталогу. Совместимость
        настоящих деталей они не подтверждают.
      </p>
    </section>
  );
}
function Run({
  data,
  catalog,
  commit,
  onReset,
}: {
  data: Draft;
  catalog: Catalog;
  commit: (data: Draft) => void;
  onReset: () => void;
}) {
  const problems = conflicts(data, catalog);
  const steps = orderedSteps(data);
  const done = data.completed.length === steps.length;
  return (
    <section className="r-run">
      <div className="r-section-title">
        <div>
          <Play size={18} />
          <h2>Пошаговое прохождение</h2>
        </div>
        <span>
          {data.completed.length} / {steps.length}
        </span>
      </div>
      <p className="r-muted">
        Учебная симуляция. Отметки подтверждаете вы; приложение не проверяет
        физическое устройство.
      </p>
      <progress
        aria-label="Прогресс маршрута"
        value={data.completed.length}
        max={steps.length}
      />
      {problems.length > 0 && (
        <div className="r-conflict-box" role="alert">
          <h3>Сначала устраните конфликты</h3>
          {problems.map((item) => (
            <p key={item.slot}>{item.reason}</p>
          ))}
          <Link to="/">
            Вернуться к деталям <ArrowRight size={14} />
          </Link>
        </div>
      )}
      {done && (
        <div className="r-finished" role="status">
          <CheckCheck size={32} />
          <h3>Маршрут пройден</h3>
          <p>
            Все шаги демоплана отмечены. Реальная работоспособность устройства
            не подтверждалась.
          </p>
        </div>
      )}
      <ol className="r-run-list">
        {steps.map((step, index) => {
          const completed = data.completed.includes(step.id);
          const missing = step.dependencies.filter(
            (id) => !data.completed.includes(id),
          );
          const locked = missing.length > 0 || problems.length > 0;
          return (
            <li key={step.id} className={completed ? 'is-done' : ''}>
              <span className="r-run-number">
                {completed ? (
                  <Check size={18} />
                ) : (
                  String(index + 1).padStart(2, '0')
                )}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.notes || 'Без дополнительной заметки.'}</p>
                <small>
                  {step.minutes} мин ·{' '}
                  {step.tools
                    .map(
                      (id) =>
                        catalog.tools.find((tool) => tool.id === id)?.name,
                    )
                    .join(', ') || 'без инструментов'}
                </small>
                {missing.length > 0 && (
                  <p className="r-waiting">
                    <LockKeyhole size={12} />
                    Сначала:{' '}
                    {missing
                      .map(
                        (id) =>
                          data.steps.find((item) => item.id === id)?.title,
                      )
                      .join(', ')}
                  </p>
                )}
              </div>
              {completed ? (
                <button
                  className="r-button r-outline"
                  onClick={() => commit(undoStep(data, step.id, catalog))}
                >
                  Отменить шаг {index + 1}
                </button>
              ) : (
                <button
                  className="r-button r-dark"
                  disabled={locked}
                  onClick={() => commit(completeStep(data, step.id, catalog))}
                >
                  Завершить шаг {index + 1}
                  <Check size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <div className="r-run-bottom">
        <p>
          Отмена шага снимает отметки всех зависимых шагов. Изменение деталей
          или маршрута сбрасывает прохождение.
        </p>
        <button
          className="r-button r-outline"
          disabled={!data.completed.length}
          onClick={onReset}
        >
          <RotateCcw size={14} />
          Сбросить прохождение
        </button>
      </div>
    </section>
  );
}

export function App() {
  const { draft, issue, replace } = useAtlasStore();
  const query = useQuery({
    queryKey: ['repair-atlas', 'catalog', 1],
    queryFn: loadCatalog,
  });
  const catalog = query.data;
  const validation = useMemo(() => {
    if (!draft || !catalog) return { data: null, error: null };
    try {
      return { data: validateDraft(draft, catalog), error: null };
    } catch (e) {
      return { data: null, error: errorText(e) };
    }
  }, [draft, catalog]);
  const data = validation.data;
  const [editor, setEditor] = useState<{ step?: Step } | null>(null);
  const [settings, setSettings] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    action: () => void;
  } | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (catalog && !draft && !issue) {
      try {
        replace(makeDraft('mica', catalog));
      } catch {
        /* Store displays failure. */
      }
    }
  }, [catalog, draft, issue, replace]);
  const commit = (next: Draft) => {
    if (!catalog) return;
    try {
      replace(validateDraft(next, catalog));
      setNotice({ text: 'План сохранён в этом браузере.', error: false });
    } catch (e) {
      setNotice({ text: errorText(e), error: true });
    }
  };
  const confirm = (title: string, description: string, action: () => void) =>
    setConfirmation({ title, description, action });
  const device = catalog?.devices.find((item) => item.id === data?.deviceId);
  const problems = data && catalog ? conflicts(data, catalog) : [];
  const portfolioURL = import.meta.env.DEV ? 'http://127.0.0.1:4173/' : '../';
  const exportJSON = () => {
    if (!data) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `repair-atlas-${data.deviceId}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="r-app">
      <a
        className="r-skip"
        href="#atlas-main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('atlas-main')?.focus();
        }}
      >
        К содержимому
      </a>
      <header className="r-header">
        <Link className="r-brand" to="/" aria-label="RePair Atlas — на главную">
          <span>
            <GitBranch size={22} />
          </span>
          RePair <b>Atlas</b>
          <i>WORKSHOP</i>
        </Link>
        <div>
          <span className="r-local">
            <span />
            Локальное пространство
          </span>
          <a href={portfolioURL} className="r-back">
            В портфолио <ArrowUpRight size={15} />
          </a>
        </div>
      </header>
      <div className="r-shell">
        <aside className="r-sidebar">
          <div className="r-sidebar-title">
            <span className="r-eyebrow">НА ВЕРСТАКЕ</span>
            <span>02</span>
          </div>
          <h2>Ваше устройство</h2>
          <p className="r-muted">Выберите основу маршрута.</p>
          <div className="r-devices">
            {catalog?.devices.map((item) => (
              <button
                key={item.id}
                className={`r-device-card ${item.id === device?.id ? 'is-selected' : ''}`}
                aria-pressed={item.id === device?.id}
                onClick={() =>
                  confirm(
                    'Сменить устройство?',
                    'Текущий план и прогресс будут заменены шаблоном выбранного вымышленного устройства.',
                    () => replace(makeDraft(item.id, catalog)),
                  )
                }
              >
                <div className="r-mini-art">
                  <DeviceArt device={item} small />
                </div>
                <strong>{item.name}</strong>
                <span>{item.subtitle}</span>
                <small>{item.revision}</small>
                {item.id === device?.id && (
                  <Check size={15} className="r-device-check" />
                )}
              </button>
            ))}
          </div>
          <div className="r-sidebar-info">
            <span className="r-demo-tag">ДЕМОНСТРАЦИЯ</span>
            <h3>
              Вымышленные устройства.
              <br />
              Настоящая логика.
            </h3>
            <p>
              Детали, цены и этапы придуманы для проверки конструктора. Это не
              руководство по ремонту реальной техники.
            </p>
          </div>
          <div className="r-sidebar-foot">
            <ShieldCheck size={17} />
            <span>
              Без регистрации.
              <br />
              Данные в вашем браузере.
            </span>
          </div>
        </aside>
        <main id="atlas-main" tabIndex={-1} className="r-main">
          <div className="r-breadcrumb">
            МАСТЕРСКАЯ <span>/</span> {device?.name ?? 'ПЛАН РЕМОНТА'}{' '}
            <span>/</span> <b>ДЕМО</b>
          </div>
          <section className="r-hero">
            <div>
              <span className="r-eyebrow">
                <span className="r-live-dot" />
                МЕНЬШЕ ЗАМЕН. БОЛЬШЕ СМЫСЛА.
              </span>
              <h1>
                Не списывать.
                <br />
                <span>Разобраться.</span>
              </h1>
              <p>
                Соберите понятный маршрут: от совместимой
                <br className="r-desktop-br" /> детали до последнего шага.
              </p>
            </div>
            {device && (
              <div className="r-hero-art">
                <span className="r-art-label">EXPLODED THINKING / 003</span>
                <DeviceArt device={device} />
                <span className="r-art-caption">
                  {device.name}
                  <span>МОДУЛЬНАЯ ДЕМО-МОДЕЛЬ</span>
                </span>
              </div>
            )}
          </section>
          <p className="r-mobile-demo">
            Демо: устройства, детали и цены вымышлены. Это не инструкция для
            реальной техники.
          </p>
          {notice && (
            <div
              className={`r-notice ${notice.error ? 'is-error' : ''}`}
              role={notice.error ? 'alert' : 'status'}
            >
              {notice.error ? <CircleHelp size={17} /> : <Check size={17} />}
              <p>{notice.text}</p>
              <button
                className="r-icon"
                aria-label="Закрыть уведомление"
                onClick={() => setNotice(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {(issue || validation.error) && (
            <div className="r-notice is-error" role="alert">
              <CircleHelp size={17} />
              <p>{issue || validation.error}</p>
            </div>
          )}
          <div className="r-workspace-heading">
            <div>
              <span className="r-eyebrow">ТЕКУЩИЙ ПЛАН</span>
              <h2>{data?.name ?? 'Подготовка мастерской…'}</h2>
            </div>
            <div className="r-file-actions">
              <button
                className="r-icon"
                aria-label="Параметры плана"
                disabled={!data}
                onClick={() => setSettings(true)}
              >
                <Settings2 size={17} />
              </button>
              <button
                className="r-button r-outline"
                disabled={!data}
                onClick={exportJSON}
              >
                <Download size={14} />
                Экспорт JSON
              </button>
              <button
                className="r-icon"
                aria-label="Импорт JSON"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={17} />
              </button>
            </div>
          </div>
          <input
            ref={fileRef}
            className="r-sr"
            type="file"
            accept=".json,application/json"
            aria-label="Файл плана JSON"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file || !catalog) return;
              try {
                if (file.size > 256 * 1024)
                  throw new Error('Файл больше 256 КБ');
                const imported = importDraft(await file.text(), catalog);
                confirm(
                  'Импортировать план?',
                  'Текущий план будет заменён проверенными данными из файла. Версия каталога должна совпадать.',
                  () => {
                    replace(imported);
                    setNotice({ text: 'План импортирован.', error: false });
                  },
                );
              } catch (e) {
                setNotice({
                  text: `Импорт отклонён: ${errorText(e)}`,
                  error: true,
                });
              }
            }}
          />
          {data && catalog && device ? (
            <>
              <div className="r-workspace-nav">
                <nav aria-label="Разделы плана">
                  <NavLink to="/" end>
                    <GitBranch size={15} />
                    Маршрут
                  </NavLink>
                  <NavLink to="/compare">
                    <SlidersHorizontal size={15} />
                    Сравнение
                  </NavLink>
                  <NavLink to="/catalog">
                    <Layers3 size={15} />
                    Совместимость
                  </NavLink>
                </nav>
                <Link className="r-start" to="/run">
                  <Play size={13} />
                  <span>Пройти маршрут</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              <div
                className={`r-plan-status ${problems.length ? 'has-conflict' : ''}`}
              >
                <span>
                  {problems.length ? (
                    <CircleHelp size={15} />
                  ) : (
                    <Check size={15} />
                  )}{' '}
                  {problems.length
                    ? `Конфликтов совместимости: ${problems.length}`
                    : 'Детали совместимы'}
                </span>
                <span>
                  {data.steps.length} шагов <span>·</span>{' '}
                  {totals(data, catalog).minutes} мин <span>·</span>{' '}
                  {totals(data, catalog).reused} детали уже есть
                </span>
              </div>
              <Routes>
                <Route
                  path="/"
                  element={
                    <Plan
                      data={data}
                      catalog={catalog}
                      commit={commit}
                      onEdit={(step) => setEditor({ step })}
                      onAdd={() => setEditor({})}
                      onDelete={(step) =>
                        confirm(
                          'Удалить шаг?',
                          `«${step.title}». Если от него зависят другие шаги, сначала удалите эти зависимости. Прохождение будет сброшено.`,
                          () => replace(deleteStep(data, step.id, catalog)),
                        )
                      }
                    />
                  }
                />
                <Route
                  path="/compare"
                  element={
                    <Compare
                      data={data}
                      catalog={catalog}
                      onApply={(next) =>
                        confirm(
                          'Применить вариант?',
                          'Будут заменены детали и признаки наличия; прохождение сбросится. Шаги, ставка и инструменты останутся из текущего плана.',
                          () => replace(next),
                        )
                      }
                    />
                  }
                />
                <Route
                  path="/catalog"
                  element={<Matrix data={data} catalog={catalog} />}
                />
                <Route
                  path="/run"
                  element={
                    <Run
                      data={data}
                      catalog={catalog}
                      commit={commit}
                      onReset={() =>
                        confirm(
                          'Сбросить прохождение?',
                          'Все отметки выполнения будут сняты. Шаги, детали и смета сохранятся.',
                          () => replace({ ...data, completed: [] }),
                        )
                      }
                    />
                  }
                />
                <Route
                  path="*"
                  element={
                    <div className="r-empty">
                      <h2>Раздел не найден</h2>
                      <Link to="/">Вернуться к маршруту</Link>
                    </div>
                  }
                />
              </Routes>
            </>
          ) : (
            <div className="r-empty">
              {query.isError ? (
                <>
                  <p>Не удалось загрузить каталог.</p>
                  <button
                    className="r-button r-dark"
                    onClick={() => void query.refetch()}
                  >
                    Повторить загрузку
                  </button>
                </>
              ) : catalog && (issue || validation.error) ? (
                <>
                  <h2>Восстановить мастерскую</h2>
                  <p>
                    Можно импортировать сохранённый JSON или явно заменить
                    локальные данные демопланом.
                  </p>
                  <button
                    className="r-button r-dark"
                    onClick={() =>
                      confirm(
                        'Загрузить демоплан?',
                        'Содержимое локального хранилища этого проекта будет заменено.',
                        () => replace(makeDraft('mica', catalog)),
                      )
                    }
                  >
                    Загрузить демоплан
                  </button>
                </>
              ) : (
                <p role="status">Загружаем каталог…</p>
              )}
            </div>
          )}
          <footer className="r-footer">
            <span>
              <GitBranch size={14} />
              RePair Atlas <span>·</span> Продлить историю вещей.
            </span>
            <span>Учебный MVP / каталог v1</span>
            <a href={portfolioURL}>
              Все проекты <ArrowUpRight size={13} />
            </a>
          </footer>
        </main>
      </div>
      {editor && data && catalog && (
        <StepDialog
          step={editor.step}
          data={data}
          catalog={catalog}
          onClose={() => setEditor(null)}
          onSave={(step) => {
            replace(saveStep(data, step, catalog));
            setNotice({
              text: 'Шаг сохранён. Прохождение сброшено.',
              error: false,
            });
          }}
        />
      )}
      {settings && data && catalog && (
        <SettingsDialog
          data={data}
          onClose={() => setSettings(false)}
          onSave={(values) =>
            replace(validateDraft({ ...data, ...values }, catalog))
          }
        />
      )}{' '}
      {confirmation && (
        <Confirm
          title={confirmation.title}
          description={confirmation.description}
          onConfirm={confirmation.action}
          onClose={() => setConfirmation(null)}
        />
      )}
    </div>
  );
}
