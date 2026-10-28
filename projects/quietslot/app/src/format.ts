export const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export function shortDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('ru', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
export function scoreText(value: number) {
  return Number(value.toFixed(1)).toString();
}
