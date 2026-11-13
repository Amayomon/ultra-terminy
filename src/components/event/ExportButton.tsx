'use client';
import { buildIcs, downloadIcs, googleCalendarUrl } from '@/lib/ics';

/** Malé tlačítko 📅 s nabídkou: stáhnout .ics nebo otevřít v Google Kalendáři. */
export function ExportButton(props: { eventId: string; title: string; start: string; end: string; confirmed: boolean; description?: string }) {
  const details = [
    props.confirmed ? '' : 'Termín zatím není potvrzený.',
    props.description ?? '',
    typeof window !== 'undefined' ? window.location.href : '',
  ].filter(Boolean).join('\n');
  const title = props.confirmed ? props.title : `${props.title} (předběžně)`;

  return (
    <details className="export">
      <summary className="btn" title="Přidat do kalendáře" aria-label="Přidat do kalendáře">📅</summary>
      <div className="export-menu">
        <button type="button" onClick={(e) => {
          downloadIcs(`${props.title} ${props.start}.ics`, buildIcs({
            uid: `${props.eventId}-${props.start}-${props.end}`, title, start: props.start, end: props.end, description: details,
          }));
          (e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open');
        }}>Stáhnout .ics (mobil, Outlook, Apple)</button>
        <a className="btn" target="_blank" rel="noreferrer"
          href={googleCalendarUrl({ title, start: props.start, end: props.end, details })}>Google Kalendář</a>
      </div>
    </details>
  );
}
