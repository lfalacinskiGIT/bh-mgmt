# Analiza dopasowania dvlp-planner do wymagan Box Haus

Data: 2026-06-05 (aktualizacja po wdrozeniu makiety w bh-mgmt/web)

## 1. Cel dokumentu

Dokument porownuje wymagania Box Haus z aktualnym stanem aplikacji makietowej i wskazuje:

1. Co jest juz dzialajace 1:1.
2. Co jest zaimplementowane czesciowo.
3. Co nadal jest luka i wymaga implementacji.
4. Jakie sa rozbieznosci miedzy poprzednia dokumentacja a rzeczywistym stanem kodu.

## 2. Kontekst i zakres porownania

To porownanie dotyczy aktualnej aplikacji makietowej w repo bh-mgmt, folder web.

Weryfikowane byly:

1. Moduly dostepne w menu i routing.
2. Ekrany biznesowe (kontrakty, raporty, czas pracy, P&L, kontrola kosztow, integracje).
3. API route dla sync, raportowania i czasu pracy.
4. Warstwa danych JSON i walidacja danych wymaganych.

## 3. Stan obecny aplikacji (moduly aktywne)

Menu i trasy aplikacji sa aktywne dla nastepujacych obszarow:

1. Pulpit
2. Sprzedaz
3. Kontrakty
4. Projekty
5. Faktury
6. Platnosci
7. Czas i zespol (trasa czas-pracy)
8. Kontrola kosztow
9. Raporty
10. P&L
11. Integracje
12. Ustawienia

Istnieje tez oddzielna trasa Zespol, ale nie jest eksponowana jako osobna pozycja menu (zostala scalona koncepcyjnie z Czas i zespol).

## 4. Zaktualizowana matryca dopasowania wymagan Box Haus

Legenda:

- 1:1 = gotowe i dzialajace w makiecie.
- Czesc = dziala, ale zakres jest uproszczony lub niepelny.
- Brak = brak dedykowanego modulu/flow.

| Wymaganie klienta | Ocena | Status obecny |
|---|---|---|
| Karta kontraktu (wartosc, przychody, koszty, marza, zapas marzy) | 1:1 | Dziala panel 360 kontraktu z zakladkami: przeglad, finanse, dokumenty, czas pracy, audit trail. |
| Zestawienie kontraktow i porownywanie | 1:1 | Dziala lista i filtrowanie kontraktow, KPI, drilldown i porownywanie na widokach raportowych. |
| Podsumowanie linii biznesowych | 1:1 | Dostepne w raportach i ekonomice kontraktow (agregacje per lineOfBusiness). |
| Drilldown / audit trail kosztu kontraktu | Czesc | Audit trail jest dostepny, ale nie wszystkie strumienie zrodlowe sa jeszcze zmaterializowane jako niezalezne moduly UI. |
| Integracja z Optima (zapisy zrodlowe) | Czesc | Dziala mock-sync i audit sync, ale brak produkcyjnego konektora ETL/API. |
| Magazyny wirtualne jako koszt bezposredni | Czesc | Obecne w modelu kosztowym i uzgodnieniach, brak oddzielnego dedykowanego modulu operacyjnego. |
| Rozliczenie wynagrodzen per kontrakt wg czasu pracy | 1:1 | Dziala modul czasu pracy z alokacja payroll na kontrakty i pozycje poza kontraktami. |
| Rozliczenie produkcji wg stawek narzutu | Czesc | Dane istnieja w mockach, ale brak dedykowanego ekranu/flow produkcyjnego. |
| Rozliczenie ekip/floty/narzedzi (narzuty) | Czesc | Dane istnieja w mockach, ale brak dedykowanego modulu UI/API. |
| Prowizje handlowe kalkulacyjne | Czesc | Dane istnieja w mockach, ale brak osobnego modulu obliczen i prezentacji prowizji. |
| Pozycje poza kontraktami / niealokowane | 1:1 | Dostepne w uzgodnieniu i bridge raportowym oraz w logice kontroli kosztow. |
| Kontrola ryzyka podwojnego ujecia (KWS) | 1:1 | Dzialaja reguly anty-dublety, ryzyka KWS i raportowanie KWS w kontroli kosztow i raportach. |

## 5. Najwazniejsze rozbieznosci poprzednia dokumentacja vs aplikacja

1. Poprzednia dokumentacja zaniża poziom wdrozenia.
- Wczesniej wiele obszarow mialo status Brak/Czesc.
- Obecnie dzialaja: karta kontraktu 360, czas pracy z payroll, KWS/uzgodnienie, P&L.

2. Referencje techniczne wskazuja historycznie dvlp-planner zamiast aktualnego bh-mgmt/web.
- To jest glowna rozbieznosc formalna i audytowa.

3. Integracje sa obecne funkcjonalnie jako mock, ale nie jako produkcyjne lacza.
- UX sync i endpointy sa gotowe.
- Brakuje rzeczywistego ETL i mapowan do systemow produkcyjnych.

4. Zespol ma osobny ekran, ale menu jest scalone jako Czas i zespol.
- Funkcjonalnosc jest dostepna.
- Nalezy utrzymac spojnosc opisu w dokumentacji i nawigacji.

## 6. Co realnie nadal jest luka

### 6.1. Luki integracyjne

1. Brak produkcyjnego konektora Comarch ERP Optima.
2. Brak produkcyjnych konektorow payroll/timesheet.
3. Brak kontraktow integracyjnych i monitoringu ETL end-to-end.

### 6.2. Luki modulowe (UI/API)

1. Brak dedykowanego modulu Produkcja (osobny ekran i flow).
2. Brak dedykowanego modulu Ekipy i flota (osobny ekran i flow).
3. Brak dedykowanego modulu Prowizje (osobny ekran i flow).

### 6.3. Luki governance

1. Brak twardego rozdzialu mock vs live na poziomie kontraktow SLA i monitoringu.
2. Brak docelowej polityki danych referencyjnych i mapowan miedzy systemami zrodlowymi.

## 7. Co mozemy wykorzystac od razu do warsztatu z klientem

1. Karta kontraktu 360 i drilldown kosztowy.
2. Raporty uzgodnieniowe: kontrakty vs poza kontraktami.
3. Kontrola KWS i anty-dublety.
4. Czas pracy + alokacja payroll.
5. P&L zarzadczy i bridge roznic.
6. Integracje mock sync (do demonstracji procesu).

## 8. Co trzeba dopracowac przed przejsciem z makiety do produktu

1. Zamienic mock-sync na realne integracje i harmonogramy zasilan.
2. Dodac dedykowane moduly: produkcja, ekipy/flota, prowizje.
3. Ujednolicic definicje kontrakt/projekt i slowniki biznesowe.
4. Zdefiniowac i wdrozyc kontrakty danych ETL + monitoring jakosci danych.

## 9. Zaktualizowana lista minimalna implementacji od zera

1. Produkcyjny konektor Optima (read + incremental sync + retry + audit).
2. Produkcyjny konektor payroll/timesheet.
3. Modul Produkcja (UI + API + reguly alokacji).
4. Modul Ekipy i flota (UI + API + reguly alokacji).
5. Modul Prowizje (UI + API + reguly naliczania).
6. Warstwa operacyjna monitoringu ETL i jakosci danych.

## 10. Zaktualizowane referencje techniczne (aktualna aplikacja)

- web/components/app-shell.tsx
- web/app/pulpit/page.tsx
- web/components/dashboard-page.tsx
- web/app/kontrakty/page.tsx
- web/components/contracts-page.tsx
- web/app/czas-pracy/page.tsx
- web/components/time-tracking-page.tsx
- web/app/api/time/summary/route.ts
- web/app/api/time/entries/route.ts
- web/app/pl/page.tsx
- web/components/profit-loss-page.tsx
- web/app/raporty/page.tsx
- web/components/reports-page.tsx
- web/app/kontrola-kosztow/page.tsx
- web/components/cost-control-page.tsx
- web/app/integracje/page.tsx
- web/components/integrations-page.tsx
- web/app/api/sync/optima/route.ts
- web/app/api/sync/ifirma/route.ts
- web/app/api/sync/audit/route.ts
- web/app/api/mock/validate/route.ts
- web/lib/mock-reporting-controls.ts
- web/lib/mock-profit-loss.ts
- web/lib/mock-time-tracking.ts
- web/lib/mock-required-data-validation.ts

## 11. Konkluzja

Aktualna makieta jest bardziej zaawansowana niz opisywala poprzednia wersja dokumentu.

Najwazniejsze wnioski:

1. Warstwa zarzadcza ekonomiki kontraktow, KWS, uzgodnien i P&L jest funkcjonalnie gotowa do demo.
2. Najwieksze luki dotycza przejscia z mock do produkcji (integracje ETL) oraz dedykowanych modulow produkcja/flota/prowizje.
3. Kolejny etap powinien koncentrowac sie na integracjach produkcyjnych i domknieciu brakujacych modulow domenowych.
