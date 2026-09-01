# Appointment System

Appointment System eshte aplikacion web per rezervimin dhe menaxhimin e termineve mjekesore. Sistemi eshte ndertuar me React, Vite dhe Supabase, dhe mbeshtet tre role kryesore: pacient, mjek dhe administrator.

## Qellimi i projektit

Qellimi i projektit eshte te ofroje nje sistem praktik ku pacientet mund te rezervojne termine online, mjeket mund te menaxhojne terminet e tyre, ndersa administratori mund te kontrolloje organizimin e klinikes, oraret dhe statistikat.

## Funksionalitetet kryesore

- Regjistrim dhe kyqje me Supabase Auth
- Zgjedhje roli gjate regjistrimit: pacient ose mjek
- Administrator i kontrolluar permes email-it ose metadata ne Supabase
- Dashboard i ndare sipas rolit te perdoruesit
- Rezervim, editim dhe anulim i termineve nga pacienti
- Zgjedhje e klinikes para zgjedhjes se mjekut
- Filtrim i mjekeve sipas klinikes dhe specialitetit
- Historik i termineve te pacientit
- Panel i vecante per mjekun
- Mjeku mund te shikoje terminet e veta
- Mjeku mund te ndryshoje statusin e terminit
- Mjeku mund te shtoje shenime pas vizites
- Panel administrativ me tabs te organizuar
- Menaxhim i mjekeve nga administratori
- Menaxhim i klinikave, departamenteve dhe specialiteteve
- Orar dinamik per secilin mjek
- Bllokim i oreve per pauza ose takime tjera
- Oret e bllokuara nuk shfaqen te pacienti gjate rezervimit
- Raporte dhe statistika per administratorin
- RLS policies ne Supabase per qasje sipas rolit
- Logout per panelin e mjekut dhe administratorit
- Foto te mjekeve ne panelin e pacientit

## Rolet ne sistem

### Pacient

Pacienti mund te:

- regjistrohet dhe kyqet ne sistem
- zgjedhe kliniken, mjekun, daten dhe oren
- rezervoje termin
- editoje terminin e vet
- anuloje terminin e vet
- shikoje terminet aktive dhe historikun
- perditesoje profilin personal

### Mjek

Mjeku mund te:

- kyqet ne panelin e mjekut
- shikoje vetem terminet qe lidhen me emrin e tij
- filtroje terminet sipas statusit
- konfirmoje, anuloje ose shenoje si te perfunduar nje termin
- shtoje shenime pas vizites

### Administrator

Administratori mund te:

- shikoje dashboard-in administrativ
- menaxhoje terminet e klinikes
- ndryshoje statuset e termineve
- shtoje, editoje dhe fshije mjeke
- menaxhoje klinikat, departamentet dhe specialitetet
- caktoje oraret e punes per mjeket
- bllokoje ore per pauza ose takime tjera
- shikoje raporte dhe statistika

## Teknologjite e perdorura

- React
- Vite
- React Router
- Supabase Auth
- Supabase Database
- Supabase Row Level Security
- CSS

## Struktura e projektit

- `src/pages/Login.jsx`: faqja e kyqjes
- `src/pages/Signup.jsx`: faqja e regjistrimit me zgjedhje roli
- `src/pages/Dashboard.jsx`: paneli i pacientit
- `src/pages/DoctorDashboard.jsx`: paneli i mjekut
- `src/pages/AdminDashboard.jsx`: paneli i administratorit
- `src/utils/roles.js`: logjika per identifikimin e roleve
- `src/context/AuthContext.jsx`: menaxhimi i sesionit
- `src/supabaseClient.js`: lidhja me Supabase
- `docs/supabase-market-upgrade.sql`: tabela/kolona/policies per terminet
- `docs/clinic-organization.sql`: klinika, departamente, specialitete dhe mjeke
- `docs/doctor-schedules.sql`: oraret e mjekeve dhe bllokimet e oreve
- `docs/email-notifications.sql`: log-et per email reminders
- `docs/email-notifications.md`: udhezime per email notifications
- `docs/demo-plan.md`: plan per prezantim

## Supabase

Per funksionim te plote duhet te ekzekutohen keto SQL scripts ne Supabase SQL Editor:

1. `docs/supabase-market-upgrade.sql`
2. `docs/clinic-organization.sql`
3. `docs/doctor-schedules.sql`
4. `docs/email-notifications.sql`, nese perdoren email reminders

Keto scripts krijojne ose perditesojne tabelat, kolonat dhe RLS policies per qasje te kontrolluar.

## Konfigurimi lokal

Krijo nje file `.env` ne root te projektit:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_DOCTOR_EMAILS=doctor@example.com
VITE_ADMIN_EMAILS=admin@example.com
```

Pastaj instalo dependencies:

```bash
npm install
```

Nise projektin:

```bash
npm run dev
```

## Build dhe lint

Per kontroll te kodit:

```bash
npm run lint
```

Per build final:

```bash
npm run build
```

## Testimi final

Para dorezimit, sistemi duhet testuar me tre llogari:

- nje pacient
- nje mjek
- nje administrator

Kontrollet kryesore:

- pacienti rezervon, editon dhe anulon termin
- pacienti zgjedh kliniken dhe mjekun
- mjeku e sheh terminin e vet
- mjeku ndryshon statusin dhe shton shenime
- administratori menaxhon mjeket dhe klinikat
- administratori cakton orare
- administratori bllokon ore
- ora e bllokuar nuk shfaqet te pacienti
- raportet dhe statistikat shfaqen ne admin dashboard

## Statusi i projektit

Projekti eshte funksional dhe i gatshem per prezantim ose dorezim. Funksionalitetet kryesore nga propozimet jane implementuar, perfshire ndarjen e roleve, panelin e mjekut, menaxhimin administrativ, oraret dinamike, historikun e termineve, raportet dhe sigurine me RLS.
