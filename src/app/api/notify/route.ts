import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/server';
import { eventDays, formatRange, todayISO } from '@/lib/dates';
import { rankCandidates, type AvailRow } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

type Kind = 'check' | 'remind' | 'confirmed';

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

async function sendEmails(to: string[], subject: string, html: string) {
  const key = process.env.RESEND_API_KEY!;
  const from = process.env.EMAIL_FROM!;
  let sent = 0;
  // Resend batch endpoint – max 100 e-mailů na požadavek, každý dostane vlastní (nevidí ostatní adresy)
  for (let i = 0; i < to.length; i += 100) {
    const batch = to.slice(i, i + 100).map((addr) => ({ from, to: [addr], subject, html }));
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(batch),
    });
    if (res.ok) sent += batch.length;
    else console.error('Resend error', res.status, await res.text());
  }
  return sent;
}

function layout(title: string, body: string, link: string) {
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;color:#1c2420">
  <h2 style="margin:0 0 12px">${esc(title)}</h2>${body}
  <p style="margin-top:20px"><a href="${link}" style="background:#2f6b4f;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Otevřít akci</a></p>
  <p style="color:#888;font-size:12px;margin-top:24px">Ultra termíny</p></div>`;
}

export async function POST(req: Request) {
  const admin = adminClient();
  if (!admin || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const { data: auth } = await admin.auth.getUser(token);
  const caller = auth.user;
  if (!caller) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: { kind?: Kind; eventId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 }); }
  const { kind, eventId } = body;
  if (!eventId || !['check', 'remind', 'confirmed'].includes(kind ?? '')) {
    return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 });
  }

  const { data: ev } = await admin.from('events').select('*').eq('id', eventId).maybeSingle();
  if (!ev) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  const { data: members } = await admin.from('event_members').select('user_id,filled_at').eq('event_id', eventId);
  const memberIds = (members ?? []).map((m) => m.user_id as string);
  if (!memberIds.includes(caller.id)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  const isOwner = ev.owner_id === caller.id;
  if ((kind === 'remind' || kind === 'confirmed') && !isOwner) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const link = `${site}/e/${eventId}`;

  async function emailsOf(ids: string[]) {
    const out: string[] = [];
    for (const id of ids) {
      const { data } = await admin!.auth.admin.getUserById(id);
      if (data.user?.email) out.push(data.user.email);
    }
    return out;
  }

  if (kind === 'remind') {
    const targets = (members ?? []).filter((m) => !m.filled_at && m.user_id !== caller.id).map((m) => m.user_id as string);
    if (targets.length === 0) return NextResponse.json({ ok: true, sent: 0 });
    const sent = await sendEmails(await emailsOf(targets), `Vyplň, kdy můžeš: ${ev.title}`,
      layout(ev.title, `<p>Ještě jsi nevyplnil(a), kdy můžeš. Zabere to minutu – stačí naklikat dny v kalendáři.</p>`, link));
    return NextResponse.json({ ok: true, sent });
  }

  if (kind === 'confirmed') {
    if (!ev.confirmed_start) return NextResponse.json({ ok: true, sent: 0 });
    const when = formatRange(ev.confirmed_start, ev.confirmed_end ?? ev.confirmed_start);
    const targets = memberIds.filter((id) => id !== caller.id);
    const sent = await sendEmails(await emailsOf(targets), `Termín potvrzen: ${ev.title} – ${when}`,
      layout(ev.title, `<p>Termín je potvrzený: <strong>${esc(when)}</strong>.</p><p>V aplikaci si ho můžeš jedním klikem přidat do kalendáře.</p>`, link));
    return NextResponse.json({ ok: true, sent });
  }

  // kind === 'check' – našel se nový den/okno, kdy můžou všichni?
  if (memberIds.length < 2) return NextResponse.json({ ok: true, sent: 0 });
  const { data: avail } = await admin.from('availability').select('user_id,day,status,note').eq('event_id', eventId);
  const days = eventDays(ev.start_month, ev.month_count);
  const full = rankCandidates(days, memberIds, (avail ?? []) as AvailRow[], ev.min_days, todayISO()).filter((c) => c.full);
  const notified = new Set<string>(ev.notified_days ?? []);
  const fresh = full.filter((c) => !notified.has(c.start));
  if (fresh.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  await admin.from('events').update({ notified_days: [...notified, ...fresh.map((c) => c.start)] }).eq('id', eventId);
  const list = fresh.slice(0, 5).map((c) => `<li>${esc(formatRange(c.start, c.end))}</li>`).join('');
  const sent = await sendEmails(await emailsOf(memberIds),
    `Našel se společný termín: ${ev.title}`,
    layout(ev.title, `<p>Tyhle termíny teď můžou úplně všichni:</p><ul>${list}</ul>${fresh.length > 5 ? `<p>…a ${fresh.length - 5} dalších.</p>` : ''}`, link));
  return NextResponse.json({ ok: true, sent });
}
