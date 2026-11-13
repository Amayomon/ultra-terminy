'use client';
import { useMemo, useState } from 'react';
import { sb } from '@/lib/supabase/client';
import { daysWord, eventDays, formatDay, formatRange, holidayName, todayISO } from '@/lib/dates';
import { buildLookup, dayStats, rankCandidates, type Candidate } from '@/lib/scoring';
import { notify } from '@/lib/notify';
import { Calendar } from '../Calendar';
import { ExportButton } from './ExportButton';
import type { Ctx } from './types';

export function Results({ ctx }: { ctx: Ctx }) {
  const { data, isOwner, name, toast, reload } = ctx;
  const ev = data.event;
  const today = todayISO();
  const members = data.members.map((m) => m.user_id);
  const [length, setLength] = useState(ev.min_days);
  const [sel, setSel] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => eventDays(ev.start_month, ev.month_count), [ev.start_month, ev.month_count]);
  const lookup = useMemo(() => buildLookup(data.avail), [data.avail]);
  const candidates = useMemo(
    () => rankCandidates(days, members, data.avail, length, today).filter((c) => c.can.length + c.maybe.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, data.avail, data.members, length, today],
  );
  const unfilled = data.members.filter((m) => !m.filled_at);
  const n = members.length;
  const visible = showAll ? candidates.slice(0, 30) : candidates.slice(0, 6);

  async function confirm(c: Candidate) {
    setBusy(true);
    const { error } = await sb().from('events').update({ confirmed_start: c.start, confirmed_end: c.end }).eq('id', ev.id);
    setBusy(false);
    if (error) return toast('Potvrzení se nepovedlo.');
    toast('Termín potvrzen 🎉');
    await reload();
    const r = await notify('confirmed', ev.id);
    if (r.ok && r.sent) toast(`Termín potvrzen, e-mail šel ${r.sent} lidem.`);
  }

  async function remind() {
    setBusy(true);
    const r = await notify('remind', ev.id);
    setBusy(false);
    if (r.skipped) toast('E-mailové notifikace nejsou nastavené (viz README).');
    else if (r.ok) toast(`Připomínka odeslána (${r.sent ?? 0}).`);
    else toast('Odeslání se nepovedlo.');
  }

  const selDetail = sel ? data.members.map((m) => {
    const row = lookup.get(m.user_id)?.get(sel);
    return { id: m.user_id, status: row?.status ?? 0, note: row?.note ?? '' };
  }).sort((a, b) => b.status - a.status) : [];

  return (
    <>
      {unfilled.length > 0 && (
        <div className="card">
          <div className="spread">
            <div>
              <strong>Ještě nevyplnili ({unfilled.length}/{n}):</strong>{' '}
              <span className="muted">{unfilled.map((m) => name(m.user_id)).join(', ')}</span>
            </div>
            {isOwner && <button onClick={remind} disabled={busy}>Připomenout e-mailem</button>}
          </div>
        </div>
      )}

      <div className="card">
        <div className="spread" style={{ marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>Nejlepší termíny</h2>
          <div className="row">
            <label className="small" style={{ margin: 0 }}>Dní v kuse</label>
            <select value={length} onChange={(e) => setLength(Number(e.target.value))} style={{ width: 'auto', padding: '6px 10px' }}>
              {[1, 2, 3, 4, 5, 6, 7].map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>
        {candidates.length === 0 ? (
          <p className="empty">Zatím nikdo nic nevyplnil.</p>
        ) : (
          <div>
            {visible.map((c) => {
              const okCount = c.can.length + c.maybe.length;
              const isConfirmed = ev.confirmed_start === c.start && ev.confirmed_end === c.end;
              return (
                <div className="cand" key={c.start}>
                  <div className="when">
                    <div className="row" style={{ gap: 6 }}>
                      <strong>{formatRange(c.start, c.end)}</strong>
                      {c.full ? <span className="badge">Můžou všichni</span>
                        : c.ok ? <span className="badge maybe">Všichni, někdo „šlo by to“</span>
                          : <span className="badge grey">{okCount}/{n}</span>}
                      {length === 1 && holidayName(c.start) && <span className="small muted">{holidayName(c.start)}</span>}
                    </div>
                    <div className="bar">
                      <div className="b2" style={{ width: `${(c.can.length / n) * 100}%` }} />
                      <div className="b1" style={{ width: `${(c.maybe.length / n) * 100}%` }} />
                    </div>
                    <div className="small muted" style={{ marginTop: 4 }}>
                      {c.maybe.length > 0 && <>šlo by to: {c.maybe.map(name).join(', ')}. </>}
                      {c.no.length > 0 && <>nemůže: {c.no.map(name).join(', ')}</>}
                    </div>
                  </div>
                  <ExportButton eventId={ev.id} title={ev.title} start={c.start} end={c.end}
                    confirmed={isConfirmed} description={ev.description} />
                  {isOwner && !isConfirmed && (
                    <button onClick={() => confirm(c)} disabled={busy}>Potvrdit</button>
                  )}
                  {isConfirmed && <span className="badge">Potvrzeno</span>}
                </div>
              );
            })}
            {candidates.length > 6 && (
              <button className="ghost small" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Méně' : `Zobrazit další (${Math.min(candidates.length, 30) - 6})`}
              </button>
            )}
          </div>
        )}
        {length > 1 && (
          <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
            U {length}denních oken platí nejhorší den: kdo nemůže aspoň jeden den, nemůže celé okno.
          </p>
        )}
      </div>

      <div className="card">
        <h2>Přehled všech</h2>
        <p className="muted small">Číslo = kolik z {n} může (vč. „šlo by to“). Klikni na den pro detail.</p>

        {sel && (
          <div className="card" style={{ background: '#faf9f5' }}>
            <div className="spread">
              <strong>{formatDay(sel)}</strong>
              <div className="row">
                <ExportButton eventId={ev.id} title={ev.title} start={sel} end={sel}
                  confirmed={ev.confirmed_start === sel && ev.confirmed_end === sel} description={ev.description} />
                {isOwner && ev.min_days <= 1 && (
                  <button onClick={() => {
                    const s = dayStats(sel, members, lookup);
                    confirm({ start: sel, end: sel, can: [], maybe: [], no: [], full: s.can === n, ok: s.no === 0 });
                  }} disabled={busy}>Potvrdit tento den</button>
                )}
                <button className="ghost small" onClick={() => setSel(null)}>Zavřít</button>
              </div>
            </div>
            <ul className="people-list" style={{ marginTop: 6 }}>
              {selDetail.map((p) => (
                <li key={p.id}>
                  <span>
                    <span className="dot" style={{ background: p.status === 2 ? 'var(--can)' : p.status === 1 ? 'var(--maybe)' : 'var(--no)', border: '1px solid var(--line)' }} />
                    {name(p.id)}
                  </span>
                  <span className="small muted">{p.note || (p.status === 2 ? 'můžu' : p.status === 1 ? 'šlo by to' : 'nemůžu')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Calendar
          startMonth={ev.start_month}
          monthCount={ev.month_count}
          onDay={(d) => setSel(d === sel ? null : d)}
          render={(day) => {
            const s = dayStats(day, members, lookup);
            const ok = s.can + s.maybe;
            const past = day < today;
            const inConfirmed = !!ev.confirmed_start && !!ev.confirmed_end && day >= ev.confirmed_start && day <= ev.confirmed_end;
            let cls = '';
            let style: string | undefined;
            if (n > 0 && s.can === n) cls = 's2';
            else if (n > 0 && s.no === 0) cls = 's1';
            else style = ok > 0 ? `p${Math.min(4, Math.ceil((ok / n) * 4))}` : '';
            return {
              className: [cls, style ?? '', past ? 'past' : '', sel === day ? 'sel' : '', inConfirmed ? 'confirmed' : ''].join(' '),
              sub: ok > 0 ? `${ok}/${n}` : undefined,
              disabled: past,
            };
          }}
        />
        {ev.min_days > 1 && (
          <p className="muted small" style={{ margin: 0 }}>Akce je na {ev.min_days} {daysWord(ev.min_days)} – termín potvrď v seznamu nahoře.</p>
        )}
      </div>
    </>
  );
}
