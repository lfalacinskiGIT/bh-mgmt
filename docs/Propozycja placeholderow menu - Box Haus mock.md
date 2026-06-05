# Propozycje wizualne makiety Box Haus (do akceptacji)

Data: 2026-06-05

## 1. Cel

Przygotowac kierunek wizualny, ktory:

1. Daje efekt "wow" na demo.
2. Zachowuje profesjonalny i wiarygodny charakter aplikacji B2B.
3. Utrzymuje spojnosc miedzy wszystkimi modulami (Kontrakty, Raporty, Czas i zespol, P&L, Integracje).

## 2. Zasady projektowe (stale, niezaleznie od wariantu)

1. Jeden jezyk komponentow: te same karty KPI, naglowki sekcji, tabele, panele boczne, badge statusow.
2. Jedna skala odstepow: 8 / 12 / 16 / 24 / 32 px.
3. Jedna skala typografii: 12 / 14 / 16 / 20 / 28.
4. Ruch tylko funkcjonalny: animacje wspieraja czytelnosc, nie dekoracje.
5. Priorytet czytelnosci: kontrast, hierarchia, czytelne stany hover/focus.

## 3. Trzy warianty "wow + profesjonalizm"

### Wariant A: Executive Warm (rekomendowany)

Charakter:

1. Cieply, premium, "zarzadczy".
2. Subtelne gradienty tla i delikatne cienie.
3. Akcent pomaranczowy jako kolor decyzji i akcji.

Elementy wow:

1. Hero na Pulpicie z dynamicznym "Executive Summary" (juz jest baza, rozszerzamy o lepsza kompozycje).
2. Karty KPI z delikatnym ruchem licznikow i animowanym paskiem trendu.
3. "Insight strip" pod naglowkiem: 1-2 automatyczne rekomendacje dzienne.

Ryzyko:

1. Przy zbyt wielu gradientach moze wygladac zbyt "marketingowo".

Jak kontrolujemy:

1. Gradient tylko w 1-2 sekcjach na ekranie.

### Wariant B: Industrial Precision

Charakter:

1. Bardziej techniczny, "controlling + operacje".
2. Neutralne szarosci, mocna siatka i wyrazne linie podzialu.
3. Akcent kolorystyczny tylko dla alertow i CTA.

Elementy wow:

1. Precyzyjne wykresy i mini-sparklines przy KPI.
2. "Control center" dla KWS i uzgodnien z czytelnym heatmap-like widokiem ryzyk.
3. Bardzo czytelne porownania m/m i ytd.

Ryzyko:

1. Mniejszy efekt emocjonalny na pierwsze 30 sekund demo.

Jak kontrolujemy:

1. Dodajemy mocny ekran startowy (hero + insighty), reszta bardziej analityczna.

### Wariant C: Premium Dark-Light Contrast

Charakter:

1. Ekskluzywny styl z naciskiem na tryb dark i "glass cards".
2. Kontrastowe CTA i mocny efekt wizualny.

Elementy wow:

1. Plynne przejscia dark/light.
2. Efekt "focus mode" dla prezentacji konkretnych metryk.

Ryzyko:

1. Wieksze ryzyko utraty czytelnosci i "zbyt designerskiego" odbioru.

Jak kontrolujemy:

1. Stosujemy tylko na wybranych ekranach demo, nie jako domyslny styl.

## 4. Rekomendacja

Rekomenduje Wariant A (Executive Warm), bo najlepiej laczy:

1. Efekt wow na spotkaniu z klientem.
2. Profesjonalny odbior zarzadczy.
3. Spojnosc z aktualna estetyka aplikacji.

## 5. Konkretne ulepszenia UX/UI do wdrozenia (Quick Wins)

### 5.1. Nawigacja i shell

1. Dodac sekcje "Dzisiaj" w lewym panelu: 3 najwazniejsze alerty.
2. Dodac globalny pasek kontekstu (dataset + okres + status sync).
3. Ujednolicic ikonografie i grubosc linii ikon.

### 5.2. Pulpit

1. Ujednolicic kompozycje hero + KPI + aktywnosc jako powtarzalny wzorzec dla innych ekranow.
2. Dodac mini trend przy kazdym KPI (7/30 dni).
3. Dodac sekcje "Decyzje na dzis" (max 3 punkty).

### 5.3. Kontrakty

1. W panelu 360 podbic hierarchy wizualna: overview -> finance -> czas pracy -> audit trail.
2. Dodac progress ribbon: przychod, koszt, marza, zapas marzy.
3. Dodac status timeline kontraktu (kamienie milowe).

### 5.4. Raporty i Kontrola kosztow

1. Ujednolicic dashboard ryzyka KWS i nazewnictwo severity.
2. Dodac "bridge storyboard": krok po kroku skad bierze sie roznica.
3. Dodac przycisk "Tryb prezentacji" (ukrywa techniczne detale).

### 5.5. Czas i zespol

1. Dodac widok obciazenia tygodniowego (prosty wykres slupkowy).
2. Dodac "capacity radar": kto przeciazony i jakie kontrakty sa przyczyna.
3. Zachowac filtr po nazwisku jako glowny punkt wejscia.

### 5.6. Integracje

1. Zrobic "Sync cockpit": status providerow, ostatni sync, bledy, retry.
2. Pokazac wizualny flow danych: Optima -> staging -> kontrakty/raporty.
3. Dodac historyczna os czasu sync (ostatnie 7 uruchomien).

## 6. Motion i mikrointerakcje (profesjonalne, nie "fancy")

1. Wejscie sekcji: 140-220 ms, fade + y=8.
2. Karty KPI: lekki count-up przy zmianie danych.
3. Tabele: highlight zmienionego wiersza po filtracji/sync.
4. Wykresy: rysowanie linii tylko przy pierwszym renderze.
5. Respect prefers-reduced-motion.

## 7. Spojnosc tresci i jezyka

1. Jedna wersja jezykowa w calym demo (rekomendacja: polska).
2. Jedno nazewnictwo statusow i KPI w kazdym module.
3. Jedna konwencja liczb: waluta, procent, m/m, ytd.

## 8. Plan wdrozenia wizualnego (szybki)

### Etap 1 (1-2 dni): Foundation

1. Design tokens 2.0 (kolory, radius, cienie, spacing, motion).
2. Ujednolicenie KPI cards + sekcji naglowkowych.
3. Ujednolicenie tabel i badge statusow.

### Etap 2 (2-3 dni): Wow layer

1. Hero i insight strip na Pulpicie.
2. Bridge storyboard w Raportach.
3. Sync cockpit w Integracjach.

### Etap 3 (1-2 dni): Demo polish

1. Tryb prezentacji.
2. Scenariusze demo (rentowny, ryzyko, opoznione platnosci).
3. Dopracowanie mikrointerakcji i copy.

## 9. Decyzje do Twojej akceptacji

1. Ktory wariant wizualny wybierasz: A, B czy C?
2. Czy trzymamy polska wersje jezykowa jako jedyna na demo?
3. Czy wdrazamy "Tryb prezentacji" (tak/nie)?
4. Czy priorytetem wow ma byc bardziej Pulpit czy Kontrakty 360?

## 10. Rekomendacja finalna

Do najblizszej iteracji proponuje:

1. Wariant A (Executive Warm).
2. Priorytet wdrozenia: Pulpit + Kontrakty 360 + Raporty (bridge).
3. Integracje jako "cockpit" pokazujacy wiarygodnosc procesu, nie tylko przycisk sync.

To da mocny efekt biznesowy na demo, bez utraty profesjonalizmu i bez ryzyka chaosu wizualnego.
