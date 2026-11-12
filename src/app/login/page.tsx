'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { sb } from '@/lib/supabase/client';

function safeNext(n: string | null) {
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/';
}

function LoginInner() {
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(params.get('error') ? 'Odkaz nefungoval nebo vypršel. Zkus to znovu nebo zadej kód z e-mailu.' : '');

  useEffect(() => {
    sb().auth.getUser().then(({ data }) => {
      if (data.user) window.location.replace(next);
    });
  }, [next]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const { error } = await sb().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (error) {
      setErr(
        error.status === 429
          ? 'Moc pokusů najednou – Supabase teď e-maily omezuje. Zkus to za chvíli.'
          : `Nepodařilo se odeslat e-mail: ${error.message}`,
      );
    } else setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const { error } = await sb().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setErr('Kód nesedí nebo vypršel.');
    else window.location.replace(next);
  }

  return (
    <div className="hero">
      <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
        <h1>Přihlášení</h1>
        {!sent ? (
          <form onSubmit={send} className="stack">
            <p className="muted">Pošleme ti na e-mail odkaz pro přihlášení. Žádné heslo.</p>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" type="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="ty@example.cz" />
            </div>
            <button className="primary" disabled={busy}>{busy ? 'Posílám…' : 'Poslat odkaz'}</button>
          </form>
        ) : (
          <form onSubmit={verify} className="stack">
            <p>
              Poslali jsme e-mail na <strong>{email}</strong>. Klikni na odkaz v něm, nebo sem opiš kód.
            </p>
            <div className="field">
              <label htmlFor="code">Kód z e-mailu</label>
              <input id="code" inputMode="numeric" autoComplete="one-time-code" value={code}
                onChange={(e) => setCode(e.target.value)} placeholder="123456" />
            </div>
            <div className="row">
              <button className="primary" disabled={busy || code.trim().length < 6}>Přihlásit</button>
              <button type="button" className="ghost" onClick={() => { setSent(false); setCode(''); }}>Jiný e-mail</button>
            </div>
          </form>
        )}
        {err && <p className="danger small" style={{ marginTop: 12 }}>{err}</p>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
