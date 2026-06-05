"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  getContractEconomics,
  getContractTotalCost,
  getManagerialMargin,
  getMarginReserve,
  type MockDatasetName,
  type ContractPriority,
  type ContractStatus,
} from "@/lib/mock-contract-economics";
import { persistMockDataset, readMockDatasetFromStorage } from "@/lib/mock-dataset";

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

export function ContractsPage() {
  const searchParams = useSearchParams();
  const queryLineOfBusiness = searchParams.get("lineOfBusiness")?.trim() ?? "all";
  const queryContractId = searchParams.get("contractId")?.trim() ?? "";
  const queryDataset = searchParams.get("dataset")?.trim() === "stress" ? "stress" : null;
  const contractCardRef = useRef<HTMLElement | null>(null);

  const [dataset, setDataset] = useState<MockDatasetName>(() => {
    if (queryDataset) {
      return "stress";
    }

    if (typeof window === "undefined") {
      return "baseline";
    }

    return readMockDatasetFromStorage();
  });
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [lineOfBusinessFilter, setLineOfBusinessFilter] = useState<string>(queryLineOfBusiness || "all");
  const contractsData = useMemo(() => getContractEconomics(dataset), [dataset]);
  const [selectedContractId, setSelectedContractId] = useState<string>(queryContractId || (contractsData[0]?.id ?? ""));

  useEffect(() => {
    document.body.style.overflow = showSidePanel ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [showSidePanel]);

  useEffect(() => {
    persistMockDataset(dataset);
  }, [dataset]);

  const filteredContracts = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return contractsData.filter((contract) => {
      const lineMatch = lineOfBusinessFilter === "all" ? true : contract.lineOfBusiness === lineOfBusinessFilter;
      if (!lineMatch) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const haystack = [contract.number, contract.clientName, contract.objectName, contract.city, contract.status]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [contractsData, lineOfBusinessFilter, search]);

  const lineOfBusinessOptions = useMemo(
    () => Array.from(new Set(contractsData.map((contract) => contract.lineOfBusiness))).sort(),
    [contractsData],
  );

  const totals = useMemo(() => {
    const valueNet = filteredContracts.reduce((sum, contract) => sum + contract.valueContractNet, 0);
    const marginReserve = filteredContracts.reduce((sum, contract) => sum + getMarginReserve(contract), 0);
    const active = filteredContracts.filter((contract) => contract.status === "realizacja" || contract.status === "podpisany").length;
    const negotiation = filteredContracts.filter((contract) => contract.status === "negocjacje").length;
    const newContracts = filteredContracts.filter((contract) => contract.status === "nowy").length;
    const completed = filteredContracts.filter((contract) => contract.status === "zakończony").length;

    return { total: filteredContracts.length, valueNet, marginReserve, active, negotiation, newContracts, completed };
  }, [filteredContracts]);

  const recentContracts = [...filteredContracts].sort((left, right) => right.startDate.localeCompare(left.startDate)).slice(0, 3);

  const selectedContract = filteredContracts.find((contract) => contract.id === selectedContractId) ?? filteredContracts[0] ?? null;
  const shouldSpotlightContractCard = !!queryContractId && selectedContract?.id === queryContractId;

  useEffect(() => {
    if (!shouldSpotlightContractCard || !contractCardRef.current) {
      return;
    }

    contractCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [shouldSpotlightContractCard]);

  const selectedContractStats = useMemo(() => {
    if (!selectedContract) {
      return null;
    }

    const totalCost = getContractTotalCost(selectedContract);
    const marginReserve = getMarginReserve(selectedContract);
    const managerialMargin = getManagerialMargin(selectedContract);

    return {
      totalCost,
      marginReserve,
      managerialMargin,
    };
  }, [selectedContract]);

  const pipeline = [
    { label: "Nowe", value: totals.newContracts, color: "#f28b25" },
    { label: "Negocjacje", value: totals.negotiation, color: "#e0ad3b" },
    { label: "Podpisane", value: contractsData.filter((contract) => contract.status === "podpisany").length, color: "#4cb24f" },
    { label: "Realizacja", value: totals.active, color: "#3d8bfd" },
    { label: "Zakończone", value: totals.completed, color: "#db1832" },
  ];

  const quickTiles = [
    { title: "Aktywne kontrakty", value: totals.active, accentClass: "border-l-[#f28b25]" },
    { title: "Wartość portfela", value: currency.format(totals.valueNet), accentClass: "border-l-[#e0ad3b]" },
    { title: "Zapas marży", value: currency.format(totals.marginReserve), accentClass: "border-l-[#4cb24f]" },
    { title: "Do podpisu", value: totals.negotiation, accentClass: "border-l-[#db1832]" },
  ];

  const stageDotClass: Record<string, string> = {
    "#f28b25": "bg-[#f28b25]",
    "#e0ad3b": "bg-[#e0ad3b]",
    "#4cb24f": "bg-[#4cb24f]",
    "#3d8bfd": "bg-[#3d8bfd]",
    "#db1832": "bg-[#db1832]",
  };

  return (
    <AppShell
      title="Kontrakty"
      subtitle="Przegląd kontraktów i etapów realizacji"
      showSearch
      searchPlaceholder="Szukaj kontraktu..."
      searchValue={search}
      onSearchChange={setSearch}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {quickTiles.map((tile) => (
          <article key={tile.title} className={`card-surface rounded-xl border-l-[4px] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${tile.accentClass}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">{tile.title}</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <span className="text-3xl font-semibold text-[#383433]">{tile.value}</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(228_101_14_/_10%)] text-[var(--brand-primary)]">•</span>
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
            <select
              value={dataset}
              onChange={(event) => setDataset(event.target.value === "stress" ? "stress" : "baseline")}
              aria-label="Zestaw danych"
              className="h-10 rounded-lg border border-[rgb(107_107_107_/_16%)] bg-white px-3 text-sm text-[#383433]"
            >
              <option value="baseline">Dataset: Baseline</option>
              <option value="stress">Dataset: Stress</option>
            </select>
            <select
              value={lineOfBusinessFilter}
              onChange={(event) => setLineOfBusinessFilter(event.target.value)}
              aria-label="Filtr linii biznesowej"
              className="h-10 rounded-lg border border-[rgb(107_107_107_/_16%)] bg-white px-3 text-sm text-[#383433]"
            >
              <option value="all">Wszystkie linie</option>
              {lineOfBusinessOptions.map((line) => (
                <option key={line} value={line}>
                  {line}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`rounded-lg px-3 py-2 text-sm shadow-sm transition ${viewMode === "cards" ? "bg-white font-semibold text-[var(--brand-primary)]" : "text-[var(--brand-muted)]"}`}
            >
              Karty
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-lg px-3 py-2 text-sm shadow-sm transition ${viewMode === "list" ? "bg-white font-semibold text-[var(--brand-primary)]" : "text-[var(--brand-muted)]"}`}
            >
              Lista
            </button>
            <button type="button" className="rounded-lg px-3 py-2 text-sm text-[var(--brand-muted)]">
              Oś czasu
            </button>
            <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--brand-primary)]">
              Zobacz wszystkie
            </button>
            <button
              type="button"
              onClick={() => setShowSidePanel((current) => !current)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--brand-primary)]"
            >
              {showSidePanel ? "Ukryj panel" : "Pokaż panel"}
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-gradient-to-br from-[#e8f0d6] via-[#f7f1df] to-[#d9edf2] p-4 md:p-6">
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.45)_1px,transparent_1px)] [background-size:64px_64px]" />
          <div className="relative flex min-h-[560px] flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {pipeline.map((stage) => (
                <div key={stage.label} className="rounded-2xl border border-white/60 bg-white/72 p-4 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#4c4540]">{stage.label}</p>
                    <span className={`h-3 w-3 rounded-full ${stageDotClass[stage.color]}`} />
                  </div>
                  <p className="mt-3 text-4xl font-semibold text-[#383433]">{stage.value}</p>
                  <p className="mt-2 text-xs text-[var(--brand-muted)]">Kontrakty na obecnym etapie</p>
                </div>
              ))}
            </div>

            <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/70 bg-white/20">
              <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.4)_1px,transparent_1px)] [background-size:72px_72px]" />
              <div className="relative h-full min-h-[360px] p-4 md:p-6">
                <div className="absolute left-4 top-4 flex flex-col overflow-hidden rounded-lg border border-[rgb(107_107_107_/_24%)] bg-white shadow-sm">
                  <button type="button" className="border-b border-[rgb(107_107_107_/_18%)] px-3 py-2 text-lg leading-none">+</button>
                  <button type="button" className="px-3 py-2 text-lg leading-none">−</button>
                </div>

                <div className="absolute bottom-4 left-4 rounded-lg bg-white px-3 py-2 text-sm text-[var(--brand-muted)] shadow-sm">
                  Legenda: etap kontraktu
                </div>

                <div className="absolute left-[52%] top-[20%] flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-[#5b5f66] text-white shadow-lg">•</div>
                <div className="absolute left-[59%] top-[52%] flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-[#3d8bfd] text-white shadow-lg">5</div>
                <div className="absolute left-[48%] top-[63%] flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-[#2bbd8f] text-white shadow-lg">5</div>
                <div className="absolute left-[68%] top-[66%] flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-[#7d7e87] text-white shadow-lg">•</div>
                <div className="absolute left-[63%] top-[77%] flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-[#7d7e87] text-white shadow-lg">•</div>
                <div className="absolute left-[74%] top-[58%] flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-[#7d7e87] text-white shadow-lg">•</div>
              </div>
            </div>
          </div>
        </div>

        <div className={`fixed inset-0 z-30 transition-opacity duration-300 ease-out ${showSidePanel ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
          <button
            type="button"
            aria-label="Zamknij panel skrótów i aktywności"
            className={`absolute inset-0 bg-[#201b17]/35 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${showSidePanel ? "opacity-100" : "opacity-0"}`}
            onClick={() => setShowSidePanel(false)}
          />
          <aside
            className={`absolute right-0 top-0 h-full w-full max-w-[420px] overflow-y-auto border-l border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-4 shadow-2xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform transform-gpu md:p-6 ${
              showSidePanel ? "translate-x-0 scale-100 opacity-100" : "translate-x-full scale-[0.98] opacity-0"
            }`}
          >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[#383433]">Skróty i aktywność</h3>
                  <p className="mt-1 text-sm text-[var(--brand-muted)]">Najważniejsze działania i ostatnie zmiany</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSidePanel(false)}
                  className="rounded-lg border border-[rgb(107_107_107_/_18%)] bg-white px-3 py-2 text-xs font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]"
                >
                  Ukryj
                </button>
              </div>

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

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Lista kontraktów</h2>
            <p className="text-sm text-[var(--brand-muted)]">Lista kontraktów i wejście do karty kontraktu</p>
          </div>
          <p className="text-sm text-[var(--brand-muted)]">Kliknij kontrakt, aby zaktualizować kartę poniżej</p>
        </div>

        {viewMode === "cards" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredContracts.map((contract) => (
              <button
                key={contract.id}
                type="button"
                onClick={() => setSelectedContractId(contract.id)}
                className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  selectedContractId === contract.id
                    ? "border-[var(--brand-primary)] bg-[#fff4ea]"
                    : "border-[rgb(107_107_107_/_14%)] bg-[#faf8f6]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#383433]">{contract.objectName}</p>
                    <p className="mt-1 text-xs text-[var(--brand-muted)]">{contract.clientName}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${contractStatusClass[contract.status]}`}>
                    {contractStatusLabel[contract.status]}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--brand-muted)]">Numer</p>
                    <p className="font-medium text-[#383433]">{contract.number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--brand-muted)]">Miasto</p>
                    <p className="font-medium text-[#383433]">{contract.city}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--brand-muted)]">Start</p>
                    <p className="font-medium text-[#383433]">{contract.startDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--brand-muted)]">Koniec</p>
                    <p className="font-medium text-[#383433]">{contract.endDate}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[rgb(107_107_107_/_10%)] pt-4">
                  <div>
                    <p className="text-xs text-[var(--brand-muted)]">Wartość umowna netto</p>
                    <p className="text-lg font-semibold text-[#383433]">{currency.format(contract.valueContractNet)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusDotClass[contract.priority]}`} />
                    <span className="text-xs text-[var(--brand-muted)]">Priorytet {contract.priority}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-[rgb(107_107_107_/_14%)]">
            <table className="min-w-full border-separate border-spacing-y-2 bg-white px-3 py-2 text-sm">
              <thead>
                <tr className="text-left text-[var(--brand-muted)]">
                  <th className="px-3 py-2">Numer</th>
                  <th className="px-3 py-2">Kontrakt</th>
                  <th className="px-3 py-2">Klient</th>
                  <th className="px-3 py-2">Miasto</th>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">Koniec</th>
                  <th className="px-3 py-2">Wartość netto</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    onClick={() => setSelectedContractId(contract.id)}
                    className={`cursor-pointer rounded-lg shadow-sm ${
                      selectedContractId === contract.id ? "bg-[#fff4ea]" : "bg-[#faf8f6]"
                    }`}
                  >
                    <td className="rounded-l-lg px-3 py-3 font-medium text-[#383433]">{contract.number}</td>
                    <td className="px-3 py-3 text-[#383433]">{contract.objectName}</td>
                    <td className="px-3 py-3 text-[#383433]">{contract.clientName}</td>
                    <td className="px-3 py-3 text-[#383433]">{contract.city}</td>
                    <td className="px-3 py-3 text-[#383433]">{contract.startDate}</td>
                    <td className="px-3 py-3 text-[#383433]">{contract.endDate}</td>
                    <td className="px-3 py-3 font-medium text-[#383433]">{currency.format(contract.valueContractNet)}</td>
                    <td className="rounded-r-lg px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${contractStatusClass[contract.status]}`}>
                        {contractStatusLabel[contract.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedContract && selectedContractStats ? (
        <section
          ref={contractCardRef}
          className={`mt-6 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6 ${
            shouldSpotlightContractCard
              ? "border-2 border-[var(--brand-primary)] bg-[#fff8f1]"
              : "bg-white"
          }`}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Karta kontraktu (MVP)</h2>
              <p className="text-sm text-[var(--brand-muted)]">
                {selectedContract.number} • {selectedContract.objectName}
              </p>
            </div>
            <span className="rounded-full bg-[#fff4ea] px-3 py-1 text-xs font-semibold text-[#8e4a14]">
              Linia biznesowa: {selectedContract.lineOfBusiness}
            </span>
          </div>

          {shouldSpotlightContractCard ? (
            <div className="mt-3 rounded-xl bg-[rgb(228_101_14_/_10%)] px-3 py-2 text-xs font-semibold text-[#8e4a14]">
              Widok ustawiony z drilldown raportowego dla wybranego kontraktu.
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
              <p className="text-xs text-[var(--brand-muted)]">Wartość umowna</p>
              <p className="mt-2 text-lg font-semibold text-[#383433]">{currency.format(selectedContract.valueContractNet)}</p>
            </article>
            <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
              <p className="text-xs text-[var(--brand-muted)]">Przychody rozpoznane</p>
              <p className="mt-2 text-lg font-semibold text-[#383433]">{currency.format(selectedContract.revenueRecognizedNet)}</p>
            </article>
            <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
              <p className="text-xs text-[var(--brand-muted)]">Koszt całkowity</p>
              <p className="mt-2 text-lg font-semibold text-[#383433]">{currency.format(selectedContractStats.totalCost)}</p>
            </article>
            <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
              <p className="text-xs text-[var(--brand-muted)]">Zapas marży</p>
              <p className="mt-2 text-lg font-semibold text-[#383433]">{currency.format(selectedContractStats.marginReserve)}</p>
            </article>
            <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
              <p className="text-xs text-[var(--brand-muted)]">Marża zarządcza</p>
              <p className="mt-2 text-lg font-semibold text-[#383433]">{(selectedContractStats.managerialMargin * 100).toFixed(1)}%</p>
            </article>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-4">
              <h3 className="text-base font-semibold text-[#383433]">Struktura kosztu kontraktu</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Magazyny wirtualne</span><span className="font-semibold text-[#383433]">{currency.format(selectedContract.costBreakdown.warehouseDirectNet)}</span></div>
                <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Koszty ludzi</span><span className="font-semibold text-[#383433]">{currency.format(selectedContract.costBreakdown.laborNet)}</span></div>
                <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Koszty produkcji</span><span className="font-semibold text-[#383433]">{currency.format(selectedContract.costBreakdown.productionNet)}</span></div>
                <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Ekipy, flota, narzędzia</span><span className="font-semibold text-[#383433]">{currency.format(selectedContract.costBreakdown.crewFleetToolsNet)}</span></div>
                <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Prowizje handlowe</span><span className="font-semibold text-[#383433]">{currency.format(selectedContract.costBreakdown.salesCommissionNet)}</span></div>
              </div>
            </article>

            <article className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-4">
              <h3 className="text-base font-semibold text-[#383433]">Drilldown / audit trail</h3>
              <div className="mt-3 space-y-3">
                {selectedContract.auditTrail.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-[rgb(107_107_107_/_12%)] bg-white px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#383433]">{entry.source}</p>
                      <span className="text-xs text-[var(--brand-muted)]">{entry.recordedAt}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--brand-muted)]">{entry.description}</p>
                    <p className="mt-2 text-sm font-semibold text-[#383433]">{currency.format(entry.amountNet)}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
