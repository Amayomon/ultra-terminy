'use client';
import { useState } from 'react';
import { sb } from '@/lib/supabase/client';
import { EventRangeFields } from '../MonthPicker';
import type { Ctx } from './types';

export function Settings({ ctx }: { ctx: Ctx }) {
  const { data, toast, reload } = ctx;
  const ev = data.event;
  const [title, setTitle] = useState(ev.title);
  const [description, setDescription] = useState(ev.description);
  const [startMonth, setStartMonth] = useState(ev.start_month);
  const [monthCount, setMonthCount] = useState(ev.month_count);
  const [multiDay, setMultiDay] = useState(ev.min_days > 1);
  const [minDays, setMinDays] = useState(Math.max(2, ev.min_days));
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb().from('events').update({
      title: title.trim(),
      description: description.trim(),
      start_month: startMonth,
      month_count: monthCount,
      min_days: multiDay ? minDays : 1,
    }).eq('id', ev.id);
    if (error) toast('Uložení se nepovedlo.');
    else { toast('Uloženo'); reload(); }
  }

  async function del() {
    const { error } = await sb().from('events').delete().eq('id', ev.id);
    if (error) toast('Smazání se nepovedlo.');
    else window.location.href = '/';
  }

  return (
    <>
      <form className="card" onSubmit={save}>
        <h2>Nastavení akce</h2>
        <div className="field">
          <label>Název</label>
          <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Popis (nepovinné)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sraz, doprava, co vzít…" />
        </div>
        <EventRangeFields {...{ startMonth, setStartMonth, monthCount, setMonthCount, multiDay, setMultiDay, minDays, setMinDays }} />
        <p className="muted small">Změna rozsahu měsíců vyplněné dny nesmaže, jen se nezobrazí, pokud jsou mimo rozsah.</p>
        <button className="primary" disabled={!title.trim()}>Uložit</button>
      </form>

      <div className="card">
        <h2>Smazat akci</h2>
        {confirmDelete ? (
          <div className="row">
            <span>Smaže se akce i všechno vyplněné. Nejde to vrátit.</span>
            <button className="danger" onClick={del}>Smazat natrvalo</button>
            <button className="ghost" onClick={() => setConfirmDelete(false)}>Ne</button>
          </div>
        ) : (
          <button className="ghost danger" onClick={() => setConfirmDelete(true)}>Smazat akci…</button>
        )}
      </div>
    </>
  );
}
