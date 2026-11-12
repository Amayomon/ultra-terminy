'use client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { sb } from '@/lib/supabase/client';

/** undefined = načítám, null = nepřihlášen */
export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    const client = sb();
    client.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = client.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return user;
}

/** Přesměruje na přihlášení, pokud uživatel není přihlášen. */
export function useRequireUser() {
  const user = useUser();
  useEffect(() => {
    if (user === null) {
      const next = window.location.pathname + window.location.search;
      window.location.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [user]);
  return user;
}
