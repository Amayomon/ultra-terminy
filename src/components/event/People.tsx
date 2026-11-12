'use client';
import { useState } from 'react';
import { sb } from '@/lib/supabase/client';
import type { Ctx } from './types';

export function People({ ctx }: { ctx: Ctx }) {
  const { data, me, isOwner, name, toast, reload } = ctx;
  const ev = data.event;
  const [myName, setMyName] = useState(data.profiles.get(me)?.display_name ?? '');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const link = typeof window !== 'undefined' ? `${window.location.origin}/join/${ev.invite_code}` : '';

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: ev.title, text: `Vyplň, kdy můžeš na ${ev.title}:`, url: link }); return; } catch { /* zrušeno */ }
    }
    await navigator.clipboard.writeText(link);
    toast('Odkaz zkopírován');
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb().from('profiles').update({ display_name: myName.trim() }).eq('id', me);
    if (error) toast('Nepovedlo se.');
    else { toast('Jméno uloženo'); reload(); }
  }

  async function removeMember(userId: string) {
    const { error } = await sb().from('event_members').delete().match({ event_id: ev.id, user_id: userId });
    if (error) return toast('Nepovedlo se.');
    if (userId === me) window.location.href = '/';
    else reload();
  }

  return (
    <>
      <div className="card">
        <h2>Pozvat lidi</h2>
        <p className="muted small">Pošli tenhle odkaz do vašeho chatu. Kdo ho otevře a přihlásí se, je uvnitř.</p>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input readOnly value={link} onFocus={(e) => e.target.select()} />
          <button className="primary" onClick={share}>Sdílet</button>
        </div>
      </div>

      <div className="card">
        <h2>Lidé ({data.members.length})</h2>
        <ul className="people-list">
          {data.members.map((m) => (
            <li key={m.user_id}>
              <span>
                <span className="dot" style={{ background: m.filled_at ? 'var(--can)' : 'var(--no)', border: '1px solid var(--line)' }} />
                {name(m.user_id)}
                {m.user_id === ev.owner_id && <span className="small muted"> · zakladatel</span>}
                {m.user_id === me && <span className="small muted"> · ty</span>}
              </span>
              <span className="row">
                <span className="small muted">{m.filled_at ? 'vyplněno' : 'nevyplněno'}</span>
                {isOwner && m.user_id !== me && (
                  <button className="ghost small danger" onClick={() => removeMember(m.user_id)}>Odebrat</button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <form className="card" onSubmit={saveName}>
        <h2>Tvoje jméno</h2>
        <p className="muted small">Takhle tě uvidí ostatní.</p>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input value={myName} maxLength={40} onChange={(e) => setMyName(e.target.value)} placeholder="Jméno nebo přezdívka" />
          <button disabled={!myName.trim()}>Uložit</button>
        </div>
      </form>

      {!isOwner && (
        <div className="card">
          {confirmLeave ? (
            <div className="row">
              <span>Opravdu opustit akci? Smažou se i tvoje vyplněné dny.</span>
              <button className="danger" onClick={() => removeMember(me)}>Opustit</button>
              <button className="ghost" onClick={() => setConfirmLeave(false)}>Ne</button>
            </div>
          ) : (
            <button className="ghost danger" onClick={() => setConfirmLeave(true)}>Opustit akci</button>
          )}
        </div>
      )}
    </>
  );
}
