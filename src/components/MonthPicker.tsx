'use client';
import { MONTHS_CS, firstOfMonth, daysWord } from '@/lib/dates';

export function monthOptions(count = 18, includeValue?: string) {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push({ value: firstOfMonth(d.getFullYear(), d.getMonth()), label: `${MONTHS_CS[d.getMonth()]} ${d.getFullYear()}` });
  }
  if (includeValue && !opts.some((o) => o.value === includeValue)) {
    const [y, m] = includeValue.split('-').map(Number);
    opts.unshift({ value: includeValue, label: `${MONTHS_CS[m - 1]} ${y}` });
  }
  return opts;
}

export function EventRangeFields(props: {
  startMonth: string; setStartMonth: (v: string) => void;
  monthCount: number; setMonthCount: (v: number) => void;
  multiDay: boolean; setMultiDay: (v: boolean) => void;
  minDays: number; setMinDays: (v: number) => void;
}) {
  return (
    <>
      <div className="grid2 field">
        <div>
          <label>Od měsíce</label>
          <select value={props.startMonth} onChange={(e) => props.setStartMonth(e.target.value)}>
            {monthOptions(18, props.startMonth).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label>Kolik měsíců</label>
          <select value={props.monthCount} onChange={(e) => props.setMonthCount(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label className="row" style={{ color: 'var(--ink)', fontSize: '1rem' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={props.multiDay}
            onChange={(e) => { props.setMultiDay(e.target.checked); if (e.target.checked && props.minDays < 2) props.setMinDays(2); }} />
          Vícedenní akce (hledat víc dní v kuse)
        </label>
        {props.multiDay && (
          <div style={{ marginTop: 8, maxWidth: 200 }}>
            <label>Počet dní v kuse</label>
            <select value={props.minDays} onChange={(e) => props.setMinDays(Number(e.target.value))}>
              {[2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} {daysWord(n)}</option>)}
            </select>
          </div>
        )}
      </div>
    </>
  );
}
