import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, czechHolidays, eventDays, isFreeDay, weekdayMon, formatDay, monthList } from '../src/lib/dates';
import { rankCandidates, type AvailRow } from '../src/lib/scoring';
import { buildIcs } from '../src/lib/ics';

test('svátky 2027 vč. Velikonoc', () => {
  const h = czechHolidays(2027);
  assert.equal(h.get('2027-03-26'), 'Velký pátek');       // Velikonoce 2027: 28. 3.
  assert.equal(h.get('2027-03-29'), 'Velikonoční pondělí');
  assert.ok(h.has('2027-07-06'));
  assert.equal(h.size, 13);
  const h26 = czechHolidays(2026);
  assert.equal(h26.get('2026-04-03'), 'Velký pátek');     // Velikonoce 2026: 5. 4.
  assert.equal(h26.get('2026-04-06'), 'Velikonoční pondělí');
});

test('datumy', () => {
  assert.equal(addDays('2027-02-28', 1), '2027-03-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(weekdayMon('2026-11-16'), 0); // pondělí
  assert.equal(weekdayMon('2026-11-15'), 6); // neděle
  assert.ok(isFreeDay('2026-11-17'));        // svátek v úterý
  assert.ok(!isFreeDay('2026-11-18'));
  const days = eventDays('2026-12-01', 3);
  assert.equal(days.length, 31 + 31 + 28);
  assert.equal(days[0], '2026-12-01');
  assert.equal(days.at(-1), '2027-02-28');
  assert.deepEqual(monthList('2026-11-01', 3).map((m) => `${m.year}-${m.month}`), ['2026-10', '2026-11', '2027-0']);
  assert.equal(formatDay('2026-11-17'), 'úterý 17. listopadu');
});

const row = (user_id: string, day: string, status: 0 | 1 | 2): AvailRow => ({ user_id, day, status, note: '' });

test('jednodenní: všichni > šlo by to > částečně', () => {
  const days = eventDays('2027-01-01', 1);
  const members = ['a', 'b', 'c'];
  const rows = [
    row('a', '2027-01-09', 2), row('b', '2027-01-09', 2), row('c', '2027-01-09', 2),
    row('a', '2027-01-02', 2), row('b', '2027-01-02', 1), row('c', '2027-01-02', 2),
    row('a', '2027-01-03', 2), row('b', '2027-01-03', 2),
  ];
  const r = rankCandidates(days, members, rows, 1);
  assert.equal(r[0].start, '2027-01-09');
  assert.ok(r[0].full);
  assert.equal(r[1].start, '2027-01-02');
  assert.ok(r[1].ok && !r[1].full);
  assert.deepEqual(r[1].maybe, ['b']);
  assert.equal(r[2].start, '2027-01-03');
  assert.deepEqual(r[2].no, ['c']);
});

test('vícedenní okno bere nejhorší den', () => {
  const days = eventDays('2027-01-01', 1);
  const members = ['a', 'b'];
  const rows = [
    row('a', '2027-01-09', 2), row('a', '2027-01-10', 2),
    row('b', '2027-01-09', 2), row('b', '2027-01-10', 1),
    row('a', '2027-01-16', 2), row('a', '2027-01-17', 2),
    row('b', '2027-01-16', 2), row('b', '2027-01-17', 2),
  ];
  const r = rankCandidates(days, members, rows, 2);
  assert.equal(r[0].start, '2027-01-16');
  assert.equal(r[0].end, '2027-01-17');
  assert.ok(r[0].full);
  assert.equal(r[1].start, '2027-01-09');
  assert.deepEqual(r[1].maybe, ['b']);
  // okno nesmí přetéct za konec rozsahu
  assert.ok(r.every((c) => c.end <= '2027-01-31'));
});

test('filtr od dneška', () => {
  const days = eventDays('2027-01-01', 1);
  const r = rankCandidates(days, ['a'], [row('a', '2027-01-05', 2), row('a', '2027-01-20', 2)], 1, '2027-01-10');
  assert.equal(r[0].start, '2027-01-20');
  assert.ok(!r.some((c) => c.start < '2027-01-10'));
});

test('ics celodenní událost', () => {
  const s = buildIcs({ uid: 'x', title: 'Ultra, jaro; test', start: '2027-04-10', end: '2027-04-11' });
  assert.match(s, /DTSTART;VALUE=DATE:20270410/);
  assert.match(s, /DTEND;VALUE=DATE:20270412/);
  assert.match(s, /SUMMARY:Ultra\\, jaro\\; test/);
});
