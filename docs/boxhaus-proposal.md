# BoxHaus — propozycja realizacji (analiza i estymacja)

> Dokument roboczy. Analiza wymagań BoxHaus (ekonomika kontraktów / FlexiEPM) na tle istniejących produktów dvlp-ksef i dvlp-planner. Wariant docelowy: **web + relacyjna baza danych**, bez Dataverse i bez Power Apps Code App.

---

## 1. Streszczenie dla decydenta

BoxHaus **nie potrzebuje rozwiązania klasy KSeF** (procesowania e-faktur i workflow akceptacji). Potrzebuje **zarządczej warstwy ekonomiki kontraktów** — agregowania kosztów (magazyny wirtualne Optima, płace, produkcja, ekipy, prowizje) na poziomie kontraktu/realizacji, z porównaniem do wartości umownej i raportami marży.

Funkcjonalnie najbliżej jest do **dvlp-planner** (projekty, MPK, koszty rzeczywiste, faktury, marże, agregaty miesięczne). Architektonicznie budujemy **nowy produkt** w stacku znanym z dvlp-planner / dvlp-ksef / dvlp-ted: **Next.js + Azure Functions + Azure SQL/Postgres**.

**Rekomendacja:** nowy produkt (roboczo „dvlp-contracts" / „FlexiEPM Contract Economics") zbudowany web-only, z agresywnym reuse modułów domenowych z dvlp-planner.

---

## 2. Mapowanie wymagań BoxHaus → istniejące moduły

| Wymaganie BoxHaus | dvlp-ksef (jest) | dvlp-planner (jest) | Luka |
|---|---|---|---|
| Karta kontraktu (wartość umowna, koszty, marża, zapas marży) | ❌ (operuje fakturą, nie kontraktem) | Częściowo (Project margin) | **Encja `Contract` z polami: wartość umowna, linia biznesowa, status, dates** |
| Import z Comarch ERP Optima (magazyny wirtualne, zapisy źródłowe) | ❌ (KSeF ingest, nie Optima) | ❌ (iFirma, nie Optima) | **Konektor Optima (XML/CSV/SDK Comarch) + ETL do DB** |
| Koszty bezpośrednie z magazynów wirtualnych → kontrakt | ❌ | Częściowo (linkowanie faktur do projektu) | Adaptacja: `Invoice → Contract` + import pozycji magazynowych |
| Lista płac per pracownik → alokacja na kontrakty wg czasu pracy | ❌ | ✅ (resourceHoursDaily, hourlyNetRate, cost split) | Reuse z dvlp-planner |
| Ewidencja czasu pracy (kontrakt vs nieprojektowa) | ❌ | ✅ (time entries, billable/nonBillable/absences) | Reuse |
| Przypisanie pracowników do ekip (brygad) | ❌ | ❌ (są resources, nie ekipy) | Nowa encja `Crew` + relacja `Resource ↔ Crew` |
| Koszt produkcji wg stawki dziennej/godzinowej × dane produkcji | ❌ | ❌ | **Nowy moduł: produkcja (wpisy realizacji + stawka narzutu)** |
| Narzut ekip/floty/narzędzi (miesięczny per ekipa, alokacja po godzinach) | ❌ | ❌ | Nowy moduł: koszty ekip + reguła alokacji |
| Prowizje handlowe (kalkulacyjne, stawki) | ❌ | ❌ | Nowy moduł: prowizje (parametry + naliczanie) |
| Linie biznesowe (Box Haus / Erdol; standard/na zamówienie) | ❌ | ❌ (są statusy/typy projektów) | Pole/encja `BusinessLine` na kontrakcie |
| Zestawienie kontraktów + agregacja po liniach biznesowych | Częściowo (lista faktur) | ✅ (project list, dashboard) | Adaptacja widoków |
| Drilldown / audit trail do składowych kosztu | Częściowo (invoice detail) | ✅ (cost breakdown by MPK) | Reuse + rozszerzenie o produkcję/ekipy/prowizje |
| Raport całej firmy z uzgodnieniem (Opcja 1) | ❌ | Częściowo (dashboard summary) | Nowy raport reconciliation contract↔company |
| P&L z obrotówki (Opcja 2) | ❌ | ❌ | Nowy moduł: import obrotówki + mapowanie kont |
| Powiadomienia (np. budżet, „zapas marży < X%") | ✅ (pełny system) | Częściowo | Reuse wzorca |
| Auth (Entra ID) + RBAC | ✅ | ✅ | Reuse |

**Wniosek:** ~40% funkcjonalności do zbudowania od zera (Optima, kontrakty, produkcja, ekipy, prowizje, linie biznesowe, P&L). ~40% portowanie z dvlp-planner. ~20% to architektoniczny szkielet (Next.js + Functions + DB) zgodny z resztą portfolio.

---

## 3. Architektura docelowa (wariant web + DB)

### 3.1 Stack

- **Frontend**: Next.js 13+ (app router) + TypeScript + Tailwind + shadcn/ui — jak dvlp-planner i web w dvlp-ksef/dvlp-ted/dvlp-dms
- **Backend**: Azure Functions (TypeScript) — jak ksef/ted/dms
- **DB**: relacyjna — rekomendacja **Azure SQL** lub **PostgreSQL Flexible Server** + **Prisma** ORM
- **Auth**: NextAuth.js + Entra ID (jak dvlp-planner)
- **Hosting**: Azure Static Web Apps (web) + Azure Functions (api)
- **IaC**: Bicep (jak ksef/ted/dms)
- **Bez**: Dataverse, Power Apps Code App, Power Apps Connector

### 3.2 Schemat wysokopoziomowy

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js (App Router) — web/                                │
│  Strony: Contracts, Contract Detail, Business Lines,        │
│          Crews, Production, Commissions, Reports,           │
│          Reconciliation, P&L                                │
└──────────────────┬──────────────────────────────────────────┘
                   │ NextAuth (Entra ID) → JWT
┌──────────────────▼──────────────────────────────────────────┐
│  Azure Functions (TypeScript) — api/                        │
│  • /contracts  /production  /crews  /commissions            │
│  • /optima-sync  /payroll-sync  /timesheets                 │
│  • /reports/contract  /reports/business-line  /reports/recon│
│  • /pl-from-ledger (Opcja 2)                                │
└──────────────────┬──────────────────────────────────────────┘
                   │ Prisma
       ┌───────────┼─────────────────────────────┐
       │           │                             │
┌──────▼─────┐  ┌──▼────────────────┐  ┌─────────▼──────────┐
│ Azure SQL/ │  │ Comarch Optima    │  │ Lista płac / HR    │
│ Postgres   │  │ (XML/SDK/REST)    │  │ (CSV/Excel import) │
└────────────┘  └───────────────────┘  └────────────────────┘
```

### 3.3 Model danych — kluczowe encje

- `contract` — kontrakt (numer, klient, wartość umowna, linia biznesowa, status, daty)
- `business_line` — linia biznesowa (Box Haus/Erdol/standard/na zamówienie)
- `crew` — ekipa/brygada
- `crew_member` — przypisanie pracownik ↔ ekipa (z datami obowiązywania)
- `production_entry` — wpis realizacji produkcji (kontrakt, data, jednostki/godziny)
- `commission_rule` — reguły prowizji (per linia, per handlowiec, %)
- `optima_warehouse_doc` — pozycja z magazynu wirtualnego (link do kontraktu, koszt)
- `payroll_entry` — pozycja listy płac (pracownik, miesiąc, koszt)
- `time_entry` — ewidencja czasu pracy (pracownik, kontrakt/aktywność, data, godziny)
- `contract_cost_alloc` — agregat alokacji kosztów per kontrakt/miesiąc/typ (materiały, ludzie, produkcja, ekipy, prowizje)
- `ledger_entry` — Opcja 2: pozycja obrotówki
- `audit_log` — rejestr zmian (kto, co, kiedy)

Reuse wzorców z dvlp-planner: stawki, agregaty miesięczne, kalkulacja marży.

### 3.4 Struktura repozytorium

```
dvlp-contracts/
├── web/                    # Next.js 13+ (app router)
│   ├── app/
│   │   ├── contracts/
│   │   ├── business-lines/
│   │   ├── crews/
│   │   ├── production/
│   │   ├── commissions/
│   │   ├── reports/
│   │   └── api/            # Next API routes (BFF) lub proxy do Functions
│   ├── components/         # shadcn/ui + domenowe (port z planner)
│   ├── hooks/              # React Query
│   ├── lib/                # API client, utils, format
│   └── messages/           # i18n PL/EN
├── api/                    # Azure Functions (TypeScript)
│   ├── src/
│   │   ├── functions/      # endpointy: contracts, production, optima-sync, ...
│   │   ├── lib/
│   │   │   ├── db/         # Prisma client + repositories
│   │   │   ├── optima/     # konektor Comarch
│   │   │   ├── payroll/    # import list płac
│   │   │   └── allocation/ # silnik alokacji kosztów
│   │   └── types/
│   └── prisma/             # schema.prisma + migracje
├── deployment/
│   └── azure/              # Bicep (SWA + Functions + Azure SQL/Postgres)
└── docs/
```

---

## 4. Moduły funkcjonalne (kolejność wdrażania)

**Faza 1 — Fundament (must-have)**
1. Szkielet projektu: Next.js + Azure Functions + Prisma + Bicep + CI/CD
2. Schema DB: `contract`, `business_line` + UI listy/karty kontraktu
3. Konektor Optima (read-only): magazyny wirtualne + zapisy źródłowe → DB
4. Linkowanie pozycji magazynowych → kontrakt
5. Karta kontraktu v1: wartość umowna + koszty bezpośrednie + zapas marży

**Faza 2 — Alokacje zarządcze**
6. Import listy płac (CSV/Excel) + ewidencja czasu pracy (formatka albo import)
7. Alokacja kosztów ludzi na kontrakty wg czasu pracy (port logiki z dvlp-planner)
8. `Crew` + przypisanie pracowników do ekip
9. Moduł produkcji: stawka narzutu + wpisy realizacji → koszt na kontrakt
10. Narzut ekip/floty/narzędzi (miesięczny per ekipa, alokacja po godzinach)
11. Prowizje (parametry + naliczanie kalkulacyjne)

**Faza 3 — Raporty i porównywalność**
12. Zestawienie kontraktów (sortowanie, filtry, eksport CSV/XLSX)
13. Agregacja po liniach biznesowych
14. Drilldown / audit trail (wskazanie źródła każdej kwoty)
15. Alerty: „zapas marży < X%", „kontrakt przekroczył budżet kosztów"

**Faza 4 — Opcje rozszerzenia**
16. **Opcja 1**: raport firmy z uzgodnieniem (kontrakty + pozycje poza + różnica)
17. **Opcja 2**: P&L z obrotówki (import + mapowanie kont na uproszczony układ)

---

## 5. Kluczowe ryzyka

- **KWS i podwójne ujęcie** — wyraźnie zaznaczone w wymaganiach. Wymaga warsztatu z księgową BoxHaus przed projektowaniem ETL.
- **Format danych z Optima** — czy jest dostęp do bazy/SDK Comarch, czy tylko exporty XML/CSV. Determinuje pracochłonność konektora (różnica ~2–3×).
- **Jakość danych historycznych 2025/2026** — czy ewidencja czasu pracy i produkcji była prowadzona spójnie.
- **Spójność słowników** — kontrakt = magazyn wirtualny? kod kontraktu w listach płac? Bez tego alokacje wymagają mapowań ręcznych.

---

## 6. Estymacja pracochłonności

Założenia: zespół **1× tech lead + 1× full-stack dev + 0.3× analityk/PM**, technologie znane (TS/Next.js/Azure Functions/Prisma), reuse z dvlp-planner agresywny ale realistyczny (40–50% kodu domenowego do napisania).

| Faza | Zakres | Pracochłonność (rd) | Czas kalendarzowy |
|---|---|---|---|
| **0. Discovery** | Warsztaty BoxHaus, mapping Optima/KWS, plan kont, ekipy, formatki | 8–12 | 2–3 tyg. |
| **1. Fundament** | Next.js + Functions + DB schema, encje Contract/BusinessLine, UI karty kontraktu, konektor Optima v1, linkowanie magazynów wirtualnych | 25–38 | 5–7 tyg. |
| **2. Alokacje** | Import płac, czas pracy, ekipy, produkcja, narzuty, prowizje | 28–37 | 5–7 tyg. |
| **3. Raporty** | Zestawienie kontraktów, linie biznesowe, drilldown, alerty | 15–22 | 3–4 tyg. |
| **4a. Opcja 1** (reconciliation firma↔kontrakty) | Raport uzgodnienia | 10–15 | 2–3 tyg. |
| **4b. Opcja 2** (P&L z obrotówki) | Import obrotówki + mapowanie kont + raport | 13–19 | 3 tyg. |
| **Cross-cutting** | Testy (typecheck/unit/E2E — reguły repo), CI/CD, deployment IaC (Bicep), dokumentacja, szkolenie asystenta CEO | 12–17 | równolegle |

### Sumy

- **Zakres podstawowy (Fazy 0–3)**: **~88–126 roboczodni** ≈ **4–6 miesięcy** dla zespołu 2 FTE
- **+ Opcja 1**: +10–15 dni
- **+ Opcja 2**: +13–19 dni
- **Pełen zakres (Fazy 0–4)**: **~111–160 roboczodni** ≈ **5.5–8 miesięcy**

### MVP

Faza 0 + Faza 1 + skrócona Faza 2 (tylko alokacja płac, bez ekip/produkcji/prowizji) + minimalna karta kontraktu i lista.

**MVP: ~40–55 roboczodni ≈ 2.5–3 miesiące** — pozwala BoxHaus zobaczyć ekonomię kontraktów na realnych danych i zwalidować model przed pełnym wdrożeniem.

### Bilans vs wariant z Dataverse + Code App

Rezygnacja z Dataverse i drugiego UI (Code App) skraca projekt o **~23–36 roboczodni** (≈ 1–1.5 miesiąca):

| Element | Oszczędność | Koszt dodatkowy |
|---|---|---|
| Brak modelowania w Dataverse | −8 do −12 dni | — |
| Brak Power Apps Code App | −10 do −15 dni | — |
| Brak Power Apps Connector | −5 do −7 dni | — |
| Brak deploymentu solution PP | −4 do −6 dni | — |
| Jeden UI zamiast dwóch | −6 do −10 dni | — |
| Schema DB + migracje (Prisma) | — | +5–7 dni |
| Provisioning Azure SQL/Postgres + DR | — | +3–5 dni |
| Auth per-tenant (RLS / scoped queries) | — | +3–4 dni |
| Audit log (własna tabela + middleware) | — | +2–3 dni |
| **Suma** | **−33 do −50 dni** | **+13–19 dni** |
| **Netto** | **−20 do −31 dni** | |

---

## 7. Decyzje do potwierdzenia na warsztacie discovery

1. **DB**: Azure SQL czy PostgreSQL? (Postgres tańszy, lepsze typy JSON; SQL jeśli klient ma licencje MS)
2. **ORM**: rekomendacja **Prisma** (lepsze DX, migracje, dobre wsparcie obu DB)
3. **Auth**: rekomendacja **NextAuth + Entra ID** (zgodnie z dvlp-planner)
4. **Multi-tenant**: czy BoxHaus to single-tenant (jedna firma, wiele spółek przez `company_id`), czy planujemy sprzedawać produkt dalej (`tenant_id` od początku)?
5. **Dostęp do Optimy**: SDK / baza / eksporty XML — determinuje koszt konektora
6. **Zakres historii**: tylko 2026, czy 2025+2026

---

## 8. Rekomendacje praktyczne

1. **Nie sprzedawać tego jako „dvlp-ksef dla BoxHaus"** — to inny produkt domenowo. Sprzedać jako nowy produkt z reuse architektury i modułów dvlp-planner.
2. **Zacząć od warsztatu KWS / Optima** zanim zacznie się kodowanie — 70% ryzyka projektu siedzi w danych źródłowych.
3. **MVP na Fazach 0–1 + skrócona 2** w 2.5–3 miesiące jako pierwsza dostawa, potem iteracja.
4. **Reuse najwięcej z dvlp-planner** (alokacje, agregaty, dashboard, komponenty UI) — to gotowe i sprawdzone.
5. **Reuse wzorca repo z dvlp-ksef/ted/dms** (web + api + deployment + Bicep) — sprawdzony layout.
6. **Opcję 2 (P&L z obrotówki) traktować jako osobny SOW** — niezależna od kontraktów, łatwa do dodania później.

---

*Dokument przygotowany na podstawie materiału „BoxHaus — finanse" oraz analizy implementacji dvlp-ksef i dvlp-planner.*
