import { addDays } from './dates';

const compact = (d: string) => d.replaceAll('-', '');

function esc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function buildIcs(opts: {
  uid: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  url?: string;
}): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ultra terminy//CS',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${opts.uid}@ultra-terminy`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(opts.start)}`,
    `DTEND;VALUE=DATE:${compact(addDays(opts.end, 1))}`,
    `SUMMARY:${esc(opts.title)}`,
    opts.description ? `DESCRIPTION:${esc(opts.description)}` : '',
    opts.url ? `URL:${opts.url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n') + '\r\n';
}

export function googleCalendarUrl(opts: { title: string; start: string; end: string; details?: string }) {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${compact(opts.start)}/${compact(addDays(opts.end, 1))}`,
    details: opts.details ?? '',
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
