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

## App draaien (op een Mac)

Benodigd: macOS met Xcode (inclusief de iOS Simulator en command line tools), Node.js 20 of nieuwer en CocoaPods.

```bash
cd app
npm install
npx expo run:ios
```

`npx expo run:ios` maakt de map `ios/` aan, installeert de pods, bouwt de app en start hem in de simulator.
Expo Go werkt niet: de app gebruikt achtergrondlocatie en heeft dus een eigen build nodig.

**Op je eigen iPhone:** sluit hem aan via USB en kies hem met

```bash
npx expo run:ios --device
```

Bij de eerste keer moet je in Xcode (`app/ios/Rondje.xcworkspace`) onder *Signing & Capabilities* je Apple-team kiezen.
Zet op de iPhone daarna *Instellingen → Privacy en beveiliging → Ontwikkelaarsmodus* aan.

**Locatie testen in de simulator:** in het menu *Features → Location → City Run* (of *Freeway Drive*).

**Achtergrondlocatie:** kies bij de vraag om locatietoegang *Altijd*. Anders stopt de meting als je scherm uit gaat.

Na het wijzigen van `app.json` of het toevoegen van native pakketten opnieuw bouwen met `npx expo run:ios`.
Alleen JavaScript aangepast? Dan is `npx expo start` genoeg zolang de build op je toestel staat.

## Tracking

- `Accuracy.BestForNavigation`, `distanceInterval: 5`, `activityType: Fitness`
- Punten met een onnauwkeurigheid boven 30 m worden genegeerd
- Afstand via haversine tussen opeenvolgende punten
- De lopende run staat in AsyncStorage, zodat hij een herstart van de app overleeft
- Runs korter dan 10 m worden niet opgeslagen

## Supabase

`supabase/schema.sql` bevat `profiles`, `activities` (met `source`: `own_gps`, `apple_health`, `garmin`, `fit_import`
en uniek op `user_id + source + external_id`) en `activity_points`, met row level security zodat iedere gebruiker alleen eigen data ziet.
Uitvoeren in de SQL-editor van je Supabase-project. De app gebruikt dit in fase 1 nog niet.
