'use client';
import Link from 'next/link';
import { useUser } from './useUser';
import { sb } from '@/lib/supabase/client';

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#2f6b4f" />
      <path d="M4 25 12 11l4.5 7L20 13l8 12z" fill="#fff" />
      <path d="M12 11l2.2 3.4-2.2 1.6-2.1-1.5z" fill="#cfe8d8" />
    </svg>
  );
}

export function TopBar() {
  const user = useUser();
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <Logo /> Ultra termíny
      </Link>
      <nav className="row" style={{ gap: 2 }}>
        <Link href="/napoveda" className="btn ghost small">Nápověda</Link>
        {user && (
          <button
            className="ghost small"
            onClick={async () => {
              await sb().auth.signOut();
              window.location.href = '/login';
            }}
          >
            Odhlásit
          </button>
        )}
      </nav>
    </header>
  );
}
