# Ultra termíny

Malá webová appka na domlouvání společných ultra trail běhů. Každý se přihlásí e-mailem, naklikne dny, kdy může, a appka najde společný termín.

**Funkce**

- přihlášení přes e-mail (odkaz nebo 6místný kód), bez hesla
- akce s pozvánkou odkazem
- kalendář na 1–6 měsíců, tři stavy: *můžu / šlo by to / nemůžu*
- tlačítko „Víkendy a svátky → můžu“ (české státní svátky včetně Velikonoc)
- poznámka ke dni („můžu až od 10:00“)
- výsledky: seřazené nejlepší termíny + heatmapa, detail dne po lidech
- volitelně vícedenní akce (hledá okna 2–7 dní v kuse)
- návrhy tras s odkazem, délkou a převýšením + hlasování
- potvrzení termínu a trasy, přidání do kalendáře (.ics / Google Kalendář)
- volitelné e-mailové notifikace: nový společný termín, připomínka nevyplněným, potvrzený termín

**Stack:** Next.js 15 · Supabase (přihlášení + Postgres s Row Level Security) · hosting na Vercelu.

---

## Nastavení (jednorázově, ~20 min)

### 1. Supabase

1. Na <https://supabase.com> založ účet a **New project**. Region dej `Central EU (Frankfurt)`, heslo k databázi si ulož.
2. Otevři **SQL Editor → New query**, vlož celý obsah souboru [`supabase/schema.sql`](supabase/schema.sql) a dej **Run**. Mělo by to skončit hláškou *Success*.
3. Otevři **Project Settings → API** (případně **API Keys**) a zkopíruj si:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / publishable** klíč → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Otevři **Authentication → Emails → Templates**. U šablon **Magic Link** a **Confirm signup** nahraď obsah tímhle, aby šel použít i kód (hodí se, když odkaz z e-mailu otevře jiný prohlížeč, třeba ten v Gmail appce):

   Předmět: `Přihlášení do Ultra termínů`

   ```html
   <h2>Přihlášení do Ultra termínů</h2>
   <p><a href="{{ .ConfirmationURL }}">Klikni sem a jsi přihlášený</a></p>
   <p>Nebo v aplikaci zadej kód: <strong style="font-size:20px">{{ .Token }}</strong></p>
   ```

### 2. Vercel

1. Na <https://vercel.com> se přihlas přes GitHub, dej **Add New → Project** a importuj repo `ultra-terminy`.
2. Ve **Environment Variables** vyplň `NEXT_PUBLIC_SUPABASE_URL` a `NEXT_PUBLIC_SUPABASE_ANON_KEY` a dej **Deploy**.
3. Zkopíruj si adresu, kterou Vercel přidělí (např. `https://ultra-terminy.vercel.app`).

### 3. Propojit Supabase s adresou appky

V Supabase otevři **Authentication → URL Configuration**:

- **Site URL**: `https://ultra-terminy.vercel.app`
- **Redirect URLs**: přidej `https://ultra-terminy.vercel.app/**` (a pro lokální vývoj i `http://localhost:3000/**`)

Hotovo. Otevři appku, přihlas se, založ akci a v záložce **Lidé** pošli odkaz kamarádům.

---

## Na co si dát pozor

- **Limit e-mailů v Supabase.** Vestavěná e-mailová služba Supabase pošle jen pár přihlašovacích e-mailů za hodinu. Když se bude přihlašovat víc lidí najednou, část z nich dostane chybu „moc pokusů“ a musí to zkusit později. Přihlášení ale vydrží dlouho, takže to je problém hlavně první den. Trvalé řešení je vlastní SMTP (viz níže).
- **Uspávání projektu na free plánu.** Supabase free projekt se po zhruba týdnu bez aktivity uspí. Když appku delší dobu nikdo neotevře, je potřeba ho v Supabase dashboardu jedním klikem probudit (**Restore project**).

## Volitelné: e-mailové notifikace a vlastní SMTP

Obojí potřebuje účet na <https://resend.com> (free tier stačí) a **vlastní doménu** ověřenou v Resendu. Bez domény Resend posílá jen na tvůj vlastní e-mail.

**Notifikace z appky.** Ve Vercelu přidej proměnné a udělej redeploy:

| Proměnná | Hodnota |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → `service_role` / secret klíč (tajný, nikam jinam!) |
| `RESEND_API_KEY` | Resend → API Keys |
| `EMAIL_FROM` | např. `Ultra termíny <terminy@tvoje-domena.cz>` |
| `NEXT_PUBLIC_SITE_URL` | `https://ultra-terminy.vercel.app` |

Dokud tyhle proměnné nejsou vyplněné, appka funguje normálně a jen neposílá notifikace.

**Vlastní SMTP pro přihlašování (odstraní limit).** V Supabase otevři **Authentication → Emails → SMTP Settings**, zapni custom SMTP a zadej údaje z Resendu: host `smtp.resend.com`, port `465`, user `resend`, heslo = API klíč.

---

## Lokální vývoj

```bash
cp .env.example .env.local   # a vyplň hodnoty
npm install
npm run dev                  # http://localhost:3000
npm test                     # testy logiky (svátky, hledání termínů, .ics)
```

## Jak funguje hledání termínu

- Den bez označení = nemůžu.
- Pořadí: nejdřív dny, kdy **můžou všichni**, pak dny, kdy nikdo neřekl „nemůžu“ (jen někdo „šlo by to“), pak podle počtu lidí, co můžou.
- U vícedenních oken platí nejhorší den: kdo nemůže aspoň jeden den, nemůže celé okno.
- Data chrání Row Level Security: akci a vyplněné dny vidí jen její členové a každý může měnit jen své dny.
