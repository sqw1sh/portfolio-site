import { Temporal } from '@js-temporal/polyfill';
import { z } from 'zod';

export function isTimeZone(zone: string) {
  if (zone !== 'UTC' && !/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+$/.test(zone))
    return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}
export const zoneSchema = z
  .string()
  .max(80)
  .refine(isTimeZone, 'Укажите существующий IANA-пояс, например Europe/Moscow');
const dateSchema = z.iso
  .date('Укажите корректную дату')
  .refine(
    (date) => date >= '2000-01-01' && date <= '2099-12-31',
    'Даты поддерживаются с 2000 по 2099 год',
  );
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):(00|15|30|45)$/, 'Время с шагом 15 минут');
const participantFieldsSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, 'Укажите имя').max(40, 'Максимум 40 символов'),
  timeZone: zoneSchema,
  workStart: timeSchema,
  workEnd: timeSchema,
  days: z
    .array(z.number().int().min(1).max(7))
    .min(1, 'Выберите хотя бы один рабочий день')
    .max(7)
    .refine((days) => new Set(days).size === days.length),
  blockedDates: z.array(dateSchema).max(30),
  strict: z.boolean(),
});
const windowDiffers = (person: { workStart: string; workEnd: string }) =>
  person.workStart !== person.workEnd;
export const participantSchema = participantFieldsSchema.refine(windowDiffers, {
  path: ['workEnd'],
  message: 'Начало и конец окна должны различаться',
});
export const participantFormSchema = participantFieldsSchema
  .omit({ id: true, blockedDates: true })
  .extend({
    blockedDatesText: z
      .string()
      .max(400)
      .refine(
        (text) =>
          text
            .split(/[\s,;]+/)
            .filter(Boolean)
            .every((date) => dateSchema.safeParse(date).success),
        'Даты: ГГГГ-ММ-ДД, через запятую',
      ),
  })
  .refine(windowDiffers, {
    path: ['workEnd'],
    message: 'Начало и конец окна должны различаться',
  });
export type ParticipantForm = z.infer<typeof participantFormSchema>;
export type Participant = z.infer<typeof participantSchema>;
export const settingsSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Минимум 3 символа')
      .max(100, 'Максимум 100 символов'),
    startDate: dateSchema,
    days: z.number().int().min(1).max(7),
    organizerZone: zoneSchema,
    duration: z
      .number()
      .int()
      .min(15)
      .max(120)
      .refine((value) => value % 15 === 0, 'Длительность кратна 15 минутам'),
    searchStart: timeSchema,
    searchEnd: timeSchema,
    mode: z.enum(['single', 'series']),
    occurrences: z.number().int().min(2).max(4),
    fairness: z.boolean(),
    excludePast: z.boolean(),
  })
  .refine((settings) => settings.searchStart < settings.searchEnd, {
    path: ['searchEnd'],
    message: 'Конец поиска должен быть позже начала в тот же день',
  });
export type Settings = z.infer<typeof settingsSchema>;
const costSchema = z.object({
  id: z.uuid(),
  name: z.string().max(40),
  timeZone: zoneSchema,
  outsideMinutes: z.number().min(0).max(120),
  nightMinutes: z.number().min(0).max(120),
  penalty: z.number().min(0).max(150),
});
export const meetingSchema = z
  .object({
    id: z.string().max(120),
    title: z.string().max(100),
    startUtc: z.iso.datetime(),
    endUtc: z.iso.datetime(),
    costs: z.array(costSchema).min(1).max(8),
    demo: z.boolean(),
  })
  .refine(
    (meeting) =>
      Date.parse(meeting.endUtc) > Date.parse(meeting.startUtc) &&
      Date.parse(meeting.endUtc) - Date.parse(meeting.startUtc) <= 120 * 60_000,
  );
export const workspaceSchema = z
  .object({
    version: z.literal(1),
    id: z.uuid(),
    demo: z.boolean(),
    participants: z.array(participantSchema).min(1).max(8),
    settings: settingsSchema,
    history: z.array(meetingSchema).max(100),
  })
  .refine(
    (data) =>
      new Set(data.participants.map((person) => person.id)).size ===
      data.participants.length,
    'ID участников повторяются',
  )
  .refine(
    (data) =>
      new Set(data.history.map((meeting) => meeting.id)).size ===
      data.history.length,
    'Встречи повторяются',
  );
export type Workspace = z.infer<typeof workspaceSchema>;
export type Meeting = z.infer<typeof meetingSchema>;
export type Cost = z.infer<typeof costSchema>;
export type LocalInfo = {
  date: string;
  time: string;
  minute: number;
  weekday: number;
  offset: string;
};
export type Occurrence = { startUtc: string; endUtc: string; costs: Cost[] };
export type Candidate = {
  startUtc: string;
  endUtc: string;
  score: number;
  baseScore: number;
  fairnessPenalty: number;
  occurrences: Occurrence[];
  convenient: number;
};

export function today(zone = 'Europe/Moscow') {
  return Temporal.Now.zonedDateTimeISO(zone).toPlainDate().toString();
}
export function addDays(date: string, days: number) {
  return Temporal.PlainDate.from(date).add({ days }).toString();
}
export function minuteOf(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}
export function clock(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}
export function localInfo(ms: number, zone: string): LocalInfo {
  const zoned =
    Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO(zone);
  return {
    date: zoned.toPlainDate().toString(),
    time: clock(zoned.hour * 60 + zoned.minute),
    minute: zoned.hour * 60 + zoned.minute,
    weekday: zoned.dayOfWeek,
    offset: zoned.offset,
  };
}
export function localRange(startUtc: string, endUtc: string, zone: string) {
  const start = localInfo(Date.parse(startUtc), zone);
  const end = localInfo(Date.parse(endUtc), zone);
  return {
    start,
    end,
    label: `${start.time}–${end.time}${end.date !== start.date ? ' (+1 день)' : ''}`,
  };
}
export function isWorking(person: Participant, local: LocalInfo) {
  if (person.blockedDates.includes(local.date)) return false;
  const start = minuteOf(person.workStart);
  const end = minuteOf(person.workEnd);
  if (start < end)
    return (
      person.days.includes(local.weekday) &&
      local.minute >= start &&
      local.minute < end
    );
  const anchorDay =
    local.minute < end ? ((local.weekday + 5) % 7) + 1 : local.weekday;
  return (
    person.days.includes(anchorDay) &&
    (local.minute >= start || local.minute < end)
  );
}
type Context = { locals: Map<string, LocalInfo>; burden: Map<string, number> };
function context(data: Workspace): Context {
  const burden = new Map<string, number>();
  for (const meeting of data.history)
    for (const cost of meeting.costs)
      burden.set(cost.id, (burden.get(cost.id) ?? 0) + cost.penalty / 100);
  return { locals: new Map(), burden };
}
function cachedLocal(ctx: Context, ms: number, zone: string) {
  const key = `${zone}|${ms}`;
  if (!ctx.locals.has(key)) ctx.locals.set(key, localInfo(ms, zone));
  return ctx.locals.get(key)!;
}
function occurrence(
  data: Workspace,
  startMs: number,
  ctx: Context,
): Occurrence | null {
  const endMs = startMs + data.settings.duration * 60_000;
  if (
    data.history.some(
      (meeting) =>
        Date.parse(meeting.startUtc) < endMs &&
        Date.parse(meeting.endUtc) > startMs &&
        meeting.costs.some((cost) =>
          data.participants.some((person) => person.id === cost.id),
        ),
    )
  )
    return null;
  const costs: Cost[] = [];
  for (const person of data.participants) {
    let outsideMinutes = 0;
    let nightMinutes = 0;
    for (let ms = startMs; ms < endMs; ms += 15 * 60_000) {
      const local = cachedLocal(ctx, ms, person.timeZone);
      if (person.blockedDates.includes(local.date)) return null;
      const working = isWorking(person, local);
      if (!working) outsideMinutes += 15;
      if (!working && (local.minute < 7 * 60 || local.minute >= 22 * 60))
        nightMinutes += 15;
    }
    if (person.strict && outsideMinutes > 0) return null;
    costs.push({
      id: person.id,
      name: person.name,
      timeZone: person.timeZone,
      outsideMinutes,
      nightMinutes,
      penalty:
        (100 * outsideMinutes) / data.settings.duration +
        (50 * nightMinutes) / data.settings.duration,
    });
  }
  return {
    startUtc: new Date(startMs).toISOString(),
    endUtc: new Date(endMs).toISOString(),
    costs,
  };
}

function buildCandidate(
  data: Workspace,
  startMs: number,
  mode: Settings['mode'],
  ctx: Context,
): Candidate | null {
  const count = mode === 'single' ? 1 : data.settings.occurrences;
  const first = cachedLocal(ctx, startMs, data.settings.organizerZone);
  const burden = new Map(ctx.burden);
  const occurrences: Occurrence[] = [];
  let base = 0;
  let extra = 0;
  for (let index = 0; index < count; index++) {
    let nextMs = startMs;
    if (index > 0) {
      try {
        // Weekly series preserves organizer wall time. Reject ambiguous/skipped future starts.
        nextMs = Temporal.PlainDateTime.from(
          `${addDays(first.date, 7 * index)}T${first.time}`,
        ).toZonedDateTime(data.settings.organizerZone, {
          disambiguation: 'reject',
        }).epochMilliseconds;
      } catch {
        return null;
      }
    }
    const slot = occurrence(data, nextMs, ctx);
    if (!slot) return null;
    // Every actual quarter-hour must stay inside the organizer's requested date/window.
    for (let ms = nextMs; ms < Date.parse(slot.endUtc); ms += 15 * 60_000) {
      const local = cachedLocal(ctx, ms, data.settings.organizerZone);
      if (
        local.date !== addDays(first.date, 7 * index) ||
        local.minute < minuteOf(data.settings.searchStart) ||
        local.minute >= minuteOf(data.settings.searchEnd)
      )
        return null;
    }
    for (const cost of slot.costs) {
      base += cost.penalty;
      if (data.settings.fairness)
        extra += cost.penalty * Math.min(burden.get(cost.id) ?? 0, 10) * 0.25;
      burden.set(cost.id, (burden.get(cost.id) ?? 0) + cost.penalty / 100);
    }
    occurrences.push(slot);
  }
  const denominator = data.participants.length * count;
  const baseScore = base / denominator;
  const fairnessPenalty = extra / denominator;
  return {
    startUtc: occurrences[0].startUtc,
    endUtc: occurrences[0].endUtc,
    occurrences,
    baseScore,
    fairnessPenalty,
    score: baseScore + fairnessPenalty,
    convenient: occurrences[0].costs.filter(
      (cost) => cost.outsideMinutes === 0 && cost.nightMinutes === 0,
    ).length,
  };
}
export function compareCandidate(
  data: Workspace,
  startUtc: string,
  mode: Settings['mode'],
) {
  return buildCandidate(data, Date.parse(startUtc), mode, context(data));
}
export function generateCandidates(
  data: Workspace,
  nowMs = Date.now(),
): Candidate[] {
  const ctx = context(data);
  const results: Candidate[] = [];
  for (let day = 0; day < data.settings.days; day++) {
    const date = Temporal.PlainDate.from(addDays(data.settings.startDate, day));
    const start = date.toZonedDateTime(
      data.settings.organizerZone,
    ).epochMilliseconds;
    const end = date
      .add({ days: 1 })
      .toZonedDateTime(data.settings.organizerZone).epochMilliseconds;
    for (let ms = start; ms < end; ms += 30 * 60_000) {
      if (data.settings.excludePast && ms < nowMs) continue;
      const local = cachedLocal(ctx, ms, data.settings.organizerZone);
      if (
        local.date !== date.toString() ||
        local.minute < minuteOf(data.settings.searchStart) ||
        local.minute >= minuteOf(data.settings.searchEnd)
      )
        continue;
      const candidate = buildCandidate(data, ms, data.settings.mode, ctx);
      if (candidate) results.push(candidate);
    }
  }
  return results.sort(
    (a, b) => a.score - b.score || a.startUtc.localeCompare(b.startUtc),
  );
}

export function saveCandidate(
  data: Workspace,
  candidate: Candidate,
): Workspace {
  if (data.settings.excludePast && Date.parse(candidate.startUtc) < Date.now())
    throw new Error('Выбранное время уже прошло. Обновите подбор.');
  // Recompute against the latest team/history instead of trusting stale UI scores.
  const fresh = compareCandidate(data, candidate.startUtc, data.settings.mode);
  if (!fresh)
    throw new Error('Этот вариант больше недоступен. Обновите подбор.');
  const history: Meeting[] = fresh.occurrences.map((item) => ({
    ...item,
    id: `${data.id}.${Date.parse(item.startUtc)}@quietslot.local`,
    title: data.settings.title,
    demo: data.demo,
  }));
  const parsed = workspaceSchema.safeParse({
    ...data,
    history: [...data.history, ...history],
  });
  if (!parsed.success)
    throw new Error(
      'Не удалось сохранить: максимум 100 встреч в истории. Удалите ненужные записи.',
    );
  return parsed.data;
}

export function demoWorkspace(pacific = false, date = today()): Workspace {
  const id = (number: number) =>
    `20000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
  const names = pacific
    ? [
        ['Кай', 'America/Los_Angeles'],
        ['Юки', 'Asia/Tokyo'],
        ['Лео', 'Australia/Sydney'],
      ]
    : [
        ['Аня', 'Europe/Moscow'],
        ['Ли', 'Europe/London'],
        ['Алекс', 'America/New_York'],
      ];
  const data: Workspace = {
    version: 1,
    id: id(pacific ? 20 : 10),
    demo: true,
    participants: names.map(([name, timeZone], index) => ({
      id: id(index + 1),
      name,
      timeZone,
      workStart: '09:00',
      workEnd: '18:00',
      days: [1, 2, 3, 4, 5],
      blockedDates: [],
      strict: false,
    })),
    settings: {
      title: 'Еженедельная синхронизация',
      startDate: date,
      days: 5,
      organizerZone: pacific ? 'Asia/Tokyo' : 'Europe/Moscow',
      duration: 60,
      searchStart: '09:00',
      searchEnd: '20:00',
      mode: 'single',
      occurrences: 3,
      fairness: true,
      excludePast: true,
    },
    history: [],
  };
  if (!pacific) {
    for (const daysAgo of [7, 14]) {
      const ms = Temporal.PlainDateTime.from(
        `${addDays(date, -daysAgo)}T19:00`,
      ).toZonedDateTime('Europe/Moscow').epochMilliseconds;
      const slot = occurrence(data, ms, context(data))!;
      data.history.push({
        ...slot,
        id: `${data.id}.${ms}@quietslot.local`,
        title: 'Демо: предыдущая синхронизация',
        demo: true,
      });
    }
  }
  return workspaceSchema.parse(data);
}

function escapeICS(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}
function icsTime(value: string) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}
function foldLine(line: string) {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = '';
  let bytes = 0;
  for (const character of line) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) {
      lines.push(current);
      current = ' ';
      bytes = 1;
    }
    current += character;
    bytes += length;
  }
  return [...lines, current].join('\r\n');
}
export function exportICS(
  data: Workspace,
  candidate: Candidate,
  stamp = new Date().toISOString(),
) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//QuietSlot//Local MVP//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const slot of candidate.occurrences) {
    const details = slot.costs
      .map(
        (cost) =>
          `${cost.name}: ${localRange(slot.startUtc, slot.endUtc, cost.timeZone).start.date} ${localRange(slot.startUtc, slot.endUtc, cost.timeZone).label} (${cost.timeZone}), вне окна ${cost.outsideMinutes} мин.`,
      )
      .join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${data.id}.${Date.parse(slot.startUtc)}@quietslot.local`,
      `DTSTAMP:${icsTime(stamp)}`,
      `DTSTART:${icsTime(slot.startUtc)}`,
      `DTEND:${icsTime(slot.endUtc)}`,
      `SUMMARY:${escapeICS(data.settings.title)}`,
      `DESCRIPTION:${escapeICS(details)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
