'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase/client';
import { useRequireUser } from '@/components/useUser';
import { EventRangeFields, monthOptions } from '@/components/MonthPicker';
import { daysWord, formatRange, MONTHS_CS, parse } from '@/lib/dates';
import type { EventRow } from '@/lib/types';

function rangeLabel(e: EventRow) {
  const s = parse(e.start_month);
  const end = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + e.month_count - 1, 1));
  const a = `${MONTHS_CS[s.getUTCMonth()]}`;
  const b = `${MONTHS_CS[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
  return e.month_count === 1 ? b : `${a} – ${b}`;
}

export default function Home() {
  const user = useRequireUser();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [title, setTitle] = useState('');
  const [startMonth, setStartMonth] = useState(() => monthOptions(2)[1].value);
  const [monthCount, setMonthCount] = useState(3);
  const [multiDay, setMultiDay] = useState(false);
  const [minDays, setMinDays] = useState(2);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user) return;
    sb().from('events').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setEvents((data as EventRow[]) ?? []));
  }, [user]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setErr('');
    const { data, error } = await sb().from('events').insert({
      title: title.trim(),
      owner_id: user.id,
      start_month: startMonth,
      month_count: monthCount,
      min_days: multiDay ? minDays : 1,
    }).select('id').single();
    setBusy(false);
    if (error || !data) setErr('Akci se nepodařilo založit.');
    else window.location.href = `/e/${data.id}`;
  }

  if (!user || events === null) return <p className="empty">Načítám…</p>;

  return (
    <>
      <div className="spread" style={{ margin: '8px 0 14px' }}>
        <h1 style={{ margin: 0 }}>Moje akce</h1>
        {!showNew && <button className="primary" onClick={() => setShowNew(true)}>+ Nová akce</button>}
      </div>

      {showNew && (
        <form className="card" onSubmit={create}>
          <h2>Nová akce</h2>
          <div className="field">
            <label>Název</label>
            <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Např. Jarní ultra 2027" autoFocus />
          </div>
          <EventRangeFields {...{ startMonth, setStartMonth, monthCount, setMonthCount, multiDay, setMultiDay, minDays, setMinDays }} />
          <div className="row" style={{ marginTop: 14 }}>
            <button className="primary" disabled={busy || !title.trim()}>{busy ? 'Zakládám…' : 'Založit'}</button>
            <button type="button" className="ghost" onClick={() => setShowNew(false)}>Zrušit</button>
          </div>
          {err && <p className="danger small">{err}</p>}
        </form>
      )}

      {events.length === 0 && !showNew && (
        <div className="card empty">
          <p>Zatím tu nic není.</p>
          <p className="small">Založ akci a pošli kamarádům odkaz, nebo otevři pozvánku, kterou ti někdo poslal.</p>
        </div>
      )}

      {events.map((e) => (
        <Link key={e.id} href={`/e/${e.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div className="spread">
            <h2 style={{ margin: 0 }}>{e.title}</h2>
            {e.confirmed_start
              ? <span className="badge">Potvrzeno</span>
              : <span className="badge grey">Hledá se termín</span>}
          </div>
          <p className="muted small" style={{ margin: '6px 0 0' }}>
            {e.confirmed_start && e.confirmed_end
              ? formatRange(e.confirmed_start, e.confirmed_end)
              : `${rangeLabel(e)}${e.min_days > 1 ? ` · ${e.min_days} ${daysWord(e.min_days)} v kuse` : ''}`}
          </p>
        </Link>
      ))}
    </>
  );
}
