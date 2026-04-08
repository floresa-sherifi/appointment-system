#  Appointment System

Një aplikacion web për rezervimin e termineve me mjekë, i zhvilluar me React dhe Supabase, dhe i deploy-uar në Vercel.

---

##  Live Demo
 https://your-vercel-link.vercel.app

---

##  Përshkrimi

Ky aplikacion mundëson:
- Regjistrim dhe login të përdoruesve
- Rezervim termineve me mjekë
- Shfaqje të termineve personale
- Fshirje të termineve
- Sugjerime automatike për orë të lira
- AI asistent për ndihmë

---

## 🛠 Teknologjitë

-  React
-  Supabase (Auth + Database)
-  Vercel (Deploy)
-  CSS

---

##  Authentication

- Login / Register me Supabase
- Secili përdorues sheh vetëm të dhënat e veta

---

## 🗄 Database

Tabelat e përdorura:

### `appointments`
- id
- user_id
- date
- time
- doctor

### `doctors`
- id
- name

---

##  Funksionalitetet

 Rezervim termine  
 Shfaqje e termineve  
 Fshirje termineve  
 Orë dinamike (nuk lejon rezervim të dyfishtë)  
 Sidebar me profil  
 Logout  

---

##  AI Feature

Aplikacioni përfshin një AI asistent bazik që:
- Sugjeron terminin më të afërt
- Rekomandon mjekë
- Jep ndihmë për përdoruesin

---

##  Edge Cases

Janë implementuar:

-  Input bosh → ndalon submit
-  Double submit → parandalohet
-  Network error → mesazh error
-  Retry button
-  Offline detection
-  App nuk crash-on

---

##  Loading & Error States

- Loading gjatë fetch
- Error messages të qarta
- Success feedback për user

---

## 📦 Instalimi lokal

```bash
git clone https://github.com/username/appointment-system.git
cd appointment-system
npm install
npm run dev
