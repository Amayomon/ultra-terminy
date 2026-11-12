import { addDays } from './dates';

export type Status = 0 | 1 | 2; // 0 nemůžu, 1 šlo by to, 2 můžu

export type AvailRow = {
  user_id: string;
  day: string;
  status: Status;
  note: string;
};

export type Candidate = {
  start: string;
  end: string;
  can: string[];   // user_id, kteří můžou celé okno
  maybe: string[]; // šlo by to (aspoň jeden den "šlo by to", žádné "nemůžu")
  no: string[];
  full: boolean;   // všichni můžou
  ok: boolean;     // nikdo nemůže "ne"
};

/** Lookup status[user][day] */
export function buildLookup(rows: AvailRow[]) {
  const map = new Map<string, Map<string, AvailRow>>();
  for (const r of rows) {
    let u = map.get(r.user_id);
    if (!u) map.set(r.user_id, (u = new Map()));
    u.set(r.day, r);
  }
  return map;
}

/**
 * Najde a seřadí kandidátní termíny.
 * length = počet dní v kuse (1 = jednodenní akce).
 * days = všechny dny v rozsahu (souvislé, seřazené); dny před `from` se přeskočí.
 */
export function rankCandidates(
  days: string[],
  members: string[],
  rows: AvailRow[],
  length = 1,
  from?: string,
): Candidate[] {
  if (members.length === 0) return [];
  const lookup = buildLookup(rows);
  const daySet = new Set(days);
  const out: Candidate[] = [];

  for (const start of days) {
    if (from && start < from) continue;
    const end = addDays(start, length - 1);
    if (!daySet.has(end)) continue;

    const can: string[] = [];
    const maybe: string[] = [];
    const no: string[] = [];
    for (const u of members) {
      let worst: Status = 2;
      for (let i = 0; i < length; i++) {
        const s = (lookup.get(u)?.get(addDays(start, i))?.status ?? 0) as Status;
        if (s < worst) worst = s;
        if (worst === 0) break;
      }
      (worst === 2 ? can : worst === 1 ? maybe : no).push(u);
    }
    out.push({
      start, end, can, maybe, no,
      full: can.length === members.length,
      ok: no.length === 0,
    });
  }

  out.sort((a, b) =>
    Number(b.full) - Number(a.full) ||
    Number(b.ok) - Number(a.ok) ||
    (b.can.length + b.maybe.length) - (a.can.length + a.maybe.length) ||
    b.can.length - a.can.length ||
    a.start.localeCompare(b.start),
  );
  return out;
}

/** Statistika pro jeden den (pro heatmapu) */
export function dayStats(day: string, members: string[], lookup: ReturnType<typeof buildLookup>) {
  let can = 0, maybe = 0;
  for (const u of members) {
    const s = lookup.get(u)?.get(day)?.status ?? 0;
    if (s === 2) can++;
    else if (s === 1) maybe++;
  }
  return { can, maybe, no: members.length - can - maybe };
}
