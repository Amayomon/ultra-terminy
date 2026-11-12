// Všechny datumy jsou řetězce "YYYY-MM-DD" a počítají se v UTC, aby nevznikaly posuny o den.

export const MONTHS_CS = [
  'leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec',
];
export const MONTHS_CS_GEN = [
  'ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince',
];
export const WEEKDAYS_CS = ['po', 'út', 'st', 'čt', 'pá', 'so', 'ne'];
const WEEKDAYS_LONG = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];

const pad = (n: number) => String(n).padStart(2, '0');

export function iso(y: number, m: number, d: number): string {
  // m je 0–11
  const dt = new Date(Date.UTC(y, m, d));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function parse(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(day: string, n: number): string {
  const dt = parse(day);
  return iso(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() + n);
}

export function todayISO(): string {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Seznam měsíců {year, month(0–11)} od startMonth ("YYYY-MM-01") */
export function monthList(startMonth: string, count: number) {
  const s = parse(startMonth);
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + i, 1));
    return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() };
  });
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Všechny dny v rozsahu akce, seřazené */
export function eventDays(startMonth: string, count: number): string[] {
  const out: string[] = [];
  for (const { year, month } of monthList(startMonth, count)) {
    const n = daysInMonth(year, month);
    for (let d = 1; d <= n; d++) out.push(iso(year, month, d));
  }
  return out;
}

/** 0 = pondělí … 6 = neděle */
export function weekdayMon(day: string): number {
  return (parse(day).getUTCDay() + 6) % 7;
}

export function isWeekend(day: string): boolean {
  return weekdayMon(day) >= 5;
}

export function firstOfMonth(year: number, month: number): string {
  return iso(year, month, 1);
}

export function formatDay(day: string, withWeekday = true): string {
  const dt = parse(day);
  const base = `${dt.getUTCDate()}. ${MONTHS_CS_GEN[dt.getUTCMonth()]}`;
  return withWeekday ? `${WEEKDAYS_LONG[dt.getUTCDay()]} ${base}` : base;
}

export function formatRange(start: string, end: string): string {
  if (start === end) return formatDay(start);
  return `${formatDay(start)} – ${formatDay(end)}`;
}

// ---------- České státní svátky ----------

function easterSunday(year: number): { m: number; d: number } {
  // Anonymní gregoriánský algoritmus
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 nebo 4
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { m: month - 1, d: day };
}

const cache = new Map<number, Map<string, string>>();

export function czechHolidays(year: number): Map<string, string> {
  const hit = cache.get(year);
  if (hit) return hit;
  const map = new Map<string, string>();
  const fixed: [number, number, string][] = [
    [0, 1, 'Nový rok / Den obnovy samostatného českého státu'],
    [4, 1, 'Svátek práce'],
    [4, 8, 'Den vítězství'],
    [6, 5, 'Cyril a Metoděj'],
    [6, 6, 'Upálení mistra Jana Husa'],
    [8, 28, 'Den české státnosti'],
    [9, 28, 'Vznik samostatného československého státu'],
    [10, 17, 'Den boje za svobodu a demokracii'],
    [11, 24, 'Štědrý den'],
    [11, 25, '1. svátek vánoční'],
    [11, 26, '2. svátek vánoční'],
  ];
  for (const [m, d, name] of fixed) map.set(iso(year, m, d), name);
  const e = easterSunday(year);
  map.set(iso(year, e.m, e.d - 2), 'Velký pátek');
  map.set(iso(year, e.m, e.d + 1), 'Velikonoční pondělí');
  cache.set(year, map);
  return map;
}

export function holidayName(day: string): string | undefined {
  return czechHolidays(Number(day.slice(0, 4))).get(day);
}

export function isFreeDay(day: string): boolean {
  return isWeekend(day) || holidayName(day) !== undefined;
}

export function daysWord(n: number): string {
  return n === 1 ? 'den' : n < 5 ? 'dny' : 'dní';
}

export function peopleWord(n: number): string {
  return n === 1 ? 'člověk' : n >= 2 && n <= 4 ? 'lidé' : 'lidí';
}
