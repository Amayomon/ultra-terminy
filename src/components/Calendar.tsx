'use client';
import { MONTHS_CS, WEEKDAYS_CS, daysInMonth, holidayName, iso, isWeekend, monthList, weekdayMon } from '@/lib/dates';

export type DayRender = {
  className?: string;
  sub?: React.ReactNode;
  title?: string;
  disabled?: boolean;
};

export function Calendar(props: {
  startMonth: string;
  monthCount: number;
  render: (day: string) => DayRender;
  onDay?: (day: string) => void;
}) {
  return (
    <div>
      {monthList(props.startMonth, props.monthCount).map(({ year, month }) => {
        const first = iso(year, month, 1);
        const offset = weekdayMon(first);
        const n = daysInMonth(year, month);
        return (
          <section className="month" key={first}>
            <h3>{MONTHS_CS[month]} {year}</h3>
            <div className="cal">
              {WEEKDAYS_CS.map((w) => <div className="wd" key={w}>{w}</div>)}
              {Array.from({ length: offset }, (_, i) => <div className="blank" key={`b${i}`} />)}
              {Array.from({ length: n }, (_, i) => {
                const day = iso(year, month, i + 1);
                const r = props.render(day);
                const hol = holidayName(day);
                const cls = [
                  'day',
                  isWeekend(day) || hol ? 'free' : '',
                  hol ? 'holiday' : '',
                  r.className ?? '',
                ].join(' ');
                return (
                  <button
                    key={day}
                    type="button"
                    className={cls}
                    title={[hol, r.title].filter(Boolean).join(' · ') || undefined}
                    disabled={r.disabled}
                    onClick={() => props.onDay?.(day)}
                  >
                    <span className="num">{i + 1}</span>
                    {r.sub !== undefined && <span className="sub">{r.sub}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function Legend({ extra }: { extra?: React.ReactNode }) {
  return (
    <div className="legend">
      <span><i style={{ background: 'var(--can)' }} />můžu</span>
      <span><i style={{ background: 'var(--maybe)' }} />šlo by to</span>
      <span><i style={{ background: 'var(--no)', border: '1px solid var(--line)' }} />nemůžu</span>
      <span><i style={{ background: 'var(--danger)', borderRadius: '50%', width: 8, height: 8 }} />svátek</span>
      {extra}
    </div>
  );
}
