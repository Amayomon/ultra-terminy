'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { sb } from '@/lib/supabase/client';
import { useRequireUser } from '@/components/useUser';
import type { AvailabilityRow, EventRow, MemberRow, ProfileRow, RouteRow, VoteRow } from '@/lib/types';
import type { Ctx, EventData } from '@/components/event/types';
import { MyAvailability } from '@/components/event/MyAvailability';
import { Results } from '@/components/event/Results';
import { Routes } from '@/components/event/Routes';
import { People } from '@/components/event/People';
import { Settings } from '@/components/event/Settings';
import { ConfirmedBanner } from '@/components/event/ConfirmedBanner';

type Tab = 'mine' | 'results' | 'routes' | 'people' | 'settings';

async function load(id: string): Promise<EventData | null> {
  const c = sb();
  const [ev, mem, av, ro] = await Promise.all([
    c.from('events').select('*').eq('id', id).maybeSingle(),
    c.from('event_members').select('*').eq('event_id', id).order('joined_at'),
    c.from('availability').select('event_id,user_id,day,status,note').eq('event_id', id),
    c.from('routes').select('*').eq('event_id', id),
  ]);
  if (!ev.data) return null;
  const members = (mem.data ?? []) as MemberRow[];
  const routes = (ro.data ?? []) as RouteRow[];
  const [pr, vo] = await Promise.all([
    c.from('profiles').select('id,display_name').in('id', members.map((m) => m.user_id)),
    routes.length
      ? c.from('route_votes').select('route_id,user_id').in('route_id', routes.map((r) => r.id))
      : Promise.resolve({ data: [] as VoteRow[] }),
  ]);
  return {
    event: ev.data as EventRow,
    members,
    profiles: new Map(((pr.data ?? []) as ProfileRow[]).map((p) => [p.id, p])),
    avail: (av.data ?? []) as AvailabilityRow[],
    routes,
    votes: (vo.data ?? []) as VoteRow[],
  };
}

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const user = useRequireUser();
  const [data, setData] = useState<EventData | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('mine');
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabChosen = useRef(false);

  const reload = useCallback(async () => { setData(await load(id)); }, [id]);

  useEffect(() => { if (user) reload(); }, [user, reload]);

  // obnovit data při návratu do záložky
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible' && user) reload(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [user, reload]);

  // kdo už vyplnil, začne na výsledcích
  useEffect(() => {
    if (!data || !user || tabChosen.current) return;
    tabChosen.current = true;
    const me = data.members.find((m) => m.user_id === user.id);
    if (me?.filled_at || data.event.confirmed_start) setTab('results');
  }, [data, user]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3200);
  }, []);

  const ctx: Ctx | null = useMemo(() => {
    if (!data || !user) return null;
    return {
      data,
      me: user.id,
      isOwner: data.event.owner_id === user.id,
      reload,
      toast,
      name: (uid: string) => data.profiles.get(uid)?.display_name || 'Někdo',
    };
  }, [data, user, reload, toast]);

  if (!user || data === undefined) return <p className="empty">Načítám…</p>;
  if (data === null || !ctx) {
    return (
      <div className="card center">
        <h2>Akce nenalezena</h2>
        <p className="muted">Buď neexistuje, nebo v ní nejsi. Požádej o odkaz s pozvánkou.</p>
        <Link href="/" className="btn">Zpět</Link>
      </div>
    );
  }

  const tabs: [Tab, string][] = [
    ['mine', 'Můj kalendář'],
    ['results', 'Výsledky'],
    ['routes', 'Trasy'],
    ['people', `Lidé (${data.members.length})`],
  ];
  if (ctx.isOwner) tabs.push(['settings', '⚙']);

  return (
    <>
      <h1 style={{ marginTop: 6 }}>{data.event.title}</h1>
      {data.event.description && <p className="muted" style={{ whiteSpace: 'pre-line' }}>{data.event.description}</p>}

      <ConfirmedBanner ctx={ctx} />

      <nav className="tabs">
        {tabs.map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); if (k !== 'mine') reload(); }}>{label}</button>
        ))}
      </nav>

      {tab === 'mine' && <MyAvailability ctx={ctx} />}
      {tab === 'results' && <Results ctx={ctx} />}
      {tab === 'routes' && <Routes ctx={ctx} />}
      {tab === 'people' && <People ctx={ctx} />}
      {tab === 'settings' && ctx.isOwner && <Settings ctx={ctx} />}

      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </>
  );
}
