'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'ut_welcome_dismissed';

/** Krátká nápověda pro nováčky. Zobrazí se, dokud ji člověk nezavře (pamatuje si to prohlížeč). */
export function WelcomeCard({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    let dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === '1'; } catch { /* storage nedostupný */ }
    setVisible(!dismissed);
  }, [show]);

  if (!visible) return null;

  function close() {
    try { localStorage.setItem(KEY, '1'); } catch { /* nevadí */ }
    setVisible(false);
  }

  return (
    <div className="card" style={{ borderColor: 'var(--accent)', background: '#f3f8f4' }}>
      <h2>Vítej! Jak na to:</h2>
      <ol style={{ margin: '0 0 12px', paddingLeft: 20 }}>
        <li>Klikáním na dny označ, kdy můžeš:{' '}
          <span style={{ color: 'var(--can)', fontWeight: 600 }}>zelená = můžu</span>,{' '}
          <span style={{ color: '#a67600', fontWeight: 600 }}>žlutá = šlo by to</span>,{' '}
          <span className="muted" style={{ fontWeight: 600 }}>šedá = nemůžu</span>.
          Tip: tlačítko „Víkendy a svátky → můžu“ ti ušetří klikání.</li>
        <li>Ukládá se to samo, nic neodesíláš.</li>
        <li>V záložce <strong>Výsledky</strong> uvidíš, kdy můžou všichni.</li>
      </ol>
      <div className="row">
        <button className="primary" onClick={close}>Rozumím</button>
        <Link href="/napoveda" className="btn ghost">Celá nápověda</Link>
      </div>
    </div>
  );
}
