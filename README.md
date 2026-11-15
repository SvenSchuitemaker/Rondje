# rondje

Elk rondje telt.

Hardloop-app voor iPhone, gebouwd met Expo (React Native) + TypeScript.

## Structuur

```
app/                  Expo-project
  App.tsx             Fonts laden + tabs (Run, Geschiedenis)
  index.ts            Registreert de achtergrondtaak vóór de app start
  src/tracking/       GPS-tracking op de achtergrond (expo-task-manager)
  src/screens/        Run- en Geschiedenis-scherm
  src/lib/            Haversine, opmaak, opslag (AsyncStorage)
supabase/schema.sql   Tabellen + row level security voor later
```

## Snel testen met Expo Go (gratis, Windows + iPhone)

Geen Mac en geen Apple Developer-account nodig.

1. Installeer **Expo Go** uit de App Store op je iPhone.
2. Op je laptop:
   ```powershell
   cd app
   npm install
   npx expo start --go
   ```
3. Scan de QR-code met de Camera-app van je iPhone. Laptop en iPhone moeten op hetzelfde wifi-netwerk zitten
   (lukt dat niet: `npx expo start --go --tunnel`).

**Beperking:** Expo Go kan op iOS geen locatie op de achtergrond bijhouden. In Expo Go meet Rondje daarom alleen
zolang de app open is en houdt het scherm aan tijdens een run. Voor meten met je scherm uit is een eigen build nodig (hieronder).

## Eigen build vanaf Windows (achtergrondlocatie)

De iOS-app wordt in de cloud gebouwd met EAS Build en daarna op je iPhone gezet.
Expo Go is niet genoeg: de app gebruikt achtergrondlocatie en heeft een eigen build nodig.

**Wat je nodig hebt**

- Node.js 20 of nieuwer op je laptop
- Een gratis Expo-account (expo.dev)
- Een betaald Apple Developer-account (99 dollar per jaar). Zonder dit kun je geen eigen build op een iPhone zetten.

**Eenmalig: development build maken**

```powershell
cd app
npm install
npx eas-cli@latest login
npx eas-cli@latest device:create        # registreert je iPhone; open de link op je iPhone
npx eas-cli@latest build --profile development --platform ios
```

EAS vraagt om in te loggen met je Apple-ID en regelt de certificaten zelf.
Als de build klaar is (ongeveer 15 minuten), open je de link of QR-code op je iPhone en installeer je de app.
Zet op de iPhone *Instellingen → Privacy en beveiliging → Ontwikkelaarsmodus* aan.

**Daarna: ontwikkelen**

```powershell
cd app
npx expo start
```

Open Rondje op je iPhone en scan de QR-code. Laptop en iPhone moeten op hetzelfde wifi-netwerk zitten
(lukt dat niet, gebruik dan `npx expo start --tunnel`). Wijzigingen in de code zie je direct.

Alleen na het wijzigen van `app.json` of het toevoegen van native pakketten bouw je opnieuw met
`npx eas-cli@latest build --profile development --platform ios`.

**Locatie:** kies bij de vraag om locatietoegang *Altijd*, anders stopt de meting als je scherm uit gaat.

## App draaien op een Mac

Met Xcode en CocoaPods kan het ook lokaal:

```bash
cd app
npm install
npx expo run:ios            # simulator
npx expo run:ios --device   # aangesloten iPhone
```

Locatie testen in de simulator: *Features → Location → City Run*.

## Tracking

- `Accuracy.BestForNavigation`, `distanceInterval: 5`, `activityType: Fitness`
- Punten met een onnauwkeurigheid boven 30 m worden genegeerd
- Afstand via haversine tussen opeenvolgende punten
- De lopende run staat in AsyncStorage, zodat hij een herstart van de app overleeft
- Runs korter dan 10 m worden niet opgeslagen
- Pauze: GPS blijft aan, maar punten tellen niet mee; over een pauze heen wordt geen afstand opgeteld
- Tijd per km: het moment van elke kilometergrens wordt geïnterpoleerd tussen de twee GPS-punten eromheen, zonder pauzetijd
- Route op de kaart met `react-native-maps` (Apple Maps, geen API-sleutel nodig)

## Supabase (account en synchronisatie)

Zonder Supabase werkt de app gewoon, maar dan staan je runs alleen op je telefoon.
Met Supabase log je in met een code per e-mail en worden je runs automatisch opgeslagen en opgehaald.

**1. Project aanmaken**

1. Maak een gratis project aan op supabase.com.
2. Open de **SQL Editor**, plak de inhoud van `supabase/schema.sql` en klik op *Run*.
   Had je `schema.sql` al eerder uitgevoerd? Voer dan alleen `supabase/migrations/002_pauzes_en_segmenten.sql` uit.

**2. Inlogcode in de e-mail zetten**

Standaard stuurt Supabase een inloglink. Rondje werkt met een code, want links openen niet goed in Expo Go.

1. Ga naar *Authentication → Emails* (of *Email Templates*) en open **Magic Link**.
2. Zet in de tekst de code erbij, bijvoorbeeld:
   ```html
   <h2>Je inlogcode voor rondje</h2>
   <p>Vul deze code in de app in: <strong>{{ .Token }}</strong></p>
   ```
3. Doe hetzelfde bij **Confirm signup**. Die mail krijg je de eerste keer dat je inlogt.

Let op: de ingebouwde mailserver van Supabase verstuurt maar een paar e-mails per uur. Voor testen is dat genoeg.

**3. Gegevens in de app zetten**

Kopieer `app/.env.example` naar `app/.env.local` en vul in:

```
EXPO_PUBLIC_SUPABASE_URL=https://<jouw-project>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<publishable key of anon key>
```

Beide staan in Supabase onder *Project Settings → API* (of de knop *Connect*).
Dit is de publieke sleutel: veilig om in de app te zetten, de beveiliging zit in row level security.
Gebruik **nooit** de `service_role`- of secret key. `.env.local` staat in `.gitignore` en komt niet in git.

Start daarna opnieuw met `npx expo start --go --clear` en log in via de tab **Account**.

**Hoe het synchroniseren werkt**

- Na inloggen, na elke opgeslagen run en als je de app opent, of met *Nu synchroniseren*
- Nieuwe lokale runs gaan naar `activities` en `activity_points` (uniek op gebruiker + bron + `external_id`, dus nooit dubbel)
- Runs die alleen in Supabase staan, bijvoorbeeld na een herinstallatie, worden opgehaald
- Een verwijderde run wordt ook uit Supabase verwijderd, zodra er weer verbinding is
- Row level security zorgt dat iedere gebruiker alleen eigen data ziet
