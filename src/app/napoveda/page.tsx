import Link from 'next/link';

export const metadata = { title: 'Nápověda · Ultra termíny' };

const Dot = ({ c }: { c: string }) => (
  <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: c, border: '1px solid var(--line)', verticalAlign: -1, marginRight: 6 }} />
);

export default function Help() {
  return (
    <>
      <h1 style={{ marginTop: 6 }}>Nápověda</h1>
      <nav className="card small" aria-label="Obsah">
        <div className="row" style={{ gap: 14 }}>
          <a href="#k-cemu">K čemu to je</a>
          <a href="#prihlaseni">Přihlášení</a>
          <a href="#vyplnovani">Vyplňování</a>
          <a href="#vysledky">Výsledky</a>
          <a href="#trasy">Trasy</a>
          <a href="#potvrzeni">Potvrzený termín</a>
          <a href="#zakladatel">Pro zakladatele</a>
        </div>
      </nav>

      <section className="card" id="k-cemu">
        <h2>K čemu to je</h2>
        <p>Abychom se nemuseli půl týdne dohadovat v chatu, kdy kdo může. Každý si naklikne dny, kdy má volno, a appka sama ukáže, kdy můžou všichni.</p>
        <p style={{ margin: 0 }}>Každá akce má vlastní partu, vlastní kalendář a vlastní výsledky. Můžeš být ve víc akcích najednou.</p>
      </section>

      <section className="card" id="prihlaseni">
        <h2>Přihlášení</h2>
        <p>Žádné heslo. Zadáš e-mail a přijde ti zpráva s odkazem a 6místným kódem. Buď klikni na odkaz, nebo kód opiš do appky.</p>
        <p style={{ margin: 0 }}><strong>E-mail nepřišel?</strong> Mrkni do spamu nebo do Hromadné/Promo složky a dej tomu pár minut. Když appka hlásí „moc pokusů“, zkus to znovu za chvíli. Jednou přihlášený zůstaneš přihlášený dlouho.</p>
      </section>

      <section className="card" id="vyplnovani">
        <h2>Vyplňování (záložka Můj kalendář)</h2>
        <p>Klikáním na den přepínáš stav:</p>
        <ul style={{ margin: '0 0 12px', paddingLeft: 18 }}>
          <li><Dot c="var(--can)" /><strong>můžu</strong> – jasně, jdu</li>
          <li><Dot c="var(--maybe)" /><strong>šlo by to</strong> – když to jinak nepůjde, přizpůsobím se</li>
          <li><Dot c="var(--no)" /><strong>nemůžu</strong> – den, na který neklikneš, se počítá jako „nemůžu“</li>
        </ul>
        <p>Všechno se <strong>ukládá samo</strong>, nic neodesíláš.</p>
        <p><strong>Víkendy a svátky → můžu</strong> označí jedním klikem všechny volné dny. Pak už jen odklikáš ty, kdy nemůžeš.</p>
        <p><strong>✎ Poznámky</strong>: zapni a klikni na den, třeba „můžu až od 10:00“ nebo „jen kratší varianta“. Ostatní to uvidí ve výsledcích. Den s poznámkou má dole čárku.</p>
        <p style={{ margin: 0 }}><strong>Převzít dny z jiné akce</strong>: když jsi ve víc akcích, zkopíruješ si vyplněné dny z jiné. Co už máš vyplněné, se nepřepíše.</p>
      </section>

      <section className="card" id="vysledky">
        <h2>Výsledky</h2>
        <p>Nahoře je seznam <strong>nejlepších termínů</strong>. Nejdřív dny, kdy můžou všichni, pak dny, kdy nikdo neřekl „nemůžu“ (jen někdo „šlo by to“), pak podle toho, kolik lidí může.</p>
        <p>Pod tím je <strong>kalendář pro všechny</strong>. Zelená = můžou všichni, žlutá = všichni, ale někdo jen „šlo by to“, odstíny šedozelené = část lidí. Číslo „4/6“ znamená, že můžou 4 ze 6. Klikni na den a uvidíš, kdo může a jaké má poznámky.</p>
        <p style={{ margin: 0 }}>Nahoře taky vidíš, kdo ještě nevyplnil. Dokud nevyplní všichni, výsledky nejsou úplné.</p>
      </section>

      <section className="card" id="trasy">
        <h2>Trasy</h2>
        <p style={{ margin: 0 }}>Kdokoli může navrhnout trasu: název, odkaz (Mapy.cz, Strava, Garmin…), délku a převýšení. Palcem 👍 hlasuješ, hlasovat můžeš pro víc tras. Nejoblíbenější jsou nahoře.</p>
      </section>

      <section className="card" id="potvrzeni">
        <h2>Potvrzený termín</h2>
        <p style={{ margin: 0 }}>Když zakladatel termín potvrdí, objeví se nahoře v akci tmavý pruh s datem (a případně trasou). Tlačítkem <strong>Do kalendáře</strong> si ho uložíš do mobilu nebo Outlooku, případně rovnou do <strong>Google Kalendáře</strong>.</p>
      </section>

      <section className="card" id="zakladatel">
        <h2>Pro zakladatele akce</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Nová akce</strong>: na hlavní stránce. Vybereš, od kterého měsíce a na kolik měsíců se hledá.</li>
          <li><strong>Pozvání lidí</strong>: záložka Lidé → Sdílet. Odkaz pošli do chatu. Kdo ho otevře a přihlásí se, je uvnitř.</li>
          <li><strong>Potvrzení termínu</strong>: ve Výsledcích tlačítko Potvrdit u termínu, nebo klikni na den v kalendáři.</li>
          <li><strong>Výběr trasy</strong>: v Trasách „Vybrat tuhle“.</li>
          <li><strong>Vícedenní akce</strong>: v nastavení (⚙) zapneš hledání víc dní v kuse. Pak platí nejhorší den: kdo nemůže aspoň jeden den, nemůže celé okno.</li>
          <li><strong>Nastavení (⚙)</strong>: název, popis, rozsah měsíců, smazání akce. Odebrat člověka jde v záložce Lidé.</li>
        </ul>
      </section>

      <p className="center"><Link href="/" className="btn">Zpět na akce</Link></p>
    </>
  );
}
