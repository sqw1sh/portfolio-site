import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Download,
  History,
  Info,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';
import {
  addDays,
  clock,
  compareCandidate,
  exportICS,
  generateCandidates,
  localInfo,
  localRange,
  minuteOf,
  saveCandidate,
  type Candidate,
  type Workspace,
} from './model';
import { useQuietStore } from './store';
import { SettingsForm } from './forms';
import { scoreText, shortDate } from './format';

function weekday(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('ru', {
    weekday: 'short',
    timeZone: 'UTC',
  });
}
function grade(candidate: Candidate) {
  return candidate.score === 0
    ? 'good'
    : candidate.score <= 50
      ? 'mixed'
      : 'hard';
}

function Heatmap({
  data,
  candidates,
  selected,
  onSelect,
}: {
  data: Workspace;
  candidates: Candidate[];
  selected?: Candidate;
  onSelect: (utc: string) => void;
}) {
  const dates = Array.from({ length: data.settings.days }, (_, index) =>
    addDays(data.settings.startDate, index),
  );
  const times: number[] = [];
  for (
    let minute = Math.ceil(minuteOf(data.settings.searchStart) / 30) * 30;
    minute < minuteOf(data.settings.searchEnd);
    minute += 30
  )
    times.push(minute);
  const byCell = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const local = localInfo(
      Date.parse(candidate.startUtc),
      data.settings.organizerZone,
    );
    const key = `${local.date}|${local.minute}`;
    byCell.set(key, [...(byCell.get(key) ?? []), candidate]);
  }
  return (
    <div className="q-heat-scroll">
      <table className="q-heatmap">
        <caption className="sr-only">
          Тепловая карта: время организатора, даты и штрафы. Чем ниже число, тем
          удобнее встреча. Повторяющийся час показан отдельными моментами с
          UTC-смещением.
        </caption>
        <thead>
          <tr>
            <th>
              <span className="sr-only">Время</span>
            </th>
            {dates.map((date) => (
              <th key={date}>
                <span>{weekday(date)}</span>
                <strong>{shortDate(date)}</strong>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((minute) => (
            <tr key={minute}>
              <th scope="row">{clock(minute)}</th>
              {dates.map((date) => {
                const cell = byCell.get(`${date}|${minute}`);
                return (
                  <td key={date}>
                    {cell ? (
                      cell.map((candidate) => (
                        <button
                          key={candidate.startUtc}
                          className={`q-heat-cell grade-${grade(candidate)} ${selected?.startUtc === candidate.startUtc ? 'selected' : ''}`}
                          aria-pressed={
                            selected?.startUtc === candidate.startUtc
                          }
                          aria-label={`${date}, ${clock(minute)}, UTC${localInfo(Date.parse(candidate.startUtc), data.settings.organizerZone).offset}, штраф ${scoreText(candidate.score)}`}
                          onClick={() => onSelect(candidate.startUtc)}
                        >
                          {selected?.startUtc === candidate.startUtc ? (
                            <Check size={12} />
                          ) : (
                            scoreText(candidate.score)
                          )}
                          {cell.length > 1 && (
                            <small>
                              {
                                localInfo(
                                  Date.parse(candidate.startUtc),
                                  data.settings.organizerZone,
                                ).offset
                              }
                            </small>
                          )}
                        </button>
                      ))
                    ) : (
                      <span
                        className="q-cell-unavailable"
                        title="Недоступно по ограничениям или длительности"
                      >
                        —
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Planner({
  data,
  onNotice,
}: {
  data: Workspace;
  onNotice: (text: string, error?: boolean) => void;
}) {
  const { replace, select, selectedUtc, view, setView } = useQuietStore();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const candidates = useMemo(() => generateCandidates(data, now), [data, now]);
  const selected =
    candidates.find((slot) => slot.startUtc === selectedUtc) ?? candidates[0];
  const single = useMemo(
    () =>
      selected ? compareCandidate(data, selected.startUtc, 'single') : null,
    [data, selected],
  );
  const series = useMemo(
    () =>
      selected ? compareCandidate(data, selected.startUtc, 'series') : null,
    [data, selected],
  );
  const exportSelected = () => {
    if (!selected) return;
    const url = URL.createObjectURL(
      new Blob([exportICS(data, selected)], {
        type: 'text/calendar;charset=utf-8',
      }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'quietslot.ics';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onNotice(
      'ICS подготовлен. Экспорт сам по себе не добавляет встречу в историю.',
    );
  };
  return (
    <div className="q-planner">
      <SettingsForm
        key={JSON.stringify(data.settings)}
        settings={data.settings}
        onSave={(settings) => {
          replace({ ...data, settings });
          onNotice('Варианты пересчитаны.');
        }}
      />
      <div className="q-results-title">
        <div>
          <span className="q-eyebrow">ВРЕМЯ ВСТРЕЧАЕТ КОМАНДУ</span>
          <h2>
            {candidates.length ? 'Есть подходящий момент' : 'Ищем общее время'}
            <span>.</span>
          </h2>
        </div>
        <span className="q-results-count">
          {candidates.length} вариантов · шаг 30 мин
        </span>
      </div>
      {candidates.length > 0 ? (
        <>
          <div className="q-top-slots">
            {candidates.slice(0, 3).map((slot, index) => {
              const local = localInfo(
                Date.parse(slot.startUtc),
                data.settings.organizerZone,
              );
              return (
                <button
                  key={slot.startUtc}
                  className={`q-slot-card ${selected?.startUtc === slot.startUtc ? 'is-selected' : ''}`}
                  aria-pressed={selected?.startUtc === slot.startUtc}
                  onClick={() => select(slot.startUtc)}
                >
                  <span>
                    {index === 0 ? (
                      <>
                        <Sparkles size={12} />
                        Лучший по рейтингу
                      </>
                    ) : (
                      `Вариант ${index + 1}`
                    )}
                    <ArrowRight size={13} />
                  </span>
                  <strong>
                    {local.time}
                    <small>{shortDate(local.date)}</small>
                  </strong>
                  <div>
                    <span className={`q-score grade-${grade(slot)}`}>
                      Штраф {scoreText(slot.score)}
                    </span>
                    <small>
                      {slot.convenient}/{data.participants.length} в своём окне
                    </small>
                  </div>
                </button>
              );
            })}
          </div>
          <section className="q-map-panel" aria-labelledby="map-heading">
            <div className="q-map-header">
              <div>
                <CalendarDays size={16} />
                <h3 id="map-heading">Общая картина</h3>
              </div>
              <div
                className="q-view-switch"
                role="group"
                aria-label="Представление вариантов"
              >
                <button
                  onClick={() => setView('heatmap')}
                  aria-pressed={view === 'heatmap'}
                  aria-label="Тепловая карта"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setView('table')}
                  aria-pressed={view === 'table'}
                  aria-label="Таблица вариантов"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
            <div className="q-map-subline">
              <span>{data.settings.organizerZone}</span>
              <span>
                {data.settings.mode === 'series'
                  ? `${data.settings.occurrences} встречи с интервалом в неделю`
                  : 'Разовая встреча'}{' '}
                · {data.settings.duration} мин
              </span>
            </div>
            {view === 'heatmap' ? (
              <Heatmap
                data={data}
                candidates={candidates}
                selected={selected}
                onSelect={select}
              />
            ) : (
              <div className="q-table-scroll">
                <table className="q-options-table">
                  <caption className="sr-only">
                    Все варианты отсортированы по штрафу, затем по UTC-времени.
                  </caption>
                  <thead>
                    <tr>
                      <th>Время организатора</th>
                      <th>Штраф</th>
                      <th>В рабочем окне</th>
                      <th>Выбрать</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((slot) => {
                      const local = localInfo(
                        Date.parse(slot.startUtc),
                        data.settings.organizerZone,
                      );
                      return (
                        <tr key={slot.startUtc}>
                          <td>
                            <strong>{local.time}</strong>
                            <span>
                              {shortDate(local.date)} · UTC{local.offset}
                            </span>
                          </td>
                          <td>{scoreText(slot.score)}</td>
                          <td>
                            {slot.convenient}/{data.participants.length}
                          </td>
                          <td>
                            <button
                              className="q-table-pick"
                              onClick={() => select(slot.startUtc)}
                              aria-label={`Выбрать ${slot.startUtc}`}
                              aria-pressed={
                                slot.startUtc === selected?.startUtc
                              }
                            >
                              {slot.startUtc === selected?.startUtc ? (
                                <Check size={15} />
                              ) : (
                                <ChevronRight size={15} />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="q-map-legend">
              <span>
                <i className="legend-good" />
                Удобно
              </span>
              <span>
                <i className="legend-mixed" />
                Компромисс
              </span>
              <span>
                <i className="legend-hard" />
                Неудобно
              </span>
              <small>
                Меньше штраф — лучше <ArrowDown size={10} />
              </small>
            </div>
          </section>
          {selected && (
            <section
              className="q-explanation"
              aria-labelledby="explanation-heading"
            >
              <div className="q-explanation-header">
                <div>
                  <span className="q-eyebrow">КАЖДАЯ ОЦЕНКА ОБЪЯСНИМА</span>
                  <h2 id="explanation-heading">Как это выглядит для команды</h2>
                </div>
                <span className="q-score grade-good">
                  {selected.convenient}/{data.participants.length} в рабочем
                  окне
                </span>
              </div>
              <div className="q-person-times">
                {selected.occurrences[0].costs.map((cost, index) => {
                  const local = localRange(
                    selected.startUtc,
                    selected.endUtc,
                    cost.timeZone,
                  );
                  return (
                    <div className="q-person-time" key={cost.id}>
                      <span className={`q-avatar avatar-${index % 4}`}>
                        {cost.name.slice(0, 1)}
                      </span>
                      <div>
                        <strong>{cost.name}</strong>
                        <small>{cost.timeZone}</small>
                      </div>
                      <div>
                        <strong>{local.label}</strong>
                        <small>
                          {shortDate(local.start.date)} · UTC
                          {local.start.offset}
                          {local.start.offset !== local.end.offset &&
                            ` → ${local.end.offset}`}
                        </small>
                      </div>
                      <span
                        className={`q-score ${cost.penalty === 0 ? 'grade-good' : 'grade-mixed'}`}
                      >
                        {cost.penalty === 0
                          ? 'В своём окне'
                          : `${cost.outsideMinutes} мин вне окна`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <details className="q-score-details">
                <summary>
                  <Info size={13} />
                  Почему такой штраф: {scoreText(selected.score)}
                </summary>
                <p>
                  За каждого участника: 100 × доля минут вне рабочего окна + 50
                  × доля ночных минут (22:00–07:00) вне окна. Жёсткие
                  ограничения не нарушаются.
                </p>
                <p>
                  База: <b>{scoreText(selected.baseScore)}</b>. Надбавка за
                  историю: <b>{scoreText(selected.fairnessPenalty)}</b>. История
                  добавляет 25% базового штрафа за каждый накопленный балл
                  участника, максимум за 10 баллов. В серии нагрузка
                  накапливается от встречи к встрече. Итог усредняется по людям
                  и встречам.
                </p>
              </details>
              <div className="q-comparison">
                <span>Сравнение для этого старта</span>
                <div>
                  <span>
                    Разовая{' '}
                    <b>{single ? scoreText(single.score) : 'Недоступно'}</b>
                  </span>
                  <ArrowRight size={13} />
                  <span>
                    Серия ×{data.settings.occurrences}{' '}
                    <b>{series ? scoreText(series.score) : 'Недоступно'}</b>
                  </span>
                </div>
              </div>
              {data.settings.mode === 'series' && (
                <div className="q-series-dates">
                  <strong>Все встречи серии</strong>
                  {selected.occurrences.map((slot) => {
                    const local = localInfo(
                      Date.parse(slot.startUtc),
                      data.settings.organizerZone,
                    );
                    return (
                      <span key={slot.startUtc}>
                        {shortDate(local.date)} · {local.time} · UTC
                        {local.offset}
                      </span>
                    );
                  })}
                  <details className="q-series-team">
                    <summary>
                      Локальное время и нагрузка на всех встречах
                    </summary>
                    <div>
                      <table>
                        <thead>
                          <tr>
                            <th>Участник</th>
                            <th>Локальная дата</th>
                            <th>Время / UTC</th>
                            <th>Штраф</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.occurrences.flatMap((slot) =>
                            slot.costs.map((cost) => {
                              const local = localRange(
                                slot.startUtc,
                                slot.endUtc,
                                cost.timeZone,
                              );
                              return (
                                <tr key={`${slot.startUtc}-${cost.id}`}>
                                  <td>{cost.name}</td>
                                  <td>{shortDate(local.start.date)}</td>
                                  <td>
                                    {local.label} / {local.start.offset}
                                    {local.start.offset !== local.end.offset &&
                                      ` → ${local.end.offset}`}
                                  </td>
                                  <td>{scoreText(cost.penalty)}</td>
                                </tr>
                              );
                            }),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              )}
              <div className="q-export-actions">
                <p>
                  Сохранение — только в локальную историю.
                  <br />
                  Приглашения участникам не отправляются.
                </p>
                <button
                  className="q-button q-button-outline"
                  onClick={() => {
                    try {
                      replace(saveCandidate(data, selected));
                      onNotice(
                        'Встреча добавлена в историю. Нагрузка учтена в следующем подборе.',
                      );
                    } catch (failure) {
                      onNotice(
                        failure instanceof Error
                          ? failure.message
                          : 'Не удалось сохранить встречу.',
                        true,
                      );
                    }
                  }}
                >
                  <History size={14} />В историю
                </button>
                <button
                  className="q-button q-button-dark"
                  onClick={exportSelected}
                >
                  <Download size={15} />
                  Скачать .ics
                </button>
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="q-empty">
          <CalendarDays size={35} />
          <h2>Общего времени не нашлось</h2>
          <p>
            Проверьте строгие рабочие окна, исключённые даты и уже сохранённые
            встречи. При включённом фильтре прошлое время исключается. Для серии
            проверяются все недели; неоднозначные будущие времена DST
            исключаются.
          </p>
          <span>Ограничения не ослабляются автоматически.</span>
        </section>
      )}
      <p className="q-planner-note">
        {data.settings.mode === 'series'
          ? 'Серия сохраняет локальное время организатора; ICS содержит отдельные UTC-события. '
          : ''}
        Рейтинг сравнивает старты с шагом 30 минут и проверяет доступность
        каждые 15 минут.
      </p>
    </div>
  );
}
