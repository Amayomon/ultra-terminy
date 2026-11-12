'use client';
import { sb } from '@/lib/supabase/client';
import { formatRange } from '@/lib/dates';
import { buildIcs, downloadIcs, googleCalendarUrl } from '@/lib/ics';
import type { Ctx } from './types';

export function ConfirmedBanner({ ctx }: { ctx: Ctx }) {
  const { data, isOwner, toast, reload } = ctx;
  const ev = data.event;
  if (!ev.confirmed_start || !ev.confirmed_end) return null;
  const route = data.routes.find((r) => r.id === ev.confirmed_route_id);
  const details = [
    route ? `Trasa: ${route.name}${route.distance_km != null ? ` (${route.distance_km} km${route.elevation_m != null ? `, ↑${route.elevation_m} m` : ''})` : ''}` : '',
    route?.url ?? '',
    ev.description,
    typeof window !== 'undefined' ? window.location.href : '',
  ].filter(Boolean).join('\n');

  async function unconfirm() {
    const { error } = await sb().from('events').update({ confirmed_start: null, confirmed_end: null }).eq('id', ev.id);
    if (error) toast('Nepovedlo se.');
    reload();
  }

  return (
    <div className="banner">
      <div className="small" style={{ opacity: .75 }}>Potvrzený termín</div>
      <h2 style={{ margin: '2px 0 4px' }}>{formatRange(ev.confirmed_start, ev.confirmed_end)}</h2>
      {route && <p style={{ margin: '0 0 10px' }}>Trasa: {route.url ? <a href={route.url} target="_blank" rel="noreferrer" style={{ color: '#fff' }}>{route.name} ↗</a> : route.name}</p>}
      <div className="row">
        <button onClick={() => downloadIcs(`${ev.title}.ics`, buildIcs({
          uid: `${ev.id}-${ev.confirmed_start}`, title: ev.title, start: ev.confirmed_start!, end: ev.confirmed_end!, description: details,
        }))}>📅 Do kalendáře (.ics)</button>
        <a className="btn" target="_blank" rel="noreferrer"
          href={googleCalendarUrl({ title: ev.title, start: ev.confirmed_start, end: ev.confirmed_end, details })}>Google Kalendář</a>
        {isOwner && <button onClick={unconfirm}>Zrušit potvrzení</button>}
      </div>
    </div>
  );
}
