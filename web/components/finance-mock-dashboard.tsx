"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type ContractStatus = "nowy" | "negocjacje" | "podpisany" | "realizacja" | "zakończony";

type ContractPriority = "wysoki" | "średni" | "niski";

interface ContractItem {
  id: string;
  number: string;
  clientName: string;
  objectName: string;
  city: string;
  valueNet: number;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  priority: ContractPriority;
}

const currency = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 2,
});

const contractStatusLabel: Record<ContractStatus, string> = {
  nowy: "Nowy",
  negocjacje: "Negocjacje",
  podpisany: "Podpisany",
  realizacja: "W realizacji",
  zakończony: "Zakończony",
};

const contractStatusClass: Record<ContractStatus, string> = {
  nowy: "bg-slate-100 text-slate-700",
  negocjacje: "bg-amber-100 text-amber-800",
  podpisany: "bg-emerald-100 text-emerald-800",
  realizacja: "bg-sky-100 text-sky-800",
  zakończony: "bg-rose-100 text-rose-800",
};

const statusDotClass: Record<ContractPriority, string> = {
  wysoki: "bg-[#db1832]",
  średni: "bg-[#e0ad3b]",
  niski: "bg-[#4cb24f]",
};

const menuItems = [
  "Pulpit",
  "Sprzedaż",
  "Kontrakty",
  "Projekty",
  "Faktury",
  "Płatności",
  "Kontrola kosztów",
  "Raporty",
  "Zespół",
  "Integracje",
  "Ustawienia",
];

const contracts: ContractItem[] = [
  {
    id: "c1",
    number: "BH/KON/2026/001",
    clientName: "Baltic Living Sp. z o.o.",
    objectName: "Osiedle Nadmorskie A",
    city: "Gdańsk",
    valueNet: 1240000,
    startDate: "2026-05-12",
    endDate: "2026-09-30",
    status: "realizacja",
    priority: "wysoki",
  },
  {
    id: "c2",
    number: "BH/KON/2026/002",
    clientName: "Nova Group",
    objectName: "Apartamenty Centrum",
    city: "Poznań",
    valueNet: 860000,
    startDate: "2026-06-01",
    endDate: "2026-08-15",
    status: "podpisany",
    priority: "średni",
  },
  {
    id: "c3",
    number: "BH/KON/2026/003",
    clientName: "Klara Development",
    objectName: "Budynek usługowy Parkowa",
    city: "Wrocław",
    valueNet: 2100000,
    startDate: "2026-06-10",
    endDate: "2026-12-31",
    status: "negocjacje",
    priority: "wysoki",
  },
  {
    id: "c4",
    number: "BH/KON/2026/004",
    clientName: "Sunrise Invest",
    objectName: "Hala magazynowa S1",
    city: "Łódź",
    valueNet: 740000,
    startDate: "2026-04-18",
    endDate: "2026-07-20",
    status: "zakończony",
    priority: "niski",
  },
  {
    id: "c5",
    number: "BH/KON/2026/005",
    clientName: "Mira Estates",
    objectName: "Osiedle Zielone Tarasy",
    city: "Katowice",
    valueNet: 1590000,
    startDate: "2026-06-18",
    endDate: "2026-11-15",
    status: "nowy",
    priority: "średni",
  },
];

export function FinanceMockDashboard() {
  const [activeMenuItem, setActiveMenuItem] = useState("Kontrakty");
  const [search, setSearch] = useState("");

  const filteredContracts = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return contracts;
    }

    return contracts.filter((contract) => {
      const haystack = [
        contract.number,
        contract.clientName,
        contract.objectName,
        contract.city,
        contract.status,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [search]);

  const totals = useMemo(() => {
    const valueNet = filteredContracts.reduce((sum, contract) => sum + contract.valueNet, 0);
    const active = filteredContracts.filter((contract) => contract.status === "realizacja" || contract.status === "podpisany").length;
    const negotiation = filteredContracts.filter((contract) => contract.status === "negocjacje").length;
    const newContracts = filteredContracts.filter((contract) => contract.status === "nowy").length;
    const completed = filteredContracts.filter((contract) => contract.status === "zakończony").length;

    return {
      total: filteredContracts.length,
      valueNet,
      active,
      negotiation,
      newContracts,
      completed,
    };
  }, [filteredContracts]);

  const recentContracts = [...filteredContracts]
    .sort((left, right) => right.startDate.localeCompare(left.startDate))
    .slice(0, 3);

  const pipeline = [
    { label: "Nowe", value: totals.newContracts, color: "#f28b25" },
    { label: "Negocjacje", value: totals.negotiation, color: "#e0ad3b" },
    { label: "Podpisane", value: contracts.filter((contract) => contract.status === "podpisany").length, color: "#4cb24f" },
    { label: "Realizacja", value: totals.active, color: "#3d8bfd" },
    { label: "Zakończone", value: totals.completed, color: "#db1832" },
  ];

  const quickTiles = [
    { title: "Aktywne kontrakty", value: totals.active, accentClass: "border-l-[#f28b25]" },
    { title: "Wartość portfela", value: currency.format(totals.valueNet), accentClass: "border-l-[#e0ad3b]" },
    { title: "Do podpisu", value: totals.negotiation, accentClass: "border-l-[#db1832]" },
    { title: "Nowe leady", value: totals.newContracts, accentClass: "border-l-[#4cb24f]" },
  ];

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-[#2d2b28]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[250px] shrink-0 border-r border-[rgb(107_107_107_/_14%)] bg-white/95 px-4 py-4 shadow-[0_0_24px_rgba(0,0,0,0.04)] md:flex md:flex-col">
          <div className="mb-6 flex items-center px-1">
            <Image src="/logo.png" alt="Box Haus" width={132} height={40} className="h-auto w-auto" />
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = item === activeMenuItem;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setActiveMenuItem(item)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${
                    isActive
                      ? "bg-[var(--brand-primary)] text-white shadow-sm"
                      : "text-[var(--brand-muted)] hover:bg-[rgb(228_101_14_/_7%)] hover:text-[#2d2b28]"
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded ${isActive ? "bg-white/20" : "bg-transparent"}`}>
                    •
                  </span>
                  <span className="font-medium">{item}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl bg-[#fff4ea] px-4 py-4 text-[#8e4a14] shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Szybki dostęp</p>
            <p className="mt-1 text-sm text-[#8c6a53]">Najczęściej używane obszary makiety.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#8c6a53] shadow-sm">Kontrakty</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#8c6a53] shadow-sm">Faktury</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#8c6a53] shadow-sm">Raporty</span>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgb(107_107_107_/_12%)] bg-white/90 px-4 py-4 shadow-[0_2px_18px_rgba(0,0,0,0.03)] md:px-6">
            <div className="flex items-center gap-4">
              <div className="md:hidden">
                <Image src="/logo.png" alt="Box Haus" width={120} height={34} className="h-auto w-auto" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
                  Dashboard Box Haus
                </p>
                <h1 className="text-lg font-semibold tracking-wide md:text-[22px]">Kontrakty</h1>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-end gap-3 md:flex-none">
              <div className="hidden w-full max-w-[320px] items-center gap-2 rounded-2xl border border-[rgb(107_107_107_/_16%)] bg-[#fbfaf8] px-4 py-2 text-sm text-[var(--brand-muted)] shadow-sm md:flex">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Szukaj kontraktu..."
                  className="w-full bg-transparent outline-none placeholder:text-[var(--brand-muted)]"
                />
              </div>

              <button type="button" className="hidden rounded-xl border border-[rgb(107_107_107_/_16%)] bg-white px-3 py-2 text-[var(--brand-muted)] shadow-sm md:inline-flex">
                ⏷
              </button>
              <button type="button" className="hidden rounded-xl border border-[rgb(107_107_107_/_16%)] bg-white px-3 py-2 text-[var(--brand-muted)] shadow-sm md:inline-flex">
                🔔
              </button>
              <button type="button" className="hidden rounded-xl border border-[rgb(107_107_107_/_16%)] bg-white px-3 py-2 text-[var(--brand-muted)] shadow-sm md:inline-flex">
                ↗
              </button>
              <button type="button" className="hidden rounded-xl border border-[rgb(107_107_107_/_16%)] bg-white px-3 py-2 text-[var(--brand-muted)] shadow-sm md:inline-flex">
                ◌
              </button>

              <div className="flex items-center gap-3 rounded-full bg-white px-3 py-2 shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-primary)] text-sm font-semibold text-white">
                  JK
                </div>
                <span className="text-sm font-medium text-[#473126]">Jan Kowalski</span>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              {quickTiles.map((tile) => (
                <article
                  key={tile.title}
                  className={`card-surface rounded-xl border-l-[4px] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${tile.accentClass}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                    {tile.title}
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <span className="text-3xl font-semibold text-[#383433]">{tile.value}</span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(228_101_14_/_10%)] text-[var(--brand-primary)]">
                      •
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Mapa kontraktów</h2>
                  <p className="text-sm text-[var(--brand-muted)]">Przegląd etapów i lokalizacji</p>
                </div>

                <div className="flex items-center gap-2 self-start rounded-xl bg-[#fbfaf8] p-1 shadow-sm">
                  <button type="button" className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[var(--brand-primary)] shadow-sm">
                    Karty
                  </button>
                  <button type="button" className="rounded-lg px-3 py-2 text-sm text-[var(--brand-muted)]">
                    Oś czasu
                  </button>
                  <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--brand-primary)]">
                    Zobacz wszystkie
                  </button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
                <div className="relative overflow-hidden rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-gradient-to-br from-[#e8f0d6] via-[#f7f1df] to-[#d9edf2] p-4 md:p-6">
                  <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] [background-size:64px_64px]" />
                  <div className="relative flex h-[500px] flex-col justify-between">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {pipeline.map((stage) => (
                        <div key={stage.label} className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-[#4c4540]">{stage.label}</p>
                            <span
                              className={`h-3 w-3 rounded-full ${
                                stage.color === "#f28b25"
                                  ? "bg-[#f28b25]"
                                  : stage.color === "#e0ad3b"
                                    ? "bg-[#e0ad3b]"
                                    : stage.color === "#4cb24f"
                                      ? "bg-[#4cb24f]"
                                      : stage.color === "#3d8bfd"
                                        ? "bg-[#3d8bfd]"
                                        : "bg-[#db1832]"
                              }`}
                            />
                          </div>
                          <p className="mt-3 text-4xl font-semibold text-[#383433]">{stage.value}</p>
                          <p className="mt-2 text-xs text-[var(--brand-muted)]">Kontrakty na obecnym etapie</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {filteredContracts.map((contract) => (
                        <article key={contract.id} className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#383433]">{contract.objectName}</p>
                              <p className="mt-1 text-xs text-[var(--brand-muted)]">{contract.clientName}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${contractStatusClass[contract.status]}`}>
                              {contractStatusLabel[contract.status]}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm text-[var(--brand-muted)]">
                            <span>{contract.city}</span>
                            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusDotClass[contract.priority]}`} />
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-4 shadow-sm md:p-6">
                  <h3 className="text-lg font-semibold text-[#383433]">Skróty i aktywność</h3>
                  <p className="mt-1 text-sm text-[var(--brand-muted)]">Najważniejsze działania i ostatnie zmiany</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <button type="button" className="rounded-xl bg-white px-4 py-3 text-left shadow-sm transition hover:shadow-md">
                      <p className="text-sm text-[var(--brand-muted)]">Nowy kontrakt</p>
                      <p className="mt-1 font-semibold text-[#383433]">Dodaj rekord</p>
                    </button>
                    <button type="button" className="rounded-xl bg-white px-4 py-3 text-left shadow-sm transition hover:shadow-md">
                      <p className="text-sm text-[var(--brand-muted)]">Eksport</p>
                      <p className="mt-1 font-semibold text-[#383433]">Pobierz PDF / CSV</p>
                    </button>
                    <button type="button" className="rounded-xl bg-white px-4 py-3 text-left shadow-sm transition hover:shadow-md">
                      <p className="text-sm text-[var(--brand-muted)]">Filtry</p>
                      <p className="mt-1 font-semibold text-[#383433]">Status, miasto, klient</p>
                    </button>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white px-4 py-4 shadow-sm">
                    <p className="text-sm font-semibold text-[#383433]">Ostatnie kontrakty</p>
                    <div className="mt-3 space-y-3">
                      {recentContracts.map((contract) => (
                        <div key={contract.id} className="flex items-start justify-between gap-3 border-b border-[rgb(107_107_107_/_10%)] pb-3 last:border-0 last:pb-0">
                          <div>
                            <p className="font-medium text-[#383433]">{contract.objectName}</p>
                            <p className="text-xs text-[var(--brand-muted)]">{contract.clientName}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${contractStatusClass[contract.status]}`}>
                            {contractStatusLabel[contract.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-[#fff4ea] px-4 py-4 text-[#8e4a14] shadow-inner">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">Podsumowanie</p>
                    <p className="mt-1 text-sm text-[#8c6a53]">Wszystkie dane są mockowane lokalnie, bez plannerowych dodatków.</p>
                  </div>
                </aside>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
