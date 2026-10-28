import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Globe2,
  History,
  Info,
  LockKeyhole,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { loadDemos } from './demos';
import { participantSchema, type Participant, type Workspace } from './model';
import { useQuietStore } from './store';
import { ConfirmDialog, ParticipantDialog } from './forms';
import { Planner } from './Planner';
import { weekdayLabels, scoreText } from './format';

type Confirmation = { title: string; description: string; action: () => void };

function HistoryPage({
  data,
  onDelete,
}: {
  data: Workspace;
  onDelete: (id: string) => void;
}) {
  const totals = data.participants.map((person) => ({
    ...person,
    burden: data.history.reduce(
      (sum, meeting) =>
        sum +
        meeting.costs
          .filter((cost) => cost.id === person.id)
          .reduce((total, cost) => total + cost.penalty / 100, 0),
      0,
    ),
  }));
  return (
    <section className="q-history">
      <div className="q-history-intro">
        <div>
          <History size={19} />
          <h2>Кому было неудобно?</h2>
        </div>
        <p>
          Один балл истории — 100 штрафных баллов встречи. Следующий подбор
          учитывает эту нагрузку, если включён учёт прошлых уступок.
        </p>
        <div className="q-burden-grid">
          {totals.map((person, index) => (
            <div key={person.id}>
              <span className={`q-avatar avatar-${index % 4}`}>
                {person.name.slice(0, 1)}
              </span>
              <span>{person.name}</span>
              <strong>
                {scoreText(person.burden)}
                <small> балла</small>
              </strong>
            </div>
          ))}
        </div>
      </div>
      <div className="q-history-heading">
        <h2>Сохранённые встречи</h2>
        <span>{data.history.length} / 100</span>
      </div>
      {data.history.length === 0 ? (
        <div className="q-empty">
          <CalendarDays size={30} />
          <h3>История начинается с первой встречи</h3>
          <p>
            Подберите время и нажмите «В историю», чтобы учесть уступки в
            следующих встречах.
          </p>
          <Link className="q-button q-button-dark" to="/">
            Подобрать время <ArrowUpRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="q-history-list">
          {[...data.history]
            .sort((a, b) => b.startUtc.localeCompare(a.startUtc))
            .map((meeting) => (
              <article key={meeting.id}>
                <div className="q-history-item-top">
                  <div>
                    <span>
                      {meeting.demo ? 'ДЕМО-ЗАПИСЬ' : 'ЛОКАЛЬНАЯ ЗАПИСЬ'}
                    </span>
                    <h3>{meeting.title}</h3>
                    <p>
                      {new Date(meeting.startUtc).toLocaleString('ru', {
                        timeZone: data.settings.organizerZone,
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}{' '}
                      · {data.settings.organizerZone}
                    </p>
                  </div>
                  <button
                    className="q-icon-button"
                    aria-label={`Удалить встречу ${meeting.id}`}
                    onClick={() => onDelete(meeting.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="q-history-costs">
                  {meeting.costs.map((cost) => (
                    <span key={cost.id}>
                      {cost.name}
                      <b>{scoreText(cost.penalty / 100)}</b>
                      <small>{cost.outsideMinutes} мин вне окна</small>
                    </span>
                  ))}
                </div>
              </article>
            ))}
        </div>
      )}
    </section>
  );
}

export function App() {
  const { workspace, storageIssue, replace } = useQuietStore();
  const demos = useQuery({
    queryKey: ['quietslot', 'demo-scenarios'],
    queryFn: loadDemos,
  });
  const [personDialog, setPersonDialog] = useState<{
    person?: Participant;
    fresh?: boolean;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const location = useLocation();
  const historyPage = location.pathname === '/history';
  const portfolioURL = import.meta.env.DEV ? 'http://127.0.0.1:4173/' : '../';
  const notify = (text: string, error = false) => setNotice({ text, error });
  useEffect(() => {
    if (!workspace && !storageIssue && demos.data) {
      try {
        replace(demos.data[0].data);
      } catch {
        /* Storage issue is displayed by the store. */
      }
    }
  }, [workspace, storageIssue, demos.data, replace]);
  useEffect(() => {
    document.title = historyPage
      ? 'История встреч — QuietSlot'
      : 'QuietSlot — хорошее время для каждого';
  }, [historyPage]);
  const changeDemo = (data: Workspace) =>
    setConfirmation({
      title: 'Загрузить демосценарий?',
      description:
        'Текущая команда, настройки и локальная история будут заменены вымышленными данными. Отдельные встречи можно предварительно выгрузить в ICS.',
      action: () => {
        replace(data);
        notify(
          'Демосценарий загружен. Все участники и встречи в нём вымышлены.',
        );
      },
    });
  const savePerson = (person: Participant) => {
    if (!workspace) return;
    const parsed = participantSchema.parse(person);
    replace({
      ...workspace,
      ...(personDialog?.fresh
        ? { id: crypto.randomUUID(), demo: false, history: [] }
        : {}),
      participants: personDialog?.fresh
        ? [parsed]
        : workspace.participants.some((item) => item.id === parsed.id)
          ? workspace.participants.map((item) =>
              item.id === parsed.id ? parsed : item,
            )
          : [...workspace.participants, parsed],
    });
    setPersonDialog(null);
    notify('Команда обновлена. Варианты пересчитаны.');
  };
  const zones = ['UTC', ...Intl.supportedValuesOf('timeZone')];
  return (
    <div className="q-app">
      <a
        className="q-skip"
        href="#quiet-main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('quiet-main')?.focus();
        }}
      >
        К содержимому
      </a>
      <header className="q-header q-container">
        <Link to="/" className="q-brand" aria-label="QuietSlot — на главную">
          <span>
            <Clock3 size={22} strokeWidth={1.7} />
          </span>
          quietslot<span className="q-brand-period">.</span>
        </Link>
        <nav aria-label="Навигация QuietSlot">
          <Link to="/" aria-current={!historyPage ? 'page' : undefined}>
            Планировщик
          </Link>
          <Link to="/history" aria-current={historyPage ? 'page' : undefined}>
            История <span>{workspace?.history.length ?? 0}</span>
          </Link>
        </nav>
        <div className="q-header-right">
          <span className="q-local">
            <i />
            Локально
          </span>
          <a href={portfolioURL} aria-label="Вернуться в портфолио">
            <ArrowUpRight size={19} />
          </a>
        </div>
      </header>
      <main id="quiet-main" tabIndex={-1} className="q-container q-main">
        <div className="q-page-title">
          <div>
            <span className="q-eyebrow">
              МЕНЬШЕ НЕУДОБНЫХ ЧАСОВ. БОЛЬШЕ ОБЩЕГО ВРЕМЕНИ.
            </span>
            <h1>
              {historyPage ? (
                <>
                  У каждой уступки <br />
                  есть <span>история.</span>
                </>
              ) : (
                <>
                  Хорошее время. <br />
                  <span>Для каждого.</span>
                </>
              )}
            </h1>
            <p>
              {historyPage
                ? 'Контекст прошлых встреч для более внимательного планирования.'
                : 'Соберите команду — найдём время с понятным компромиссом.'}
            </p>
          </div>
          <div className="q-title-art" aria-hidden="true">
            <div className="q-orbit orbit-one" />
            <div className="q-orbit orbit-two" />
            <div className="q-art-clock">
              <span />
              <i />
            </div>
            <span className="q-art-label">
              DIFFERENT ZONES
              <br />
              SHARED MOMENTS
            </span>
            <span className="q-art-spark">✳</span>
          </div>
        </div>
        {notice && (
          <div
            className={`q-notice ${notice.error ? 'is-error' : ''}`}
            role={notice.error ? 'alert' : 'status'}
          >
            {notice.error ? <Info size={16} /> : <Check size={16} />}
            <p>{notice.text}</p>
            <button
              className="q-icon-button"
              aria-label="Закрыть уведомление"
              onClick={() => setNotice(null)}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {storageIssue && (
          <div className="q-notice is-error" role="alert">
            <Info size={16} />
            <p>{storageIssue} Восстановление демо доступно в меню сценариев.</p>
          </div>
        )}
        <div className="q-workspace-bar">
          <span>
            <span className="q-demo-tag">
              {workspace?.demo ? 'ДЕМО' : 'ЛОКАЛЬНЫЙ СЦЕНАРИЙ'}
            </span>
            {workspace?.demo
              ? 'Вымышленные участники и история. Можно экспериментировать.'
              : 'Данные остаются в этом браузере.'}
          </span>
          <details
            className="q-demo-menu"
            onClick={(event) => {
              if ((event.target as Element).closest('button'))
                event.currentTarget.open = false;
            }}
          >
            <summary>
              Сценарии <ChevronDown size={13} />
            </summary>
            <div>
              {workspace && (
                <button
                  onClick={() =>
                    setConfirmation({
                      title: 'Начать свою команду?',
                      description:
                        'После сохранения первого участника текущие команда и история будут заменены. Отмена формы сохранит текущий сценарий.',
                      action: () => setPersonDialog({ fresh: true }),
                    })
                  }
                >
                  <strong>Своя команда</strong>
                  <span>Начать с одного участника и пустой истории</span>
                </button>
              )}
              {demos.data?.map((demo) => (
                <button key={demo.name} onClick={() => changeDemo(demo.data)}>
                  <strong>{demo.name}</strong>
                  <span>{demo.description}</span>
                </button>
              ))}
            </div>
          </details>
        </div>
        {!workspace && !storageIssue && (
          <div className="q-empty" role="status">
            {demos.isError ? (
              <>
                <p>Не удалось загрузить демосценарии.</p>
                <button
                  className="q-button q-button-outline"
                  onClick={() => void demos.refetch()}
                >
                  Повторить
                </button>
              </>
            ) : (
              'Готовим пространство…'
            )}
          </div>
        )}
        {workspace && (
          <Routes>
            <Route
              path="/"
              element={
                <div className="q-layout">
                  <aside className="q-team" aria-labelledby="team-heading">
                    <div className="q-team-heading">
                      <div>
                        <Users size={16} />
                        <h2 id="team-heading">Ваша команда</h2>
                        <span>{workspace.participants.length}/8</span>
                      </div>
                      <button
                        className="q-icon-button"
                        disabled={workspace.participants.length >= 8}
                        onClick={() => setPersonDialog({})}
                        aria-label="Добавить участника в команду"
                      >
                        <Plus size={17} />
                      </button>
                    </div>
                    <p className="q-team-intro">
                      Разные ритмы.
                      <br />
                      Одна встреча.
                    </p>
                    <div className="q-team-list">
                      {workspace.participants.map((person, index) => (
                        <article key={person.id}>
                          <div className="q-member-top">
                            <span className={`q-avatar avatar-${index % 4}`}>
                              {person.name.slice(0, 1)}
                            </span>
                            <div>
                              <h3>{person.name}</h3>
                              <span>
                                {person.timeZone
                                  .split('/')
                                  .at(-1)
                                  ?.replaceAll('_', ' ')}
                              </span>
                            </div>
                            <button
                              className="q-icon-button"
                              aria-label={`Редактировать ${person.name}`}
                              onClick={() => setPersonDialog({ person })}
                            >
                              <Pencil size={13} />
                            </button>
                          </div>
                          <div className="q-member-window">
                            <Clock3 size={12} />
                            <strong>
                              {person.workStart} — {person.workEnd}
                            </strong>
                            {person.workStart > person.workEnd && (
                              <span>+1 день</span>
                            )}
                            {person.strict && <LockKeyhole size={11} />}
                          </div>
                          <div className="q-member-days">
                            {weekdayLabels.map((day, dayIndex) => (
                              <span
                                key={day}
                                className={
                                  person.days.includes(dayIndex + 1)
                                    ? 'is-working'
                                    : ''
                                }
                              >
                                {day}
                              </span>
                            ))}
                          </div>
                          <div className="q-member-bottom">
                            <span>
                              {person.blockedDates.length
                                ? `Исключено дат: ${person.blockedDates.length}`
                                : person.strict
                                  ? 'Строгое окно'
                                  : 'Допускает компромисс'}
                            </span>
                            <button
                              className="q-icon-button"
                              disabled={workspace.participants.length <= 1}
                              aria-label={`Удалить ${person.name}`}
                              onClick={() =>
                                setConfirmation({
                                  title: `Удалить участника «${person.name}»?`,
                                  description:
                                    'Он больше не участвует в подборе. Снимки прошлых встреч останутся в истории.',
                                  action: () =>
                                    replace({
                                      ...workspace,
                                      participants:
                                        workspace.participants.filter(
                                          (item) => item.id !== person.id,
                                        ),
                                    }),
                                })
                              }
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                    <button
                      className="q-add-member"
                      disabled={workspace.participants.length >= 8}
                      onClick={() => setPersonDialog({})}
                    >
                      <Plus size={14} />
                      Добавить участника
                    </button>
                    <div className="q-team-tip">
                      <Globe2 size={20} />
                      <strong>Пояс, а не смещение.</strong>
                      <p>
                        IANA-пояса учитывают переходы на летнее время. Проверяем
                        каждый момент в локальном времени участника.
                      </p>
                    </div>
                  </aside>
                  <Planner data={workspace} onNotice={notify} />
                </div>
              }
            />
            <Route
              path="/history"
              element={
                <HistoryPage
                  data={workspace}
                  onDelete={(id) =>
                    setConfirmation({
                      title: 'Удалить встречу из истории?',
                      description:
                        'Её нагрузка перестанет учитываться в следующих подборках. Календарные события в других приложениях не изменятся.',
                      action: () => {
                        replace({
                          ...workspace,
                          history: workspace.history.filter(
                            (meeting) => meeting.id !== id,
                          ),
                        });
                        notify('Запись удалена из локальной истории.');
                      },
                    })
                  }
                />
              }
            />
            <Route
              path="*"
              element={
                <div className="q-empty">
                  <h2>Страница не найдена</h2>
                  <Link className="q-button q-button-dark" to="/">
                    К планировщику <ArrowLeft size={15} />
                  </Link>
                </div>
              }
            />
          </Routes>
        )}
        <footer className="q-footer">
          <span>
            <Clock3 size={14} />
            quietslot. <span>Внимание ко времени друг друга.</span>
          </span>
          <span>
            <ShieldCheck size={13} />
            Без аккаунтов и подключения календарей
          </span>
          <a href={portfolioURL}>
            В портфолио <ArrowUpRight size={13} />
          </a>
        </footer>
      </main>
      <datalist id="q-timezones">
        {zones.map((zone) => (
          <option key={zone} value={zone} />
        ))}
      </datalist>
      {personDialog && (
        <ParticipantDialog
          person={personDialog.person}
          onClose={() => setPersonDialog(null)}
          onSave={savePerson}
        />
      )}
      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          description={confirmation.description}
          onClose={() => setConfirmation(null)}
          onConfirm={confirmation.action}
        />
      )}
    </div>
  );
}
