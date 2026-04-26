# Appointment System

Appointment System eshte nje aplikacion web per rezervimin dhe menaxhimin e termineve mjekesore. Projekti eshte ndertuar me React, Vite dhe Supabase per autentikim dhe ruajtje te te dhenave.

## Cfare ofron projekti

- Regjistrim dhe login me Supabase Auth
- Dashboard i mbrojtur per perdorues te autentikuar
- Rezervim i termineve sipas dates, mjekut dhe ores
- Bllokim i oreve te zena per te shmangur rezervimet e dyfishta
- Editim dhe fshirje e termineve ekzistuese
- Liste e mjekeve me kerkim sipas emrit, specialitetit dhe qytetit
- Perditesim i profilit te perdoruesit
- AI assistant lokal per pyetje te shpejta rreth termineve dhe orareve
- Gjendje `loading`, `error`, `success` dhe njoftim kur perdoruesi eshte offline

## Teknologjite

- React 19
- Vite
- React Router
- Supabase
- CSS

## Struktura e shkurter

- `src/pages/Login.jsx` dhe `src/pages/Signup.jsx`: autentikimi
- `src/pages/Dashboard.jsx`: dashboard, rezervimet, doktoret, profili dhe AI assistant
- `src/components/ProtectedRoute.jsx`: mbrojtja e routes private
- `src/context/AuthContext.jsx`: menaxhimi i sesionit
- `src/supabaseClient.js`: konfigurimi i klientit Supabase
- `docs/demo-plan.md`: plani i prezantimit final

## Live URL

https://appointment-system-mu.vercel.app/

## Konfigurimi lokal

Krijo nje file `.env` me keto variabla:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Pastaj ekzekuto:

```bash
npm install
npm run dev
```

## Build dhe kontroll

Per kontroll lokal:

```bash
npm run build
npm run lint
```

## Demo prep

Per planin e plote te prezantimit shiko [docs/demo-plan.md](docs/demo-plan.md).
