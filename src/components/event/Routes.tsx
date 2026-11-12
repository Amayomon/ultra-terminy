'use client';
import { useState } from 'react';
import { sb } from '@/lib/supabase/client';
import type { Ctx } from './types';

export function Routes({ ctx }: { ctx: Ctx }) {
  const { data, me, isOwner, name, toast, reload } = ctx;
  const ev = data.event;
  const [open, setOpen] = useState(data.routes.length === 0);
  const [form, setForm] = useState({ name: '', url: '', km: '', m: '' });
  const [busy, setBusy] = useState(false);

  const votesBy = new Map<string, string[]>();
  for (const v of data.votes) votesBy.set(v.route_id, [...(votesBy.get(v.route_id) ?? []), v.user_id]);
  const routes = [...data.routes].sort((a, b) =>
    (votesBy.get(b.id)?.length ?? 0) - (votesBy.get(a.id)?.length ?? 0) || a.created_at.localeCompare(b.created_at));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    let url = form.url.trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    const { error } = await sb().from('routes').insert({
      event_id: ev.id,
      created_by: me,
      name: form.name.trim(),
      url,
      distance_km: form.km ? Number(form.km.replace(',', '.')) : null,
      elevation_m: form.m ? Math.round(Number(form.m)) : null,
    });
    setBusy(false);
    if (error) return toast('Trasu se nepodařilo přidat.');
    setForm({ name: '', url: '', km: '', m: '' });
    setOpen(false);
    reload();
  }

  async function toggleVote(routeId: string, voted: boolean) {
    const q = voted
      ? sb().from('route_votes').delete().match({ route_id: routeId, user_id: me })
      : sb().from('route_votes').insert({ route_id: routeId, user_id: me });
    const { error } = await q;
    if (error) toast('Nepovedlo se.');
    reload();
  }

  async function remove(routeId: string) {
    const { error } = await sb().from('routes').delete().eq('id', routeId);
    if (error) toast('Smazání se nepovedlo.');
    reload();
  }

  async function pick(routeId: string | null) {
    const { error } = await sb().from('events').update({ confirmed_route_id: routeId }).eq('id', ev.id);
    if (error) toast('Nepovedlo se.');
    else toast(routeId ? 'Trasa vybrána' : 'Výběr trasy zrušen');
    reload();
  }

  return (
    <div className="card">
      <div className="spread" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Kam poběžíme?</h2>
        {!open && <button onClick={() => setOpen(true)}>+ Navrhnout trasu</button>}
      </div>
      <p className="muted small">Navrhni trasu (odkaz na Mapy.cz, Stravu, Garmin…) a hlasuj. Hlasovat můžeš pro víc tras.</p>

      {open && (
        <form onSubmit={add} className="card" style={{ background: '#faf9f5' }}>
          <div className="field">
            <label>Název</label>
            <input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Např. Krkonošská 50" />
          </div>
          <div className="field">
            <label>Odkaz na trasu</label>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://mapy.cz/…" />
          </div>
          <div className="grid2 field">
            <div>
              <label>Délka (km)</label>
              <input inputMode="decimal" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} placeholder="52" />
            </div>
            <div>
              <label>Převýšení (m)</label>
              <input inputMode="numeric" value={form.m} onChange={(e) => setForm({ ...form, m: e.target.value })} placeholder="2100" />
            </div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="primary" disabled={busy || !form.name.trim()}>Přidat</button>
            {data.routes.length > 0 && <button type="button" className="ghost" onClick={() => setOpen(false)}>Zrušit</button>}
          </div>
        </form>
      )}

      {routes.length === 0 && !open && <p className="empty">Zatím žádná trasa.</p>}

      <ul className="people-list">
        {routes.map((r) => {
          const voters = votesBy.get(r.id) ?? [];
          const voted = voters.includes(me);
          const chosen = ev.confirmed_route_id === r.id;
          return (
            <li key={r.id} style={{ alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 6 }}>
                  <strong>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.name} ↗</a> : r.name}</strong>
                  {chosen && <span className="badge">Vybraná</span>}
                </div>
                <div className="small muted">
                  {[r.distance_km != null ? `${r.distance_km} km` : '', r.elevation_m != null ? `↑ ${r.elevation_m} m` : '', `navrhl(a) ${name(r.created_by)}`].filter(Boolean).join(' · ')}
                </div>
                {voters.length > 0 && <div className="small muted">👍 {voters.map(name).join(', ')}</div>}
                <div className="row" style={{ marginTop: 6 }}>
                  {isOwner && (chosen
                    ? <button className="ghost small" onClick={() => pick(null)}>Zrušit výběr</button>
                    : <button className="ghost small" onClick={() => pick(r.id)}>Vybrat tuhle</button>)}
                  {(r.created_by === me || isOwner) && <button className="ghost small danger" onClick={() => remove(r.id)}>Smazat</button>}
                </div>
              </div>
              <button className={`chip ${voted ? 'on' : ''}`} onClick={() => toggleVote(r.id, voted)}>
                👍 {voters.length}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
