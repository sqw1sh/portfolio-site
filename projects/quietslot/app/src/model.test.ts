import { describe, expect, it } from 'vitest';
import ICAL from 'ical.js';
import {
  addDays,
  compareCandidate,
  demoWorkspace,
  exportICS,
  generateCandidates,
  isWorking,
  localInfo,
  participantSchema,
  saveCandidate,
  workspaceSchema,
  type Workspace,
} from './model';

function fixture(date = '2026-10-28', zone = 'UTC'): Workspace {
  const data = demoWorkspace(false, date);
  data.history = [];
  data.participants = [
    {
      ...data.participants[0],
      timeZone: zone,
      workStart: '00:00',
      workEnd: '23:45',
      days: [1, 2, 3, 4, 5, 6, 7],
      strict: true,
    },
  ];
  data.settings = {
    ...data.settings,
    startDate: date,
    organizerZone: zone,
    days: 1,
    searchStart: '00:00',
    searchEnd: '23:45',
    duration: 30,
    fairness: false,
    excludePast: false,
  };
  return data;
}

describe('Календарь и доступность QuietSlot', () => {
  it('исключает прошедшие старты, когда включено ограничение будущим', () => {
    const data = fixture();
    data.settings.excludePast = true;
    const now = Date.parse('2026-10-28T10:10:00Z');
    expect(generateCandidates(data, now)[0].startUtc).toBe(
      '2026-10-28T10:30:00.000Z',
    );
  });
  it('не придумывает отсутствующий час при весеннем DST', () => {
    const data = fixture('2026-03-08', 'America/New_York');
    data.settings.searchEnd = '04:00';
    const slots = generateCandidates(data);
    expect(slots).toHaveLength(6);
    expect(
      slots.some((slot) =>
        localInfo(
          Date.parse(slot.startUtc),
          'America/New_York',
        ).time.startsWith('02:'),
      ),
    ).toBe(false);
  });
  it('сохраняет оба реальных момента повторяющегося часа осенью', () => {
    const data = fixture('2026-11-01', 'America/New_York');
    data.settings.searchEnd = '03:00';
    const repeats = generateCandidates(data).filter(
      (slot) =>
        localInfo(Date.parse(slot.startUtc), 'America/New_York').time ===
        '01:30',
    );
    expect(repeats).toHaveLength(2);
    expect(
      Date.parse(repeats[1].startUtc) - Date.parse(repeats[0].startUtc),
    ).toBe(3_600_000);
    expect(
      repeats.map(
        (slot) =>
          localInfo(Date.parse(slot.startUtc), 'America/New_York').offset,
      ),
    ).toEqual(['-04:00', '-05:00']);
  });
  it('учитывает разные локальные даты одного момента', () => {
    const ms = Date.parse('2026-01-05T00:00:00Z');
    expect(localInfo(ms, 'Asia/Tokyo')).toMatchObject({
      date: '2026-01-05',
      time: '09:00',
    });
    expect(localInfo(ms, 'America/Los_Angeles')).toMatchObject({
      date: '2026-01-04',
      time: '16:00',
    });
  });
  it('привязывает ночное окно к дню его начала', () => {
    const person = {
      ...fixture().participants[0],
      workStart: '22:00',
      workEnd: '02:00',
      days: [1],
    };
    expect(
      isWorking(person, localInfo(Date.parse('2026-01-06T01:00:00Z'), 'UTC')),
    ).toBe(true);
    expect(
      isWorking(person, localInfo(Date.parse('2026-01-06T23:00:00Z'), 'UTC')),
    ).toBe(false);
    const data = fixture('2026-01-06');
    data.participants = [person];
    data.settings.searchEnd = '02:00';
    expect(generateCandidates(data)[0].score).toBe(0);
  });
  it('проверяет всю длительность встречи, а не только начало', () => {
    const data = fixture();
    data.participants[0].workStart = '09:00';
    data.participants[0].workEnd = '10:00';
    data.settings.duration = 60;
    data.settings.searchStart = '09:00';
    data.settings.searchEnd = '11:00';
    expect(generateCandidates(data).map((slot) => slot.startUtc)).toEqual([
      '2026-10-28T09:00:00.000Z',
    ]);
  });
  it('при строгих несовместимых окнах возвращает пустой результат', () => {
    const data = fixture();
    data.participants = [
      data.participants[0],
      {
        ...data.participants[0],
        id: crypto.randomUUID(),
        timeZone: 'Asia/Tokyo',
      },
    ].map((person) => ({ ...person, workStart: '09:00', workEnd: '10:00' }));
    expect(generateCandidates(data)).toEqual([]);
  });
  it('запрет локальной даты остаётся жёстким и в мягком режиме', () => {
    const data = fixture();
    data.participants[0].strict = false;
    data.participants[0].blockedDates = ['2026-10-28'];
    expect(generateCandidates(data)).toEqual([]);
  });
  it('поддерживает смещение на 45 минут', () => {
    expect(
      localInfo(Date.parse('2026-10-28T00:00:00Z'), 'Asia/Kathmandu').time,
    ).toBe('05:45');
  });
});

describe('Справедливость, серии и история', () => {
  it('учёт истории меняет выбор при равной базовой цене', () => {
    const data = fixture();
    data.participants = [
      {
        ...data.participants[0],
        name: 'Первый',
        strict: false,
        workStart: '09:00',
        workEnd: '10:00',
      },
      {
        ...data.participants[0],
        id: crypto.randomUUID(),
        name: 'Второй',
        strict: false,
        workStart: '10:00',
        workEnd: '11:00',
      },
    ];
    data.settings = {
      ...data.settings,
      duration: 60,
      searchStart: '09:00',
      searchEnd: '11:00',
    };
    const previous = compareCandidate(data, '2026-10-21T09:00:00Z', 'single')!;
    data.history = [
      { ...previous.occurrences[0], id: 'past', title: 'История', demo: true },
    ];
    expect(generateCandidates(data)[0].startUtc).toContain('T09:00:00');
    data.settings.fairness = true;
    const results = generateCandidates(data);
    expect(results[0].startUtc).toContain('T10:00:00');
    expect(results).toEqual(generateCandidates(data));
    expect(results[0].score).toBe(
      results[0].baseScore + results[0].fairnessPenalty,
    );
  });
  it('недельная серия сохраняет время организатора при смене UTC-смещения', () => {
    const data = fixture('2026-10-25', 'America/New_York');
    data.settings.mode = 'series';
    data.settings.occurrences = 3;
    const slot = compareCandidate(data, '2026-10-25T14:00:00Z', 'series')!;
    expect(
      slot.occurrences.map(
        (item) => localInfo(Date.parse(item.startUtc), 'America/New_York').time,
      ),
    ).toEqual(['10:00', '10:00', '10:00']);
    expect(slot.occurrences[1].startUtc).toBe('2026-11-01T15:00:00.000Z');
    slot.occurrences.forEach((item) =>
      expect(Date.parse(item.endUtc) - Date.parse(item.startUtc)).toBe(
        30 * 60_000,
      ),
    );
  });
  it('исключает неоднозначный или пропущенный будущий старт серии', () => {
    const autumn = fixture('2026-10-25', 'America/New_York');
    expect(
      compareCandidate(autumn, '2026-10-25T05:30:00Z', 'series'),
    ).toBeNull();
    const spring = fixture('2026-03-01', 'America/New_York');
    expect(
      compareCandidate(spring, '2026-03-01T07:30:00Z', 'series'),
    ).toBeNull();
  });
  it('сохранённая встреча исключается из повторного бронирования', () => {
    const data = fixture();
    const slot = generateCandidates(data)[0];
    const saved = saveCandidate(data, slot);
    expect(saved.history).toHaveLength(1);
    expect(
      generateCandidates(saved).some((item) => item.startUtc === slot.startUtc),
    ).toBe(false);
    expect(() => saveCandidate(saved, slot)).toThrow('больше недоступен');
  });
  it('снимок истории не зависит от последующего редактирования имени', () => {
    const data = fixture();
    const saved = saveCandidate(data, generateCandidates(data)[0]);
    const oldName = saved.history[0].costs[0].name;
    saved.participants[0].name = 'Новое имя';
    expect(saved.history[0].costs[0].name).toBe(oldName);
  });
  it('валидирует IANA-пояса, часы и уникальность участников', () => {
    const data = fixture();
    expect(
      participantSchema.safeParse({
        ...data.participants[0],
        timeZone: 'Mars/Olympus',
      }).success,
    ).toBe(false);
    expect(
      participantSchema.safeParse({
        ...data.participants[0],
        workStart: '09:07',
      }).success,
    ).toBe(false);
    expect(
      workspaceSchema.safeParse({
        ...data,
        participants: [data.participants[0], data.participants[0]],
      }).success,
    ).toBe(false);
  });
});

describe('Экспорт iCalendar', () => {
  it('создаёт читаемую серию UTC-событий с правильной длительностью', () => {
    const data = fixture();
    data.settings.mode = 'series';
    data.settings.occurrences = 3;
    const candidate = generateCandidates(data)[0];
    const calendar = new ICAL.Component(
      ICAL.parse(exportICS(data, candidate, '2026-10-28T12:00:00Z')),
    );
    const events = calendar
      .getAllSubcomponents('vevent')
      .map((component) => new ICAL.Event(component));
    expect(events).toHaveLength(3);
    expect(events[0].startDate.toJSDate().toISOString()).toBe(
      candidate.startUtc,
    );
    expect(events[1].startDate.toJSDate().toISOString()).toBe(
      candidate.occurrences[1].startUtc,
    );
    expect(new Set(events.map((event) => event.uid)).size).toBe(3);
  });
  it('экранирует текст, защищает структуру события и соблюдает 75 октетов строки', () => {
    const data = fixture();
    data.settings.title =
      'Обсуждение, тест; \\ очень длинная строка кириллицы\nBEGIN:VEVENT';
    const text = exportICS(data, generateCandidates(data)[0]);
    const calendar = new ICAL.Component(ICAL.parse(text));
    expect(calendar.getAllSubcomponents('vevent')).toHaveLength(1);
    expect(
      new ICAL.Event(calendar.getFirstSubcomponent('vevent')!).summary,
    ).toBe(data.settings.title);
    text
      .split('\r\n')
      .forEach((line) =>
        expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75),
      );
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
