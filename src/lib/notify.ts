'use client';
import { sb } from './supabase/client';

export type NotifyKind = 'check' | 'remind' | 'confirmed';

/** Požádá server o rozeslání e-mailu. Když notifikace nejsou nastavené, server vrátí {skipped:true}. */
export async function notify(kind: NotifyKind, eventId: string): Promise<{ ok: boolean; sent?: number; skipped?: boolean; error?: string }> {
  try {
    const { data } = await sb().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { ok: false, error: 'no session' };
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, eventId }),
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
