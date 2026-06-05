"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import type { MockInvoice } from "@/lib/mock-invoices-store";

interface DashboardPageProps {
  initialInvoices: MockInvoice[];
}

interface DashboardContract {
  id: string;
  number: string;
  clientName: string;
  objectName: string;
  city: string;
  valueNet: number;
  status: "nowy" | "negocjacje" | "podpisany" | "realizacja" | "zakończony";
  dueLabel: string;
}

const currency = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 2,
});

const contracts: DashboardContract[] = [
  {
    id: "c1",
    number: "BH/KON/2026/001",
    clientName: "Baltic Living Sp. z o.o.",
    objectName: "Osiedle Nadmorskie A",
    city: "Gdańsk",
    valueNet: 1240000,
    status: "realizacja",
    dueLabel: "Do odbioru w 18 dni",
  },
  {
    id: "c2",
    number: "BH/KON/2026/003",
    clientName: "Klara Development",
    objectName: "Budynek usługowy Parkowa",
    city: "Wrocław",
    valueNet: 2100000,
    status: "negocjacje",
    dueLabel: "Decyzja w tym tygodniu",
  },
  {
    id: "c3",
    number: "BH/KON/2026/005",
    clientName: "Mira Estates",
    objectName: "Osiedle Zielone Tarasy",
    city: "Katowice",
    valueNet: 1590000,
    status: "nowy",
    dueLabel: "Nowy lead z tego miesiąca",
  },
];

const activity = [
  {
    title: "Synchronizacja Optima",
    meta: "Dodano nowe faktury i odświeżono statusy",
    tone: "sync",
  },
  {
    title: "Kontrakt w realizacji",
    meta: "Osiedle Nadmorskie A czeka na odbiór",
    tone: "contract",
  },
  {
    title: "Ryzyko płatności",
    meta: "Dwie faktury są po terminie i wymagają kontaktu",
    tone: "warning",
  },
  {
    title: "Nowy lead",
    meta: "Mira Estates dodało świeży temat do pipeline",
    tone: "lead",
  },
];

export function DashboardPage({ initialInvoices }: DashboardPageProps) {
  const overdueInvoices = initialInvoices.filter((invoice) => invoice.status === "overdue");
  const openInvoices = initialInvoices.filter((invoice) => invoice.status !== "paid");
  const activeContracts = contracts.filter((contract) => contract.status === "realizacja" || contract.status === "podpisany");
  const negotiationContracts = contracts.filter((contract) => contract.status === "negocjacje");
  const totalPortfolio = contracts.reduce((sum, contract) => sum + contract.valueNet, 0);
  const overdueGross = overdueInvoices.reduce((sum, invoice) => sum + invoice.grossAmount, 0);
  const contractProgress = [
    { label: "Realizacja", value: activeContracts.length, color: "bg-[#3d8bfd]", widthClass: "w-[62%]" },
    { label: "Negocjacje", value: negotiationContracts.length, color: "bg-[#e0ad3b]", widthClass: "w-[28%]" },
    { label: "Nowe", value: contracts.filter((contract) => contract.status === "nowy").length, color: "bg-[#4cb24f]", widthClass: "w-[18%]" },
  ];
  const invoiceStatusMix = [
    { label: "Wystawione", value: initialInvoices.filter((invoice) => invoice.status === "issued").length, color: "bg-[#f28b25]", widthClass: "w-[45%]" },
    { label: "Opłacone", value: initialInvoices.filter((invoice) => invoice.status === "paid").length, color: "bg-[#4cb24f]", widthClass: "w-[52%]" },
    { label: "Przeterminowane", value: overdueInvoices.length, color: "bg-[#db1832]", widthClass: "w-[24%]" },
  ];
  const focusItems = [
    "Sprawdź dwie faktury po terminie i zaplanuj kontakt",
    "Domknij negocjacje dla Klara Development",
    "Przygotuj odbiór dla Osiedla Nadmorskie A",
  ];
  const kpiTrends = {
    active: [35, 42, 51, 57, 62, 68, 74],
    invoices: [22, 30, 41, 49, 55, 63, 71],
    portfolio: [26, 34, 43, 56, 64, 73, 82],
    overdue: [58, 49, 44, 38, 30, 24, 18],
  };
  const aiRecommendations = [
    overdueInvoices.length > 0
      ? `Priorytet 1: obsłuż ${overdueInvoices.length} przeterminowane faktury (wartość ${currency.format(overdueGross)}) i zaplanuj kontakt z klientami jeszcze dziś.`
      : "Priorytet 1: utrzymaj bieżący rytm przypomnień, bo brak pozycji po terminie.",
    negotiationContracts.length > 0
      ? `Priorytet 2: domknij ${negotiationContracts.length} temat(y) w negocjacjach, żeby szybciej zwiększyć liczbę aktywnych realizacji.`
      : "Priorytet 2: dolej nowe leady do pipeline, bo negocjacje są już domknięte.",
    `Priorytet 3: monitoruj ${openInvoices.length} otwartych faktur i synchronizuj statusy z Optimą co najmniej raz dziennie.`,
  ];

  return (
    <AppShell
      title="Pulpit"
      subtitle="Box Haus w skrócie"
      showSearch={false}
    >
      <section className="relative overflow-hidden rounded-3xl border border-[rgb(107_107_107_/_14%)] bg-gradient-to-br from-[#fffaf5] via-[#f7f1df] to-[#e8f0d6] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)] md:p-8">
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_top_right,rgba(242,139,37,0.24),transparent_30%),radial-gradient(circle_at_left,rgba(76,178,79,0.18),transparent_28%),linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:100%_100%,100%_100%,64px_64px,64px_64px]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-muted)]">Executive Summary</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-[#383433] md:text-4xl">
              Aktualny stan aplikacji
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#5a524d]">
              W aplikacji są teraz {activeContracts.length} aktywne kontrakty, {openInvoices.length} otwartych faktur i {overdueInvoices.length} przeterminowanych płatności. Najbliższy priorytet to {negotiationContracts.length} tematów w negocjacjach oraz szybka reakcja na pozycje po terminie.
            </p>

            <div className="mt-5 rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-white/85 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">Przykład podsumowania AI</p>
              <p className="mt-2 text-sm leading-6 text-[#5a524d]">
                Na podstawie aktualnych danych system rekomenduje poniższy plan działań na dziś:
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#383433]">
                {aiRecommendations.map((recommendation) => (
                  <li key={recommendation} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/kontrakty" className="rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
                Przejdź do kontraktów
              </Link>
              <Link href="/faktury" className="rounded-xl border border-[rgb(107_107_107_/_18%)] bg-white px-5 py-3 text-sm font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]">
                Otwórz faktury
              </Link>
              <Link href="/projekty" className="rounded-xl border border-[rgb(107_107_107_/_18%)] bg-white px-5 py-3 text-sm font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]">
                Sprawdź projekty
              </Link>
            </div>

            <div className="mt-5 rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-white/85 p-4 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">Insight strip</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <p className="rounded-xl bg-[#fff7ef] px-3 py-2 text-sm text-[#5a524d]">Negocjacje: {negotiationContracts.length} temat(y) wymagają decyzji handlowej w 48h.</p>
                <p className="rounded-xl bg-[#fff7ef] px-3 py-2 text-sm text-[#5a524d]">Ryzyko płatności: {overdueInvoices.length} faktur po terminie o wartości {currency.format(overdueGross)}.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-sm md:grid-cols-2 lg:grid-cols-1">
            <article className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Aktywne kontrakty</p>
              <p className="kpi-count-anim mt-2 text-3xl font-semibold text-[#383433]">{activeContracts.length}</p>
              <p className="mt-2 text-sm text-[var(--brand-muted)]">{negotiationContracts.length} w negocjacjach</p>
              <div className="mt-2 flex items-end gap-1">
                {kpiTrends.active.map((value, index) => (
                  <span key={`active-${index}`} className="w-1.5 rounded bg-[#3d8bfd]/70" style={{ height: `${Math.max(6, value / 5)}px` }} />
                ))}
              </div>
            </article>
            <article className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Otwarte faktury</p>
              <p className="kpi-count-anim mt-2 text-3xl font-semibold text-[#383433]">{openInvoices.length}</p>
              <p className="mt-2 text-sm text-[var(--brand-muted)]">{overdueInvoices.length} po terminie</p>
              <div className="mt-2 flex items-end gap-1">
                {kpiTrends.invoices.map((value, index) => (
                  <span key={`inv-${index}`} className="w-1.5 rounded bg-[#f28b25]/70" style={{ height: `${Math.max(6, value / 5)}px` }} />
                ))}
              </div>
            </article>
            <article className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Portfel netto</p>
              <p className="kpi-count-anim mt-2 text-3xl font-semibold text-[#383433]">{currency.format(totalPortfolio)}</p>
              <p className="mt-2 text-sm text-[var(--brand-muted)]">Suma aktywnych i nowych tematów</p>
              <div className="mt-2 flex items-end gap-1">
                {kpiTrends.portfolio.map((value, index) => (
                  <span key={`port-${index}`} className="w-1.5 rounded bg-[#4cb24f]/70" style={{ height: `${Math.max(6, value / 5)}px` }} />
                ))}
              </div>
            </article>
            <article className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Przeterminowane</p>
              <p className="kpi-count-anim mt-2 text-3xl font-semibold text-[#383433]">{currency.format(overdueGross)}</p>
              <p className="mt-2 text-sm text-[var(--brand-muted)]">Wartość brutto do szybkiej reakcji</p>
              <div className="mt-2 flex items-end gap-1">
                {kpiTrends.overdue.map((value, index) => (
                  <span key={`over-${index}`} className="w-1.5 rounded bg-[#db1832]/70" style={{ height: `${Math.max(6, value / 5)}px` }} />
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Pilne kontrakty</h3>
              <p className="text-sm text-[var(--brand-muted)]">Najważniejsze sprawy do domknięcia w tym tygodniu</p>
            </div>
            <span className="rounded-full bg-[#fff4ea] px-3 py-1 text-xs font-semibold text-[#8e4a14]">3 tematy</span>
          </div>

          <div className="mt-4 grid gap-3">
            {contracts.map((contract) => (
              <article key={contract.id} className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#383433]">{contract.objectName}</p>
                    <p className="mt-1 text-xs text-[var(--brand-muted)]">{contract.number} • {contract.clientName}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#383433] shadow-sm">
                    {contract.dueLabel}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-[var(--brand-muted)]">{contract.city}</span>
                  <span className="font-semibold text-[#383433]">{currency.format(contract.valueNet)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Ostatnia aktywność</h3>
            <p className="text-sm text-[var(--brand-muted)]">Co wydarzyło się w systemie</p>
          </div>

          <div className="mt-4 space-y-3">
            {activity.map((item) => (
              <div key={item.title} className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-[#383433]">{item.title}</p>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-muted)]">{item.tone}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--brand-muted)]">{item.meta}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-[#fff4ea] px-4 py-4 text-[#8e4a14] shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Następny krok</p>
            <p className="mt-1 text-sm text-[#8c6a53]">
              Projekty powinny pokazywać harmonogramy, etapy, budżet, zespół i ryzyka. To będzie warstwa operacyjna nad kontraktami.
            </p>
          </div>
        </section>
      </div>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
        <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Decyzje na dzis</h3>
              <p className="text-sm text-[var(--brand-muted)]">Priorytety dla osoby, która wchodzi do aplikacji pierwszy raz</p>
            </div>
            <span className="rounded-full bg-[#fff4ea] px-3 py-1 text-xs font-semibold text-[#8e4a14]">3 zadania</span>
          </div>

          <div className="mt-4 space-y-3">
            {focusItems.map((item, index) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] px-4 py-3 shadow-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-[#383433]">{item}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Struktura portfela</h3>
            <p className="text-sm text-[var(--brand-muted)]">Szybki podgląd rozkładu kontraktów i faktur</p>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <div className="mb-3 flex items-center justify-between text-sm text-[var(--brand-muted)]">
                <span>Kontrakty</span>
                <span>{contracts.length} pozycji</span>
              </div>
              <div className="space-y-3">
                {contractProgress.map((segment) => (
                  <div key={segment.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-[#383433]">{segment.label}</span>
                      <span className="text-[var(--brand-muted)]">{segment.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#f3eee7]">
                      <div className={`h-full rounded-full ${segment.color} ${segment.widthClass}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between text-sm text-[var(--brand-muted)]">
                <span>Faktury</span>
                <span>{initialInvoices.length} pozycji</span>
              </div>
              <div className="space-y-3">
                {invoiceStatusMix.map((segment) => (
                  <div key={segment.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-[#383433]">{segment.label}</span>
                      <span className="text-[var(--brand-muted)]">{segment.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#f3eee7]">
                      <div className={`h-full rounded-full ${segment.color} ${segment.widthClass}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Co dalej</h3>
            <p className="text-sm text-[var(--brand-muted)]">Miejsce na generowane przez AI podsumowanie sytuacji</p>
          </div>

          <div className="mt-4 rounded-2xl bg-[#fff4ea] px-4 py-4 text-[#8e4a14] shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Executive note</p>
            <p className="mt-2 text-sm leading-6 text-[#8c6a53]">
              W tej chwili największe ryzyko to przeterminowane płatności, a największa wartość leży w aktywnych kontraktach w realizacji. Dashboard pokazuje też, że portfel jest jeszcze dość skoncentrowany na kilku dużych tematach.
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            <Link href="/raporty" className="rounded-xl border border-[rgb(107_107_107_/_18%)] bg-white px-4 py-3 text-sm font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]">
              Otwórz raporty
            </Link>
            <Link href="/ustawienia" className="rounded-xl border border-[rgb(107_107_107_/_18%)] bg-white px-4 py-3 text-sm font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]">
              Dostosuj widok pulpitu
            </Link>
          </div>
        </article>
      </section>
    </AppShell>
  );
}