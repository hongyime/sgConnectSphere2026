const singaporeDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Singapore',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function singaporeCalendarParts(date: Date) {
  const values = Object.fromEntries(
    singaporeDateFormatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function dateKey({ year, month, day }: { year: number; month: number; day: number }) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function singaporeDateKey(date: Date) {
  return dateKey(singaporeCalendarParts(date));
}

export function twoCalendarYearsFromSingaporeDate(date: Date) {
  const { year, month, day } = singaporeCalendarParts(date);
  const targetYear = year + 2;
  const lastDayOfMonth = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  return dateKey({ year: targetYear, month, day: Math.min(day, lastDayOfMonth) });
}

export function isAfterSingaporeDate(date: Date, boundary: string) {
  return singaporeDateKey(date) > boundary;
}
