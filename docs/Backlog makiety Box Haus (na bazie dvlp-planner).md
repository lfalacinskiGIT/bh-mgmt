# Backlog makiety Box Haus (na bazie dvlp-planner)

Data: 2026-06-05
Status: draft do realizacji
Zakres: makieta (JSON-only), bez produkcyjnych integracji ERP

## 1. Cel backlogu

Zbudowac uproszczona, wiarygodna makiete rozwiazania Box Haus na bazie istniejacego UI i flow z dvlp-planner:

1. Reuse interfejsu i nawigacji.
2. Lokalna warstwa danych (pliki JSON).
3. Mock synchronizacji faktur (pseudo-sync).
4. Aktywne tylko funkcje 1:1 z planerem, pozostale obiekty jako placeholdery.

## 2. Definicja Done (globalna)

1. Aplikacja uruchamia sie lokalnie bez Dataverse i bez zewnetrznych API.
2. Dane sa ladowane i zapisywane przez lokalne API oparte o JSON.
3. Flow Sync dodaje/aktualizuje rekordy faktur i odswieza widoki.
4. Widoki kluczowe: lista kontraktow/projektow, finanse, dashboard, karta kontraktu v1.
5. Branding Box Haus jest wdrozony (kolory, nazwy, podstawowe elementy wizualne).
6. Jest przygotowany scenariusz demo i zestawy danych testowych.

## 3. Sprint plan (proponowany)

## Sprint 1 - Foundation i branding

### Epic A: Setup makiety

1. A1. Utworzyc branch/variant "box-haus-mock" oparty o dvlp-planner.
Priorytet: P0
Estymata: 2h
Kryteria akceptacji:
1. Repo odpala sie lokalnie.
2. Jest osobny plik konfiguracyjny dla trybu makiety.

2. A2. Dodac feature flag `MOCK_MODE=true` i centralny switch providerow danych.
Priorytet: P0
Estymata: 4h
Kryteria akceptacji:
1. Przy `MOCK_MODE=true` aplikacja nie dotyka Dataverse.
2. Przy `MOCK_MODE=false` dziala dotychczasowa sciezka.

3. A3. Branding Box Haus (kolory, nazewnictwo, logo placeholder).
Priorytet: P1
Estymata: 6h
Kryteria akceptacji:
1. Sidebar, header i glowny dashboard uzywaja nowej palety.
2. Brak regresji funkcjonalnej UI.

### Epic B: Nawigacja i scope

4. B1. Uporzadkowac menu: aktywne obiekty 1:1 + placeholdery.
Priorytet: P0
Estymata: 4h
Kryteria akceptacji:
1. Aktywne: Projekty/Kontrakty, Finanse, Dashboard, Settings.
2. Placeholder: Produkcja, Ekipy i flota, Prowizje, Uzgodnienie/KWS.

5. B2. Dodac strony placeholder z opisem "Prototype scope".
Priorytet: P1
Estymata: 3h
Kryteria akceptacji:
1. Kazda pozycja placeholder ma ekran z celem i zakresem future.

## Sprint 2 - Mock data layer (JSON)

### Epic C: Struktura danych

6. C1. Zdefiniowac schemat plikow JSON v1.
Priorytet: P0
Estymata: 4h
Kryteria akceptacji:
1. Powstaje katalog np. `data/mock/v1/`.
2. Pliki: projects.json, contracts.json, invoices.json, time-entries.json, payroll.json, actual-costs.json, production-overheads.json, crews-and-fleet.json, commissions.json, business-lines.json.

7. C2. Dodac walidacje schematow (runtime, np. Zod).
Priorytet: P1
Estymata: 4h
Kryteria akceptacji:
1. Blad formatu JSON jest czytelnie raportowany.

### Epic D: Mock API read/write

8. D1. API read dla faktur, projektow, kosztow rzeczywistych, dashboard summary.
Priorytet: P0
Estymata: 10h
Kryteria akceptacji:
1. Widoki dzialaja na danych JSON.
2. Paginacja i filtrowanie zachowuja obecny kontrakt API.

9. D2. API write (minimalne) dla rekordow makietowych.
Priorytet: P1
Estymata: 8h
Kryteria akceptacji:
1. Edycje i tworzenie zapisuje sie do JSON.
2. Brak crashy przy jednoczesnych operacjach.

10. D3. Warstwa helperow I/O (atomowy zapis, backup plikow).
Priorytet: P1
Estymata: 6h
Kryteria akceptacji:
1. Zapis odporny na czesciowe uszkodzenie pliku.
2. Tworzony jest backup timestamp.

## Sprint 3 - Mock sync ERP/iFirma

### Epic E: Sync UX 1:1

11. E1. Utrzymac obecny UI sync (przycisk, progres, wynik, toasty).
Priorytet: P0
Estymata: 3h
Kryteria akceptacji:
1. UX nie odbiega od dvlp-planner.

12. E2. Podmienic backend sync na generator pseudo-losowych faktur.
Priorytet: P0
Estymata: 8h
Kryteria akceptacji:
1. Endpoint sync zwraca created/updated/skipped/errors.
2. Po sync lista faktur pokazuje nowe rekordy.

13. E3. Dodac tryby sync: "quick sync" i "zakres dat".
Priorytet: P1
Estymata: 4h
Kryteria akceptacji:
1. Dzialaja oba tryby bez zewnetrznej integracji.

14. E4. Symulacja edge-case sync (duplikaty, bledne dane, overdue).
Priorytet: P2
Estymata: 6h
Kryteria akceptacji:
1. Widoki i alerty zachowuja sie stabilnie dla danych "messy".

## Sprint 4 - Karta kontraktu v1 i dashboard Box Haus

### Epic F: Karta kontraktu (MVP)

15. F1. Stworzyc widok "Karta kontraktu" na bazie istniejacych komponentow.
Priorytet: P0
Estymata: 12h
Kryteria akceptacji:
1. Sekcje: wartosc umowna, przychody, koszty, marza, zapas marzy.
2. Widoczne podstawowe breakdowny.

16. F2. Dodac sekcje kosztowe Box Haus (mockowane):
- magazyny wirtualne,
- wynagrodzenia,
- produkcja,
- ekipy/flota/narzedzia,
- prowizje,
- niealokowane.
Priorytet: P0
Estymata: 14h
Kryteria akceptacji:
1. Kazdy blok pokazuje kwote i zrodlo danych mock.

17. F3. Drilldown / audit trail v1.
Priorytet: P1
Estymata: 10h
Kryteria akceptacji:
1. Z karty kontraktu mozna zejsc do skladnikow kwoty.

### Epic G: Dashboard i zestawienie

18. G1. Dostosowac dashboard pod slownik Box Haus.
Priorytet: P1
Estymata: 6h
Kryteria akceptacji:
1. KPI i etykiety sa biznesowo czytelne dla klienta.

19. G2. Zestawienie kontraktow z filtrami i eksportem.
Priorytet: P0
Estymata: 6h
Kryteria akceptacji:
1. Filtry i eksport dzialaja na danych mock.

## Sprint 5 - Demo hardening i warsztat

### Epic H: Jakosc demo

20. H1. Przygotowac 3 zestawy danych demo:
- happy path,
- danych niepelnych,
- danych skrajnych.
Priorytet: P0
Estymata: 8h
Kryteria akceptacji:
1. Latwe przelaczanie datasetow.

21. H2. Ujednolicic copy, etykiety i komunikaty UX.
Priorytet: P1
Estymata: 4h
Kryteria akceptacji:
1. Brak wewnetrznego slangu technicznego na ekranach biznesowych.

22. H3. Przygotowac script demo (30-45 min).
Priorytet: P0
Estymata: 3h
Kryteria akceptacji:
1. Jest gotowy scenariusz krok po kroku.

23. H4. Smoke test przed prezentacja.
Priorytet: P0
Estymata: 4h
Kryteria akceptacji:
1. Lista krytycznych flow przechodzi 100%.

## 4. Backlog techniczny przekrojowy

1. T1. Ujednolicic typy DTO dla mock API i UI (zeby uniknac rozjazdu kontraktow).
Priorytet: P0
Estymata: 6h

2. T2. Dodac mechanizm seed/reset danych mock z CLI.
Priorytet: P1
Estymata: 6h

3. T3. Logowanie operacji mock sync (audit log lokalny).
Priorytet: P2
Estymata: 4h

4. T4. Lightweight testy:
- 3 testy API,
- 2 testy komponentow,
- 1 test e2e sync.
Priorytet: P1
Estymata: 10h

## 5. Priorytety MoSCoW

Must:
1. A1, A2, B1, C1, D1, E1, E2, F1, F2, G2, H1, H3, H4.

Should:
1. A3, B2, C2, D2, F3, G1, H2, T1, T2, T4.

Could:
1. D3, E3, E4, T3.

Wont (na etap makiety):
1. Produkcyjne integracje z ERP Optima.
2. Pelny silnik KWS anti-double-counting.
3. Produkcyjne mechanizmy security/ops klasy enterprise.

## 6. Zaleznosci i kolejnosc

1. A1 -> A2 -> C1 -> D1 -> E2 -> F1/F2.
2. Branding (A3) moze isc rownolegle do C1/D1.
3. H1/H3/H4 dopiero po F i G.

## 7. Role i odpowiedzialnosci

1. Tech Lead: architektura mock layer i kontrakty API.
2. Frontend: reuse UI + karta kontraktu + dashboard.
3. Fullstack: endpointy mock read/write + sync generator.
4. Biznes/Analityk: walidacja slownika i scenariuszy demo.

## 8. Proponowany harmonogram (orientacyjny)

1. Sprint 1: 2-3 dni robocze.
2. Sprint 2: 4-5 dni roboczych.
3. Sprint 3: 2-3 dni robocze.
4. Sprint 4: 4-6 dni roboczych.
5. Sprint 5: 2-3 dni robocze.

Lacznie: ok. 3-4 tygodnie (zalezne od skladu zespolu).

## 9. Kryteria gotowosci do prezentacji klientowi

1. Demo nie wymaga zewnetrznych systemow ani recznej naprawy danych.
2. Sync pokazuje wiarygodny efekt biznesowy (nowe faktury + KPI update).
3. Karta kontraktu i dashboard odpowiadaja jezykowi biznesowemu Box Haus.
4. Placeholdery sa jasno oznaczone jako poza zakresem makiety.
