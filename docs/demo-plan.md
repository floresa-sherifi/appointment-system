# Demo Plan

## Projekti dhe audienca

Appointment System eshte nje aplikacion web per paciente qe duan te rezervojne dhe menaxhojne termine mjekesore online ne menyre me te shpejte dhe me te qarte. Ai i sherben perdoruesve qe kane nevoje per login personal, liste mjekesh, zgjedhje oresh te lira dhe nje pamje te organizuar te termineve te tyre.

## Qellimi i prezantimit

Ne 5 deri ne 7 minuta do te tregoj:

- problemin qe zgjidh aplikacioni
- flow-n kryesor nga hyrja ne sistem deri te rezervimi i terminit
- si perdor Supabase per autentikim dhe ruajtje te termineve
- si jane trajtuar rastet baze si oraret e zena, loading, error dhe offline state

## Flow kryesor i demos

1. Hap faqen e login-it dhe shpjego shkurt se aplikacioni perdor autentikim me Supabase.
2. Bej login me nje llogari testuese dhe kalo te dashboard.
3. Trego dashboard-in: terminin e ardhshem, numrin total te termineve dhe statusin online/offline.
4. Rezervo nje termin te ri duke zgjedhur daten, mjekun dhe oren.
5. Trego se oret e zena nuk ofrohen si opsione per te njejtin mjek dhe date.
6. Hap listen e termineve dhe trego qe terminin mund ta editosh ose ta fshish.
7. Kalo te seksioni i doktoreve dhe demonstro kerkimin sipas emrit ose specialitetit.
8. Trego seksionin e profilit dhe ndryshimin e emrit.
9. Mbylle me AI assistant duke bere nje pyetje te shpejte si "Kur e kam terminin tim te ardhshem?"

## Pjeset teknike qe do t'i shpjegoj shkurt

- React Router perdoret per ndarjen e faqeve dhe `ProtectedRoute` mbron dashboard-in.
- Supabase Auth perdoret per signup, login, logout dhe ruajtjen e emrit te perdoruesit.
- Tabela `appointments` ruan terminet per secilin perdorues me `user_id`.
- Orari i lire llogaritet duke lexuar terminet ekzistuese per mjekun dhe daten e zgjedhur.
- Dashboard-i ka gjendje `loading`, `error`, `success` dhe `offline` per nje experience me te qarte.
- AI assistant nuk eshte LLM i jashtem; ai jep pergjigje lokale bazuar ne gjendjen aktuale te aplikacionit.

## Cfare kam kontrolluar para demos

- Aplikacioni niset lokalisht pa error ne startup.
- Login dhe signup funksionojne me Supabase.
- Dashboard-i hapet vetem pas autentikimit.
- Rezervimi i terminit shton te dhenat ne databaze.
- Editimi dhe fshirja e terminit funksionojne.
- Oret e zena nuk lejojne rezervim te dyfishte per te njejtin mjek dhe date.
- Kerkimi i doktoreve dhe perditesimi i profilit funksionojne.
- `npm run build` kalon me sukses.
- Live URL eshte testuar ne browser para prezantimit.

## Plani B nese live demo deshton

- Prezantimi vazhdon ne versionin lokal me `npm run dev`.
- Mbaj gati nje account testues per login te shpejte.
- Mbaj gati databazen me disa termine ekzistuese qe te mos humbet kohe gjate demos.
- Nese interneti deshton, shpjegoj UI, flow-n dhe kodin kryesor nga versioni lokal.
- Mbaj screenshot-e ose nje screen recording te shkurter si backup per rastin me te keq.

## Mbyllja e prezantimit

Ne fund do te theksoj se vlera e projektit qendron te nje eksperience e thjeshte per pacientin: login i sigurt, rezervim i qarte, kontroll i termineve personale dhe nderfaqe qe e ben procesin me te organizuar se rezervimi manual.
