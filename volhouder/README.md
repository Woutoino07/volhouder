# Volhouder

Een kleine webapp om commitments vast te leggen met een echte accountability-partner
en een echte straf (geld + zichtbaarheid) als je mist.

Gebouwd met Next.js + Supabase (database, login, foto-opslag). Draait volledig op
gratis lagen — geen creditcard nodig om te starten. De look (kleuren, lettertype)
is gebaseerd op de huisstijl van [archer.academy](https://archer.academy).

## Wat de app doet

- Jij maakt een commitment (bv. "om 6:40 uit bed"), met een deadline, een manier
  van bewijs (foto en/of afvinken), een geldinzet en of missers zichtbaar worden
  voor je partner(s).
- Je nodigt één of meerdere mensen uit per e-mail. Elke uitgenodigde maakt een
  account (e-mail + wachtwoord) of logt in als hij er al één heeft, en wordt
  zo accountability-partner voor die commitment. Meerdere partners is
  aangeraden: het voorkomt dat de enige partner nooit durft af te keuren.
  Je kan later altijd nog iemand toevoegen of verwijderen vanaf de
  commitmentpagina.
- Mis je de deadline zonder bewijs, dan telt dat automatisch en hard als
  gemist — daar is geen partneroordeel voor nodig. Lever je wél bewijs, dan
  kan eender welke partner het afkeuren; doet niemand dat binnen 24 uur, dan
  is het automatisch goedgekeurd.
- Oneens met een afkeuring of een miss? Als eigenaar kan je die betwisten
  ("ik ben het hier niet mee eens"); de straf wordt dan opgeschort tot een
  partner de betwisting beslecht.
- Bij een miss of afkeuring komt er automatisch een schuld bij, gelijk
  verdeeld over alle partners van die commitment, en verschijnt het op het
  gedeelde overzicht van missers.
- De app int zelf geen geld — het is in de eerste plaats een boekhouding,
  jullie kunnen zelf uitbetalen (bv. via Payconiq) en het dan als betaald
  markeren. Optioneel kan iedereen ook zijn eigen Stripe-account koppelen,
  waarna een partner een schuld met één klik online en rechtstreeks kan
  uitbetalen (geen commissie, de app ziet dat geld nooit).
- Bewijs moet met de camera zelf genomen worden (geen bestaande foto uit je
  galerij) — dat maakt het lastiger om te foezelen.
- Bewijsfoto's worden na 1 week automatisch verwijderd om de opslag klein te
  houden. De check-in zelf (datum, status, notities) blijft wél voorgoed
  staan — enkel de foto verdwijnt.
- Uitnodigingslinks verlopen na 7 dagen.
- Elke commitment toont je huidige reeks en slaagpercentage.
- De app is installeerbaar als "echte" app op je telefoon of computer
  (toevoegen aan beginscherm), en stuurt pushmeldingen: meteen wanneer een
  partner iets moet beoordelen, wanneer iets goed- of afgekeurd wordt, en één
  keer per dag een herinnering als er nog iets openstaat.

## Stap 1 — Supabase-project aanmaken (gratis)

1. Ga naar [supabase.com](https://supabase.com), maak een gratis account, en
   klik op **New project**. Kies een naam en wachtwoord (het wachtwoord heb je
   verder niet nodig, bewaar het toch ergens).
2. Wacht tot het project klaar is (duurt een minuutje).
3. Ga naar **SQL Editor** (in het linkermenu) > **New query**.
4. Open het bestand `supabase/schema.sql` uit deze map, kopieer de volledige
   inhoud, plak het in de SQL Editor, en klik **Run**. Dit maakt alle tabellen,
   beveiligingsregels en logica aan. Je hoeft dit maar één keer te doen.
5. Ga naar **Project Settings > API**. Je hebt zo dadelijk drie waarden nodig:
   de **Project URL**, de **anon public key**, en de **service_role key**
   (staat eronder, met een waarschuwing — die heb je nodig voor de
   pushmeldingen en de dagelijkse taak, verderop in Stap 3).

## Stap 2 — Lokaal uitproberen (optioneel maar aangeraden)

1. Kopieer `.env.local.example` naar `.env.local`.
2. Vul `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` en
   `SUPABASE_SERVICE_ROLE_KEY` in met de waarden uit Stap 1.5. Laat
   `NEXT_PUBLIC_SITE_URL` op `http://localhost:3000`.
3. (Optioneel, voor pushmeldingen lokaal) Genereer een sleutelpaar met
   `npx web-push generate-vapid-keys` en vul `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   en `VAPID_PRIVATE_KEY` in, plus een `VAPID_SUBJECT` (je eigen
   e-mailadres, met `mailto:` ervoor). Verzin ook iets voor `CRON_SECRET`,
   al gebruik je dat lokaal niet echt.
4. Installeer en start:
   ```
   npm install
   npm run dev
   ```
5. Ga naar Supabase > **Authentication > URL Configuration** en zet de
   **Site URL** op `http://localhost:3000` (zolang je lokaal test).
6. (Optioneel, handig om lokaal te testen) Ga naar **Authentication >
   Providers > Email** en zet **Confirm email** uit, zodat je bij het
   registreren meteen ingelogd bent zonder bevestigingsmail. Zet dit later
   voor de echte deployment gerust weer aan.
7. Open `http://localhost:3000`, klik **Registreer hier**, maak een account
   aan met je eigen e-mailadres en een wachtwoord, en maak een
   testcommitment aan.

## Stap 3 — Online zetten via Vercel (gratis)

1. Zet deze map in een eigen GitHub-repository (via GitHub Desktop, of:
   `git init && git add . && git commit -m "eerste versie"` en dan pushen naar
   een nieuwe repo op github.com).
2. Ga naar [vercel.com](https://vercel.com), maak een gratis account (kan met
   je GitHub-account), en klik **Add New > Project**. Kies je repository.
3. Bij **Environment Variables**, voeg toe:
   - `NEXT_PUBLIC_SUPABASE_URL` — dezelfde waarde als hierboven
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — dezelfde waarde als hierboven
   - `SUPABASE_SERVICE_ROLE_KEY` — dezelfde waarde als hierboven (de
     service_role key uit Stap 1.5)
   - `NEXT_PUBLIC_SITE_URL` — je Vercel-URL, bv. `https://volhouder.vercel.app`
     (Vercel toont je die URL pas na de eerste deploy — je kan de deploy dus
     even opnieuw doen nadat je die waarde kent, of Vercel geeft je vooraf al
     een voorspelbare `project-naam.vercel.app` URL die je nu al kan invullen)
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` en `VAPID_PRIVATE_KEY` — genereer dit
     sleutelpaar één keer op je eigen computer met
     `npx web-push generate-vapid-keys` en gebruik daarna altijd hetzelfde
     paar (opnieuw genereren maakt bestaande pushinschrijvingen ongeldig)
   - `VAPID_SUBJECT` — `mailto:` gevolgd door je eigen e-mailadres
   - `CRON_SECRET` — verzin een lange willekeurige tekst (bv. via
     `openssl rand -hex 32`); dit beveiligt de dagelijkse taak tegen misbruik
     door buitenstaanders
4. Klik **Deploy**. De dagelijkse taak (`vercel.json`) wordt automatisch
   herkend en ingepland door Vercel — daar hoef je zelf niets voor te doen.
5. Ga terug naar Supabase > **Authentication > URL Configuration** en:
   - zet **Site URL** op je Vercel-URL
   - voeg onder **Redirect URLs** toe: `https://jouw-app.vercel.app/auth/callback`
6. Klaar. Open je Vercel-URL, registreer een account, maak je eerste échte
   commitment aan, en stuur de uitnodigingslink naar je partner (die
   registreert op zijn beurt zelf een account om de uitnodiging te
   aanvaarden). Klik op het belletje/de melding op het dashboard om
   pushmeldingen aan te zetten, en voeg de app toe aan je beginscherm
   (via het deelmenu van je browser) om ze als "echte" app te gebruiken.

## Stap 4 — Online betalen via Stripe (optioneel)

Sla deze stap gerust over. Zonder Stripe blijft de schuldenpagina gewoon
werken als boekhouding — je markeert een schuld zelf als betaald nadat je
elkaar bv. via Payconiq hebt uitbetaald. Met Stripe kan iedereen zijn eigen
rekening koppelen zodat een partner met één klik rechtstreeks kan uitbetalen.

1. Maak een gratis account op [stripe.com](https://stripe.com) en activeer
   **Connect** (staat standaard al klaar voor gebruik in testmodus).
2. Ga naar **Developers > API keys** en kopieer de **Secret key** (begin met
   de testmodus-sleutel `sk_test_...` om alles eerst uit te proberen zonder
   dat er echt geld beweegt).
3. Zet die in Vercel als `STRIPE_SECRET_KEY` en doe een nieuwe deploy (of
   **Redeploy** vanuit het Vercel-dashboard).
4. Ga naar **Developers > Webhooks > Add endpoint**, vul als URL
   `https://jouw-app.vercel.app/api/stripe/webhook` in, en kies het event
   `checkout.session.completed`. Stripe toont je daarna een **signing
   secret** (`whsec_...`) — zet die in Vercel als `STRIPE_WEBHOOK_SECRET` en
   deploy opnieuw.
5. Zodra beide waarden ingesteld zijn, verschijnt er voor iedereen een
   "Stel online betalen in"-knop op de **Account**-pagina. Test dit eerst
   zelf in Stripe's testmodus (Stripe's testkaartnummers vind je in hun
   documentatie) voor je overschakelt naar een live sleutel (`sk_live_...`)
   met een echt, geverifieerd Stripe-account.
6. Wanneer je klaar bent voor echt geld: vervang de test-sleutels door de
   live-sleutels (en maak ook een live-webhook aan met dezelfde stappen),
   en vraag ieder die al eerder gekoppeld had om dat in testmodus opnieuw
   te doen — testmodus- en live-koppelingen zijn volledig gescheiden bij
   Stripe.

## Beperkingen om te kennen

- **Gratis Supabase-project pauzeert na 1 week zonder activiteit.** Als jij en
  je partner de app dagelijks gebruiken is dat geen probleem. Gebruik je hem
  een tijd niet, dan moet je het project in het Supabase-dashboard handmatig
  weer activeren (kost één klik).
- **Herinneringen gaan via pushmeldingen, niet via e-mail.** Dat vereist dat
  je pushmeldingen één keer aanzet in de app (en de app het liefst aan je
  beginscherm toevoegt). Directe meldingen (iets in te dienen, af te keuren,
  betwist) komen meteen. De dagelijkse "dit staat nog open"-herinnering komt
  via Vercel's gratis cron-systeem, dat maar **één keer per dag** mag draaien
  en tot ongeveer een uur vroeger of later kan afgaan dan het ingestelde
  tijdstip (06:00) — geen reden tot zorg, maar zo weet je waarom het niet op
  de minuut nauwkeurig is.
- **Wachtwoord-reset gaat via e-mail**, zoals bij vrijwel elke app. Zolang
  Supabase e-mails kan versturen (standaard aan) werkt dat gewoon.
- **Live camera vereist HTTPS.** Werkt vanzelf op je Vercel-URL en op
  `localhost`. Weigert iemand de camera, of is ze niet beschikbaar, dan valt
  de app terug op een gewone bestandskiezer — zwakker bewijs, maar de
  check-in blijft mogelijk.
- **De betwistingsflow lost oneerlijkheid niet volledig op** — bij een
  betwisting is het uiteindelijk nog steeds een partner die beslist. Met
  meerdere partners wordt dat wel steviger dan met één.
- **Next.js-versie**: de app draait op Next.js 14, de laatste versie in die
  reeks (14.2.35). Er zijn ondertussen bekende kwetsbaarheden gemeld tegen
  oudere Next.js-versies waarvan de echte oplossing pas in versie 16 zit —
  een upgrade van 14 naar 16 is een grotere ingreep (met kans op breekende
  wijzigingen) die ik bewust niet zomaar tijdens deze bouwronde heb gedaan.
  Iets om op de radar te houden voor een aparte upgrade-ronde.
- **Stripe-koppeling gaat momenteel uit van België** (het land staat vast op
  "BE" bij het aanmaken van een Stripe-account). Voor gebruikers in een ander
  land moet die ene regel in `app/api/stripe/connect/route.js` aangepast
  worden — geen grote ingreep, maar wel iets om te weten voor je dit met
  mensen buiten België gebruikt.

## Structuur van de code

- `supabase/schema.sql` — alle database-tabellen, beveiliging en logica
  (check-ins automatisch aanmaken, verlopen check-ins afhandelen, straffen
  aanmaken). Dit is het hart van de app.
- `app/` — de pagina's (Next.js App Router)
- `app/api/notify/` — stuurt een directe pushmelding na een actie (indienen,
  afkeuren, betwisten, beslechten)
- `app/api/cron/daily/` — de dagelijkse taak: nieuwe check-ins aanmaken,
  verlopen check-ins afhandelen, herinneringspushes sturen
- `app/api/stripe/connect/` — start/hervat de Stripe-onboarding van een
  gebruiker die geld wil kunnen ontvangen
- `app/api/stripe/pay/` — maakt een Stripe Checkout-sessie aan om een
  openstaande schuld te betalen
- `app/api/stripe/webhook/` — de enige plek die een schuld automatisch op
  "betaald" zet na een echte Stripe-betaling
- `app/account/` — de pagina waar je je eigen Stripe-koppeling instelt
- `lib/supabase/` — de verbinding met Supabase (`client.js` voor de browser,
  `server.js` voor ingelogde serverpagina's, `admin.js` voor de service_role
  key — enkel server-side, nooit importeren in een client-component)
- `lib/webpush.js`, `lib/notify.js` — pushmeldingen versturen
- `lib/stripe.js` — de Stripe-verbinding (geeft `null` terug zolang er geen
  `STRIPE_SECRET_KEY` is ingesteld, zodat online betalen echt optioneel blijft)
- `public/manifest.json`, `public/sw.js`, `public/icons/` — maken de app
  installeerbaar (PWA) en verwerken binnenkomende pushmeldingen
- `app/globals.css` — het volledige kleuren-/stijlsysteem op één plek
  (Archer-blauw als accentkleur, Inter als lettertype, zelf meegeleverd via
  het `@fontsource/inter`-pakket zodat een build niet van Google Fonts
  afhankelijk is)
- `vercel.json` — plant de dagelijkse taak in bij Vercel
- `middleware.js` — houdt je ingelogd en stuurt niet-ingelogde bezoekers naar
  `/login`
