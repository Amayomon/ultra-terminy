'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { sb } from '@/lib/supabase/client';
import { useRequireUser } from '@/components/useUser';
import { peopleWord } from '@/lib/dates';

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const user = useRequireUser();
  const [preview, setPreview] = useState<{ id: string; title: string; member_count: number } | null | undefined>();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user) return;
    sb().rpc('event_preview', { code }).then(({ data }) => setPreview(data?.[0] ?? null));
  }, [user, code]);

  async function join() {
    setBusy(true);
    const { data, error } = await sb().rpc('join_event', { code });
    setBusy(false);
    if (error) setErr('Připojení se nepovedlo.');
    else window.location.replace(`/e/${data}`);
  }

  if (!user || preview === undefined) return <p className="empty">Načítám…</p>;
  if (preview === null) return <div className="card center"><h2>Pozvánka neplatí</h2><p className="muted">Odkaz je špatně nebo byla akce smazána.</p></div>;

  return (
    <div className="hero">
      <div className="card center" style={{ maxWidth: 440, margin: '0 auto' }}>
        <p className="muted small">Pozvánka na akci</p>
        <h1>{preview.title}</h1>
        <p className="muted">{preview.member_count} {peopleWord(preview.member_count)} už je uvnitř</p>
        <button className="primary" onClick={join} disabled={busy}>{busy ? 'Připojuji…' : 'Přidat se'}</button>
        {err && <p className="danger small" style={{ marginTop: 10 }}>{err}</p>}
      </div>
    </div>
  );
}
