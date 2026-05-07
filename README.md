# HPF's MusicMind Pro

AI-drevet musikk-analyse app. Last opp en lydfil – Claude lytter til hele sangen og henter ut tekst, toneart, akkorder, gitar-tabs, bass-tabs og noter automatisk.

## Krav

- Node.js (versjon 18 eller nyere) – last ned fra https://nodejs.org
- En Anthropic API-nøkkel – lag konto på https://console.anthropic.com

## Installasjon

```bash
# 1. Gå inn i mappen
cd musicmind-app

# 2. Installer avhengigheter
npm install

# 3. Lag .env-fil med din API-nøkkel
cp .env.example .env
# Åpne .env og fyll inn: ANTHROPIC_API_KEY=din-nøkkel-her

# 4. Start appen
npm start
```

## Åpne appen

Gå til http://localhost:3000 i nettleseren din.

## Funksjoner

- **AI lytter til lydfilen** – Claude Opus analyserer hele lydfilen direkte
- **Tekst med akkorder** – ord for ord, med akkordnavn over riktig ord
- **Gitar-tabs** – fullstendige tabs generert av AI
- **Bass-tabs** – egne tabs for bass med G/D/A/E-strenger
- **Noteark** – visuelt noteark med piano-grep
- **Toneart og BPM** – automatisk gjenkjent fra lyden
- **Transponering** – bytt toneart med ett klikk, alle akkorder oppdateres
- **Chromatisk stemmer** – stem gitaren via mikrofon
- **Metronom** – med klikkelyd i nettleseren
- **Setliste** – organiser sanger til konsert
- **PDF-eksport** – skriv ut akkorder, tabs eller tekst
- **Live transkripsjon** – snakk inn tekst via mikrofon

## Drift / Hosting

For å gjøre appen tilgjengelig for andre (ikke bare lokalt):

### Enklest: Railway.app (gratis)
1. Gå til https://railway.app
2. Opprett nytt prosjekt fra GitHub
3. Last opp denne mappen til GitHub
4. Legg til miljøvariabelen ANTHROPIC_API_KEY i Railway-innstillingene

### Alternativ: Render.com
1. Gå til https://render.com
2. Opprett en Web Service
3. Koble til GitHub-repo
4. Sett ANTHROPIC_API_KEY som miljøvariabel

## Merk

API-nøkkelen din brukes kun på serveren – den er aldri synlig i nettleseren.
Anthropic tar betalt per token brukt. En full analyse av en sang koster ca. 0,01–0,05 USD.
