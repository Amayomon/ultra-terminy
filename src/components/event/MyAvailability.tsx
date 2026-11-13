'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sb } from '@/lib/supabase/client';
import { eventDays, formatDay, holidayName, isFreeDay, todayISO } from '@/lib/dates';
import type { Status } from '@/lib/scoring';
import { notify } from '@/lib/notify';
import { Calendar, Legend } from '../Calendar';
import type { Ctx } from './types';

type Cell = { status: Status; note: string };
const NEXT: Record<Status, Status> = { 0: 2, 2: 1, 1: 0 };
const LABEL: Record<Status, string> = { 2: 'můžu', 1: 'šlo by to', 0: 'nemůžu' };

export function MyAvailability({ ctx }: { ctx: Ctx }) {
  const { data, me, toast, reload } = ctx;
  const ev = data.event;
  const today = todayISO();

  const initial = useMemo(() => {
    const m = new Map<string, Cell>();
    for (const r of data.avail) if (r.user_id === me) m.set(r.day, { status: r.status, note: r.note });
    return m;
  }, [data.avail, me]);

  const [cells, setCells] = useState(initial);
  const [noteMode, setNoteMode] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const notifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [otherEvents, setOtherEvents] = useState<{ id: string; title: string }[]>([]);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyFrom, setCopyFrom] = useState('');
  const [copyBusy, setCopyBusy] = useState(false);

  useEffect(() => {
    sb().from('events').select('id,title').neq('id', ev.id).order('created_at', { ascending: false })
      .then(({ data: rows }) => {
        const list = (rows ?? []) as { id: string; title: string }[];
        setOtherEvents(list);
        if (list[0]) setCopyFrom(list[0].id);
      });
  }, [ev.id]);

  useEffect(() => setCells(initial), [initial]);
  useEffect(() => () => { if (notifyTimer.current) clearTimeout(notifyTimer.current); }, []);

  function scheduleNotify() {
    if (notifyTimer.current) clearTimeout(notifyTimer.current);
    notifyTimer.current = setTimeout(() => { notify('check', ev.id); }, 5000);
  }

  async function save(day: string, cell: Cell) {
    const prev = cells.get(day);
    const next = new Map(cells);
    const empty = cell.status === 0 && !cell.note.trim();
    if (empty) next.delete(day); else next.set(day, cell);
    setCells(next);

    const q = empty
      ? sb().from('availability').delete().match({ event_id: ev.id, user_id: me, day })
      : sb().from('availability').upsert({ event_id: ev.id, user_id: me, day, status: cell.status, note: cell.note.trim() });
    const { error } = await q;
    if (error) {
      const back = new Map(next);
      if (prev) back.set(day, prev); else back.delete(day);
      setCells(back);
      toast('Uložení se nepovedlo, zkus to znovu.');
    } else scheduleNotify();
  }

  function onDay(day: string) {
    if (day < today) return;
    const cur = cells.get(day) ?? { status: 0 as Status, note: '' };
    if (noteMode) {
      setSel(day);
      setNoteDraft(cur.note);
      return;
    }
    save(day, { ...cur, status: NEXT[cur.status] });
  }

  async function prefillFree() {
    const days = eventDays(ev.start_month, ev.month_count).filter((d) => d >= today && isFreeDay(d) && !cells.has(d));
    if (days.length === 0) return toast('Všechny víkendy a svátky už máš vyplněné.');
    const rows = days.map((day) => ({ event_id: ev.id, user_id: me, day, status: 2 as Status, note: '' }));
    const { error } = await sb().from('availability').upsert(rows);
    if (error) return toast('Nepovedlo se.');
    const next = new Map(cells);
    days.forEach((d) => next.set(d, { status: 2, note: '' }));
    setCells(next);
    toast(`Označeno ${days.length} volných dní jako „můžu“. Ty, kdy nemůžeš, odklikej.`);
    scheduleNotify();
  }

  async function clearAll() {
    const { error } = await sb().from('availability').delete().match({ event_id: ev.id, user_id: me });
    setConfirmClear(false);
    if (error) return toast('Nepovedlo se.');
    setCells(new Map());
    reload();
  }

  async function copyFromEvent() {
    if (!copyFrom) return;
    setCopyBusy(true);
    const { data: src, error } = await sb().from('availability').select('day,status,note')
      .match({ event_id: copyFrom, user_id: me });
    if (error) { setCopyBusy(false); return toast('Načtení se nepovedlo.'); }
    const inRange = new Set(eventDays(ev.start_month, ev.month_count));
    // přebírají se jen dny, které tu ještě nemáš vyplněné – tvoje volby v téhle akci mají přednost
    const rows = ((src ?? []) as { day: string; status: Status; note: string }[])
      .filter((r) => inRange.has(r.day) && r.day >= today && !cells.has(r.day))
      .map((r) => ({ event_id: ev.id, user_id: me, day: r.day, status: r.status, note: r.note }));
    if (rows.length === 0) {
      setCopyBusy(false);
      return toast('Není co převzít – v té akci nemáš vyplněné žádné dny z tohohle období, které by tu chyběly.');
    }
    const { error: upErr } = await sb().from('availability').upsert(rows);
    setCopyBusy(false);
    if (upErr) return toast('Převzetí se nepovedlo.');
    const next = new Map(cells);
    rows.forEach((r) => next.set(r.day, { status: r.status, note: r.note }));
    setCells(next);
    setCopyOpen(false);
    toast(`Převzato ${rows.length} ${rows.length === 1 ? 'den' : rows.length < 5 ? 'dny' : 'dní'}. Zkontroluj je a případně uprav.`);
    scheduleNotify();
  }

  const counts = { 2: 0, 1: 0 } as Record<1 | 2, number>;
  for (const c of cells.values()) if (c.status > 0) counts[c.status as 1 | 2]++;

  const selCell = sel ? cells.get(sel) ?? { status: 0 as Status, note: '' } : null;

  return (
    <>
      <div className="card">
        <div className="spread" style={{ marginBottom: 10 }}>
          <div>
            <h2 style={{ margin: 0 }}>Kdy můžeš?</h2>
            <p className="muted small" style={{ margin: 0 }}>
              {noteMode ? 'Klikni na den a napiš k němu poznámku.' : 'Klikáním na den přepínáš: nemůžu → můžu → šlo by to.'}
            </p>
          </div>
          <button className={`chip ${noteMode ? 'on' : ''}`} onClick={() => { setNoteMode(!noteMode); setSel(null); }}>
            ✎ Poznámky
          </button>
        </div>
        <Legend />
        <div className="row" style={{ margin: '12px 0' }}>
          <button onClick={prefillFree}>Víkendy a svátky → můžu</button>
          {otherEvents.length > 0 && !copyOpen && (
            <button onClick={() => setCopyOpen(true)}>Převzít dny z jiné akce</button>
          )}
          {confirmClear ? (
            <>
              <button className="danger" onClick={clearAll}>Opravdu vymazat</button>
              <button className="ghost" onClick={() => setConfirmClear(false)}>Ne</button>
            </>
          ) : (
            <button className="ghost danger" onClick={() => setConfirmClear(true)}>Vymazat vše</button>
          )}
        </div>

        {copyOpen && (
          <div className="card" style={{ background: '#faf9f5' }}>
            <div className="spread">
              <strong>Převzít dny z jiné akce</strong>
              <button className="ghost small" onClick={() => setCopyOpen(false)}>Zavřít</button>
            </div>
            <p className="muted small" style={{ margin: '4px 0 10px' }}>
              Zkopíruje tvoje vyplněné dny (i poznámky) z vybrané akce. Dny, které tu už máš vyplněné, zůstanou beze změny.
            </p>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
                {otherEvents.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
              </select>
              <button className="primary" onClick={copyFromEvent} disabled={copyBusy || !copyFrom}>
                {copyBusy ? 'Kopíruji…' : 'Převzít'}
              </button>
            </div>
          </div>
        )}

        {sel && selCell && (
          <div className="card" style={{ background: '#faf9f5' }}>
            <div className="spread">
              <strong>{formatDay(sel)}</strong>
              <button className="ghost small" onClick={() => setSel(null)}>Zavřít</button>
            </div>
            {holidayName(sel) && <p className="muted small" style={{ margin: 0 }}>{holidayName(sel)}</p>}
            <div className="row" style={{ margin: '10px 0' }}>
              {([2, 1, 0] as Status[]).map((s) => (
                <button key={s} className={`chip ${selCell.status === s ? 'on' : ''}`}
                  onClick={() => save(sel, { status: s, note: noteDraft })}>{LABEL[s]}</button>
              ))}
            </div>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input value={noteDraft} maxLength={200} onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Např. můžu až od 10:00" onKeyDown={(e) => { if (e.key === 'Enter') save(sel, { ...selCell, note: noteDraft }); }} />
              <button className="primary" onClick={() => { save(sel, { ...selCell, note: noteDraft }); toast('Poznámka uložena'); }}>Uložit</button>
            </div>
          </div>
        )}

        <Calendar
          startMonth={ev.start_month}
          monthCount={ev.month_count}
          onDay={onDay}
          render={(day) => {
            const c = cells.get(day);
            return {
              className: [
                c ? `s${c.status}` : '',
                c?.note ? 'note' : '',
                day < today ? 'past' : '',
                sel === day ? 'sel' : '',
              ].join(' '),
              title: c?.note || undefined,
              disabled: day < today,
            };
          }}
        />
        <p className="muted small" style={{ margin: 0 }}>
          Vyplněno: {counts[2]}× můžu, {counts[1]}× šlo by to. Ukládá se automaticky.
        </p>
      </div>
    </>
  );
}
