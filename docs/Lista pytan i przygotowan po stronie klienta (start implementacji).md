# Lista pytan i przygotowan po stronie klienta (start implementacji)

Data: 2026-06-05
Kontekst: start makiety Box Haus na bazie dvlp-planner (JSON-only, mock sync)

## 1. Pytania decyzyjne (blokujace)

1. Czy implementujemy bezposrednio w repo dvlp-planner, czy tworzysz osobny fork/repo dla makiety Box Haus?
2. Jaki jest preferowany poziom zgodnosci UX z obecnym planerem:
- 100% ten sam layout,
- czy dopuszczamy uproszczenia (np. mniej zakladek/filtrów)?
3. Czy na etapie makiety utrzymujemy role i logowanie, czy przechodzimy na tryb "single demo user"?
4. Jakie obiekty placeholder musza byc widoczne od razu w menu:
- Produkcja,
- Ekipy i flota,
- Prowizje,
- Uzgodnienie/KWS,
- inne?
5. Czy nomenklature "Projekt" zmieniamy globalnie na "Kontrakt" juz teraz, czy dopiero po warsztacie?

## 2. Dane do przygotowania (minimum)

1. Lista 20-30 realnych nazw kontraktow/projektow (lub wzorzec nazewnictwa).
2. Lista klientow i linii biznesowych (docelowe slowniki).
3. Przykladowe typy kosztow dla:
- magazynow wirtualnych,
- wynagrodzen,
- produkcji,
- ekip/floty/narzedzi,
- prowizji,
- niealokowanych.
4. Przykladowe scenariusze demo (3 szt.):
- kontrakt zdrowy,
- kontrakt ryzykowny,
- kontrakt z opoznionymi platnosciami.
5. Oczekiwane progi alertow (np. marza %, overdue, wykorzystanie budzetu).

## 3. Branding i UX

1. Paleta Box Haus (hex) + ewentualnie font i logo.
2. Lista etykiet, ktore maja miec finalne nazwy biznesowe.
3. Jezyk interfejsu dla makiety:
- PL,
- EN,
- mieszany?

## 4. Ramy prezentacji

1. Kto bedzie glownym odbiorca demo (zarzad, finanse, operacje)?
2. Ile czasu na prezentacje i ile czasu na Q&A?
3. Czy potrzebny eksport danych do XLSX/PDF na etapie makiety?
4. Czy demo ma byc uruchamiane lokalnie czy na srodowisku wspoldzielonym?

## 5. Dostepy i organizacja pracy

1. Czy mamy zielone swiatlo na zmiany bezposrednio w dvlp-planner?
2. Kto po Twojej stronie zatwierdza:
- slownik biznesowy,
- zakres placeholderow,
- scenariusze demo?
3. Jaki jest preferowany format backlogu wykonawczego:
- Jira,
- GitHub Issues,
- plik markdown?

## 6. Co warto przygotowac od razu (checklista)

1. [ ] Potwierdzenie repo/docelowej galezi.
2. [ ] Paleta kolorow Box Haus i logo.
3. [ ] Slownik linii biznesowych.
4. [ ] Progi alertow (minimum 3-4 reguly).
5. [ ] 3 scenariusze demo (opis + oczekiwany wynik).
6. [ ] Decyzja o logowaniu/rolach na makiecie.

## 7. Decyzje domyslne (jesli chcesz ruszyc bez czekania)

1. Repo: dvlp-planner, dedykowana galaz makietowa.
2. UX: maksymalny reuse, minimalne zmiany.
3. Auth: single demo user (uproszczenie).
4. Jezyk UI: PL.
5. Placeholdery: Produkcja, Ekipy i flota, Prowizje, Uzgodnienie/KWS.
