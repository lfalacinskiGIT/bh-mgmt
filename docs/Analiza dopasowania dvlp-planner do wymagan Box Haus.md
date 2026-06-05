# Analiza dopasowania dvlp-planner do wymagan Box Haus

Data: 2026-06-05

## 1. Cel dokumentu

Dokument porownuje wymagania klienta Box Haus (ekonomika kontraktow) z aktualnymi mozliwosciami projektu dvlp-planner i wskazuje:

1. Co mozemy wykorzystac 1:1.
2. Co mozemy wykorzystac po modyfikacjach.
3. Co trzeba zbudowac od zera.

## 2. Szybkie podsumowanie

- dvlp-planner jest dobra baza pod warstwe zarzadcza: ma gotowe API, dashboard finansowy per projekt, statusy ryzyka, filtrowanie, eksport, RBAC i integracje Dataverse.
- Najwieksza luka dotyczy modelu kosztow kontraktowych Box Haus: brak silnika alokacji kosztow produkcji/ekip/floty/prowizji oraz brak natywnej integracji z Comarch ERP Optima i magazynami wirtualnymi.
- W obecnym stanie projekt liczy koszty projektowe uproszczonym modelem (w tym placeholder stawki godzinowej 100 PLN), wiec wyniki nie sa jeszcze gotowe na docelowy rachunek kontraktowy klienta.

## 3. Co juz mamy i mozemy wykorzystac 1:1

### 3.1. Dashboard finansowy portfolio kontraktow/projektow

Do bezposredniego reuse:

- API agregujace finanse projektow: bucket, okres, tracked-only, KPI, alerty, lista projektow.
- Widok "Projects Finance" z KPI, tabela, alertami i wykresami.
- Statusy ryzyka (critical/at-risk/healthy/no-data) i logika alertow.

Dowody w kodzie:

- app/api/dashboard/projects-finance-summary/route.ts
- app/dashboard/page.tsx
- components/dashboard/projects-finance-view.tsx
- components/dashboard/projects-finance-kpi-cards.tsx
- components/dashboard/projects-finance-table.tsx
- lib/finance-utils.ts

### 3.2. Podstawowe metryki ekonomiki projektu

Do bezposredniego reuse:

- Budzet, wykorzystanie budzetu, wynik netto, marza %, alert count.
- Agregacja i sortowanie po projekcie/kliencie/statusie.

Dowody w kodzie:

- types/dashboard-finance.ts
- components/dashboard/projects-finance-table.tsx
- app/api/dashboard/projects-finance-summary/route.ts

### 3.3. Warstwa danych i bezpieczenstwo

Do bezposredniego reuse:

- Gotowe mapowania encji Dataverse (projekty, faktury, rejestr czasu, profile zasobow, stawki kosztowe, actual costs).
- API route-level authorization przez permission checks.
- Model rol App Roles (Administrator/Board/Finance/Viewer).

Dowody w kodzie:

- lib/dataverse-config.ts
- app/api/dashboard/summary/route.ts
- app/api/actual-costs/route.ts
- lib/authz.ts
- docs/ROLES.md

### 3.4. Ewidencja kosztow rzeczywistych (manual/operacyjna)

Do bezposredniego reuse:

- Moduly "Actual Costs" (CRUD + filtry + kategorie + flagowanie + trendy).
- To moze byc baza pod formatki zarzadcze klienta (narzuty, koszty ekip, koszty techniczne).

Dowody w kodzie:

- app/finance/actual-costs/page.tsx
- components/finance/actual-costs-table.tsx
- app/api/actual-costs/route.ts

## 4. Matryca dopasowania wymagan Box Haus

Legenda:

- 1:1 = gotowe praktycznie bez zmian.
- Czesc = jest baza, ale trzeba rozbudowac.
- Brak = funkcjonalnosc do zbudowania.

| Wymaganie klienta | Ocena | Uzasadnienie |
|---|---|---|
| Karta kontraktu (wartosc umowna, przychody, koszty, marza, zapas marzy) | Czesc | Jest portfolio per projekt i metryki marzy, ale brak dedykowanej karty kontraktu z pelnym modelem Box Haus. |
| Zestawienie kontraktow i porownywanie | 1:1 | Tabela projektow z sortowaniem, filtrowaniem, statusami i eksportem juz istnieje. |
| Podsumowanie linii biznesowych | Czesc | Sa agregacje po kliencie/statusie; brak natywnego wymiaru "linia biznesowa" zgodnego z Box Haus. |
| Drilldown / audit trail kosztu kontraktu | Czesc | Sa szczegoly i moduly kosztowe, ale brak jednego, spojnego audit trail laczacego wszystkie zrodla kosztu kontraktu. |
| Integracja z Optima (zapisy zrodlowe) | Brak | Brak gotowego konektora/integracji do Comarch ERP Optima. |
| Magazyny wirtualne jako koszt bezposredni | Brak | Brak modelu i feedu magazynow wirtualnych w obecnym kodzie. |
| Rozliczenie wynagrodzen per kontrakt wg czasu pracy | Czesc | Istnieja time entries + resource profile + cost rates, ale model payroll nie jest jeszcze zgodny z wymaganym sourcingiem z listy plac. |
| Rozliczenie produkcji wg stawek narzutu | Brak | Brak silnika alokacji kosztow produkcji na kontrakt. |
| Rozliczenie ekip/floty/narzedzi (narzuty) | Brak | Brak dedykowanego modelu narzutow ekip/floty/narzedzi i reguly alokacji po godzinach ekip. |
| Prowizje handlowe kalkulacyjne | Brak | Brak modulu naliczania prowizji per kontrakt wg stawek. |
| Pozycje poza kontraktami / niealokowane | Czesc | Da sie odwzorowac przez kategorie i kosztowe wpisy, ale nie ma zamknietego modelu reconcile kontrakt vs poza kontraktami. |
| Kontrola ryzyka podwojnego ujecia (KWS) | Brak | Brak dedykowanych kontroli reguly KWS i mechanizmow anty-dublet na poziomie modelu kontraktowego. |

## 5. Najwazniejsze luki funkcjonalne

### 5.1. Luki danych i integracji

1. Brak zasilania z Comarch ERP Optima.
2. Brak zasilania kosztami z magazynow wirtualnych.
3. Brak dedykowanych formatow importu dla list plac i ewidencji czasu specyficznej dla Box Haus.

### 5.2. Luki modelu rozliczeniowego

1. Brak silnika alokacji kosztow produkcji.
2. Brak silnika alokacji kosztow ekip/floty/narzedzi.
3. Brak kalkulacji prowizji handlowych.
4. Brak warstwy kontroli podwojnego ujecia (KWS).

### 5.3. Luki raportowe

1. Brak dedykowanego widoku "Karta kontraktu" z pelnym przekrojem Box Haus.
2. Brak raportu "ekonomika kontraktow + pozycje poza kontraktami + uzgodnienie" (opcja 1 klienta).
3. Brak oddzielnego strumienia P&L z obrotowki (opcja 2 klienta).

## 6. Obszary ryzyka (techniczne i biznesowe)

1. Uproszczona kalkulacja kosztow projektowych w obecnym API projects-finance (placeholder stawka godzinowa) moze zafalszowac rentownosc.
2. Roznice definicji "kontrakt" vs "projekt" moga wymagac osobnej encji lub twardej normalizacji modelu.
3. Bez polityki anti-double-counting (KWS) istnieje realne ryzyko blednych marz.
4. Integracje z Optima beda krytyczne dla wiarygodnosci wyniku i wymagaja osobnego strumienia ETL.

## 7. Rekomendacja: jak wykorzystac dvlp-planner jako baze makiety

### 7.1. Zakres makiety v1 (na bazie istniejacego kodu)

Do pokazania klientowi szybko:

1. Dashboard kontraktowy (fork z Projects Finance).
2. Lista kontraktow z alertami i eksportem.
3. Wstepna karta kontraktu (na danych testowych/mocked).
4. Sekcja "Koszty rzeczywiste" jako zaplecze formatek zarzadczych.

### 7.2. Elementy do domodelowania w makiecie (wizualnie i logicznie)

1. Bloki kosztowe kontraktu:
   - magazyny wirtualne,
   - wynagrodzenia,
   - produkcja,
   - ekipy/flota/narzedzia,
   - prowizje,
   - niealokowane.
2. Wskaznik "zapas marzy" oparty o wartosc umowna.
3. Audit trail zrodla kazdej kwoty.
4. Widok uzgodnienia (kontrakty vs poza kontraktami).

## 8. Co jest do implementacji od zera (lista minimalna)

1. Konektor/integracja do Comarch ERP Optima (zapisy zrodlowe + magazyny wirtualne).
2. Silnik alokacji kosztow produkcji.
3. Silnik alokacji kosztow ekip/floty/narzedzi.
4. Modul prowizji handlowych.
5. Mechanizm kontroli KWS / anti-double-counting.
6. Raport uzgodnieniowy (opcja 1 klienta).
7. Ewentualnie niezalezny P&L z obrotowki (opcja 2).

## 9. Co mozna zrobic bezpiecznie w kolejnym kroku

1. Opracowac docelowy model danych kontraktu (encje, klucze, relacje, slowniki).
2. Zaprojektowac makiete UX 3 ekranow:
   - karta kontraktu,
   - lista kontraktow,
   - uzgodnienie i audit trail.
3. Zdefiniowac kontrakty integracyjne ETL (Optima + payroll + timesheet + formatki).
4. Uzgodnic z klientem reguly alokacji i priorytet wdrozenia opcji 1/opcji 2.

## 10. Referencje techniczne (najwazniejsze)

- dvlp-planner/app/api/dashboard/projects-finance-summary/route.ts
- dvlp-planner/lib/finance-utils.ts
- dvlp-planner/components/dashboard/projects-finance-view.tsx
- dvlp-planner/components/dashboard/projects-finance-kpi-cards.tsx
- dvlp-planner/components/dashboard/projects-finance-table.tsx
- dvlp-planner/app/dashboard/page.tsx
- dvlp-planner/lib/dataverse-config.ts
- dvlp-planner/app/api/actual-costs/route.ts
- dvlp-planner/components/finance/actual-costs-table.tsx
- dvlp-planner/docs/ROLES.md

## 11. Studium przypadku: makieta uproszczona (JSON-only)

### 11.1. Zalozenia makiety

1. Brak warstwy DB i brak integracji z zewnetrznymi systemami produkcyjnymi.
2. Wszystkie dane trzymane lokalnie w plikach JSON.
3. UI i kontrolki bazujemy na dvlp-planner (reuse), tylko theme pod kolory Box Haus.
4. W menu pokazujemy wszystkie obiekty biznesowe klienta, ale aktywne sa tylko te mapujace sie 1:1 do planera.

### 11.2. Czy podejscie jest wykonalne?

Tak, podejscie jest wykonalne i dobre na etap makiety.

Powody:

1. Planner ma gotowe flow i API dla finansow i synchronizacji faktur.
2. "Sync" jest juz osobnym endpointem i mozna go podmienic na mock provider bez zmian UX.
3. Widoki dashboard/lista/raporty dzialaja na danych tabelarycznych, wiec JSON jest naturalnym zrodlem dla prototypu.
4. Model uprawnien mozna uproscic (np. 1 rola demo), bez ryzyka naruszenia logiki UI.

### 11.3. Co wykorzystujemy 1:1 w makiecie

1. Nawigacja i modulowa struktura aplikacji.
2. Widoki Finance: listy, filtry, grupowania, raporty.
3. Dashboard projects-finance i alerting.
4. Ekran i flow sync (przycisk + progress + rezultat + odswiezenie listy).

### 11.4. Jak zasymulowac integracje ERP Optima/iFirma

Rekomendacja: zachowac kontrakt API, podmienic implementacje na lokalny adapter mock.

1. UI nadal wywoluje ten sam endpoint sync.
2. Endpoint sync zamiast zewn. API:
   - generuje 1..N pseudo-losowych faktur,
   - dopisuje je do invoices.json,
   - zwraca metryki created/updated/skipped/errors.
3. Lista faktur czyta dane z invoices.json (z paginacja po stronie API dla realizmu).

Efekt: uzytkownik ma identyczne doswiadczenie jak przy realnej integracji, ale bez zaleznosci zewnetrznych.

### 11.5. Strategia danych mock (duzo danych, ale prosto)

Minimalny zestaw plikow JSON:

1. projects.json
2. contracts.json (lub rozszerzenie projects o pola kontraktowe)
3. invoices.json
4. time-entries.json
5. payroll.json
6. actual-costs.json
7. production-overheads.json
8. crews-and-fleet.json
9. commissions.json
10. business-lines.json

Zasady:

1. Seed generator (deterministyczny) do hurtowego tworzenia danych demo.
2. Rozmiar danych: docelowo min. 500-2000 faktur i 100-300 kontraktow/projektow, aby przetestowac UX.
3. Proste relacje po id (contractId/projectId/resourceId).
4. Wersjonowanie danych mock (np. data/mock/v1/*.json).

### 11.6. Obiekty biznesowe w menu (makieta)

Aktywne (mapowanie 1:1):

1. Kontrakty/Projekty (lista)
2. Finanse: Faktury, Koszty rzeczywiste, Inne przychody, Forecast
3. Dashboard ekonomiki
4. Settings + Sync

Widoczne, ale jako placeholder (na razie):

1. Produkcja
2. Ekipy i flota
3. Prowizje
4. Uzgodnienie/KWS

Placeholdery powinny miec status "Prototype scope" i krotki opis, ze ekran pokazuje tylko koncept.

## 12. Proponowana sciezka postepowania

### Etap 1: Skeleton makiety (1-2 dni)

Cel:

1. Uruchomic fork UI planera dla Box Haus.
2. Podmienic branding (kolory, logo, nazewnictwo).
3. Dodac/ukryc pozycje menu zgodnie ze scope makiety.

Kryterium akceptacji:

1. Nawigacja dziala, wszystkie kluczowe ekrany sa otwieralne.

### Etap 2: Mock data layer (2-4 dni)

Cel:

1. Dodac lokalny "MockDataProvider" czytajacy JSON.
2. Przepiac kluczowe endpointy read (dashboard, invoices, costs) na JSON.
3. Dodac generator danych demo.

Kryterium akceptacji:

1. Aplikacja dziala bez Dataverse i bez zewnetrznych API.
2. Dane sa stabilne po restarcie (persistencja w plikach).

### Etap 3: Mock sync ERP/iFirma (1-2 dni)

Cel:

1. Zachowac obecny UX "Synchronizuj".
2. Implementowac pseudo-sync: dopisywanie nowych rekordow do invoices.json.
3. Pokazac rezultat sync (created/updated/skipped/errors) i odswiezenie listy.

Kryterium akceptacji:

1. Klik sync zawsze daje wiarygodny efekt biznesowy na liscie faktur.

### Etap 4: Karta kontraktu v1 i mapowanie Box Haus (3-5 dni)

Cel:

1. Zbudowac prosty widok karty kontraktu na bazie istniejacych komponentow.
2. Dodac sekcje kosztowe zgodne z dokumentem klienta (na danych mock).
3. Dodac prosty "zapas marzy" i drilldown zrodla kwot.

Kryterium akceptacji:

1. Dla dowolnego kontraktu widac przychody, koszty i marze oraz breakdown.

### Etap 5: Demo hardening (1-2 dni)

Cel:

1. Ujednolicic etykiety i slownik biznesowy Box Haus.
2. Dodac 2-3 scenariusze demo (np. kontrakt rentowny, kontrakt pod ryzykiem, kontrakt z opoznionymi platnosciami).
3. Przygotowac skrypt prezentacyjny.

Kryterium akceptacji:

1. Makieta jest gotowa do warsztatu z klientem bez "martwych" flow na kluczowej sciezce.

## 13. Ryzyka i jak je kontrolowac

1. Ryzyko: mock nie odzwierciedli realnych edge-case danych z ERP.
   Mitigacja: 2-3 zbiory testowe (clean/messy/extreme).
2. Ryzyko: scope creep (proba budowy docelowego systemu zamiast makiety).
   Mitigacja: twardy podzial ekranow na active vs placeholder.
3. Ryzyko: niespojnosc definicji kontrakt vs projekt.
   Mitigacja: decyzja modelowa na starcie etapu 4 i jeden slownik pojec.

## 14. Konkluzja

Podejscie zaproponowane przez Ciebie jest sensowne, wykonalne i niskoryzykowne na etap makiety.

Najbardziej efektywna strategia:

1. Reuse UI i flow z dvlp-planner.
2. JSON-only data backend + mock sync.
3. Tylko funkcje 1:1 jako aktywne, reszta jako kontrolowany placeholder.

To pozwoli szybko pokazac klientowi wartosc i zebrac feedback przed inwestycja w docelowe integracje (Optima/KWS/alokacje).