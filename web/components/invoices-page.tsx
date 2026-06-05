"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { getContractEconomics } from "@/lib/mock-contract-economics";
import { useMockDataset } from "@/lib/use-mock-dataset";
import type { InvoiceFlowType, MockInvoice, InvoiceStatus } from "@/lib/mock-invoices-store";

interface InvoicesPageProps {
  initialInvoices: MockInvoice[];
}

const currency = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 2,
});

const statusLabel: Record<InvoiceStatus, string> = {
  issued: "Wystawiona",
  paid: "Opłacona",
  overdue: "Przeterminowana",
};

const statusClass: Record<InvoiceStatus, string> = {
  issued: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-rose-100 text-rose-800",
};

const statusFilters: Array<{ value: InvoiceStatus | "all"; label: string }> = [
  { value: "all", label: "Wszystkie" },
  { value: "issued", label: "Wystawione" },
  { value: "paid", label: "Opłacone" },
  { value: "overdue", label: "Przeterminowane" },
];

const flowTypeLabel: Record<InvoiceFlowType, string> = {
  revenue: "Przychodowa",
  cost: "Kosztowa",
};

const flowTypeClass: Record<InvoiceFlowType, string> = {
  revenue: "bg-emerald-100 text-emerald-800",
  cost: "bg-rose-100 text-rose-800",
};

function getYear(invoice: MockInvoice) {
  return new Date(invoice.issueDate).getFullYear().toString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export function InvoicesPage({ initialInvoices }: InvoicesPageProps) {
  const [dataset] = useMockDataset();
  const [invoices, setInvoices] = useState<MockInvoice[]>(initialInvoices);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(initialInvoices[0]?.id ?? null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const contracts = useMemo(() => getContractEconomics(dataset), [dataset]);
  const contractById = useMemo(() => new Map(contracts.map((contract) => [contract.id, contract])), [contracts]);

  useEffect(() => {
    document.body.style.overflow = showDetailsPanel ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [showDetailsPanel]);

  const availableYears = useMemo(() => {
    const years = new Set(invoices.map((invoice) => getYear(invoice)));
    return Array.from(years).sort((left, right) => Number(right) - Number(left));
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...invoices]
      .filter((invoice) => (statusFilter === "all" ? true : invoice.status === statusFilter))
      .filter((invoice) => (selectedYear === "all" ? true : getYear(invoice) === selectedYear))
      .filter((invoice) => {
        if (!query) {
          return true;
        }

        const haystack = [invoice.number, invoice.customerName, invoice.status, invoice.source, invoice.issueDate, invoice.dueDate]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((left, right) => right.issueDate.localeCompare(left.issueDate));
  }, [invoices, search, statusFilter, selectedYear]);

  const selectedInvoice = filteredInvoices.find((invoice) => invoice.id === selectedInvoiceId) ?? filteredInvoices[0] ?? null;

  function openDetailsPanel(invoiceId: string) {
    setSelectedInvoiceId(invoiceId);
    setShowDetailsPanel(true);
  }

  const totals = useMemo(() => {
    const gross = filteredInvoices.reduce((sum, invoice) => sum + invoice.grossAmount, 0);
    const net = filteredInvoices.reduce((sum, invoice) => sum + invoice.netAmount, 0);
    const overdue = filteredInvoices.filter((invoice) => invoice.status === "overdue").reduce((sum, invoice) => sum + invoice.grossAmount, 0);
    const paid = filteredInvoices.filter((invoice) => invoice.status === "paid").length;
    const revenueGross = filteredInvoices.filter((invoice) => invoice.flowType === "revenue").reduce((sum, invoice) => sum + invoice.grossAmount, 0);
    const costGross = filteredInvoices.filter((invoice) => invoice.flowType === "cost").reduce((sum, invoice) => sum + invoice.grossAmount, 0);

    return {
      count: filteredInvoices.length,
      net,
      gross,
      overdue,
      paid,
      revenueGross,
      costGross,
    };
  }, [filteredInvoices]);

  async function updateInvoice(invoiceId: string, changes: Partial<Pick<MockInvoice, "flowType" | "contractId">>) {
    const previous = invoices;

    setInvoices((current) =>
      current.map((invoice) =>
        invoice.id === invoiceId
          ? {
              ...invoice,
              ...changes,
            }
          : invoice,
      ),
    );

    const response = await fetch("/api/finance/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: invoiceId, ...changes }),
    });

    if (!response.ok) {
      setInvoices(previous);
      throw new Error(`Update failed: ${response.status}`);
    }
  }

  async function runSync() {
    try {
      setIsSyncing(true);
      setSyncMessage(null);

      const response = await fetch("/api/sync/optima", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const refreshed = await fetch("/api/finance/invoices");
      if (!refreshed.ok) {
        throw new Error(`Refresh failed: ${refreshed.status}`);
      }

      const payload = (await refreshed.json()) as { items: MockInvoice[] };
      setInvoices(payload.items ?? []);
      setSelectedInvoiceId(payload.items?.[0]?.id ?? null);
      setSyncMessage("Synchronizacja z Optimą zakończona. Dane zostały odświeżone.");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Nieznany błąd synchronizacji");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <AppShell
      title="Faktury"
      subtitle="Lista faktur, statusy i synchronizacja z Optimą"
      showSearch
      searchPlaceholder="Szukaj faktury lub klienta..."
      searchValue={search}
      onSearchChange={setSearch}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#f28b25] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Liczba faktur</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{totals.count}</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#e0ad3b] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Brutto</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(totals.gross)}</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#4cb24f] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Przychody brutto</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(totals.revenueGross)}</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#db1832] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Koszty brutto</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(totals.costGross)}</p>
        </article>
      </div>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Lista faktur</h2>
            <p className="text-sm text-[var(--brand-muted)]">Widok inspirowany plannerem, ale z danymi Box Haus</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl bg-[#fbfaf8] p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`rounded-lg px-3 py-2 text-sm shadow-sm transition ${viewMode === "cards" ? "bg-white font-semibold text-[var(--brand-primary)]" : "text-[var(--brand-muted)]"}`}
              >
                Karty
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`rounded-lg px-3 py-2 text-sm shadow-sm transition ${viewMode === "table" ? "bg-white font-semibold text-[var(--brand-primary)]" : "text-[var(--brand-muted)]"}`}
              >
                Lista
              </button>
            </div>

            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              aria-label="Rok faktury"
              className="h-11 rounded-xl border border-[rgb(107_107_107_/_18%)] bg-[#fbfaf8] px-3 text-sm text-[#383433] shadow-sm outline-none"
            >
              <option value="all">Wszystkie lata</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void runSync()}
              disabled={isSyncing}
              className="h-11 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSyncing ? "Synchronizacja..." : "Synchronizuj Optimę"}
            </button>

            <button
              type="button"
              onClick={() => setShowDetailsPanel((current) => !current)}
              className="h-11 rounded-xl border border-[rgb(107_107_107_/_18%)] bg-white px-4 text-sm font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]"
            >
              {showDetailsPanel ? "Ukryj panel" : "Pokaż panel"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                statusFilter === filter.value
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "bg-[#fbfaf8] text-[var(--brand-muted)] hover:bg-[#fff4ea] hover:text-[#2d2b28]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {syncMessage ? (
          <div className="mt-4 rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] px-4 py-3 text-sm text-[#6a563f]">
            {syncMessage}
          </div>
        ) : null}

        <div className="mt-5">
          <div>
            <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
              <span>Numer / Klient / Kwoty / Terminy</span>
              <span>{filteredInvoices.length} rekordów</span>
            </div>

            {viewMode === "cards" ? (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredInvoices.map((invoice) => {
                  const isSelected = selectedInvoice?.id === invoice.id;

                  return (
                    <button
                      key={invoice.id}
                      type="button"
                      onClick={() => openDetailsPanel(invoice.id)}
                      className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                        isSelected
                          ? "border-[var(--brand-primary)] bg-[#fffaf5]"
                          : "border-[rgb(107_107_107_/_14%)] bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#383433]">{invoice.number}</p>
                          <p className="mt-1 text-xs text-[var(--brand-muted)]">{invoice.customerName}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass[invoice.status]}`}>
                          {statusLabel[invoice.status]}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-[var(--brand-muted)]">Wystawiono</p>
                          <p className="font-medium text-[#383433]">{formatDate(invoice.issueDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--brand-muted)]">Termin</p>
                          <p className="font-medium text-[#383433]">{formatDate(invoice.dueDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--brand-muted)]">Netto</p>
                          <p className="font-medium text-[#383433]">{currency.format(invoice.netAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--brand-muted)]">Brutto</p>
                          <p className="font-medium text-[#383433]">{currency.format(invoice.grossAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--brand-muted)]">Typ</p>
                          <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${flowTypeClass[invoice.flowType]}`}>
                            {flowTypeLabel[invoice.flowType]}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--brand-muted)]">Kontrakt</p>
                          <p className="font-medium text-[#383433]">{invoice.contractId ? (contractById.get(invoice.contractId)?.number ?? "Nieznany") : "Niepowiązana"}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[rgb(107_107_107_/_14%)]">
                <table className="min-w-full border-separate border-spacing-y-2 bg-white px-3 py-2 text-sm">
                  <thead>
                    <tr className="text-left text-[var(--brand-muted)]">
                      <th className="px-3 py-2">Numer</th>
                      <th className="px-3 py-2">Klient</th>
                      <th className="px-3 py-2">Wystawiono</th>
                      <th className="px-3 py-2">Termin</th>
                      <th className="px-3 py-2">Netto</th>
                      <th className="px-3 py-2">Brutto</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Typ</th>
                      <th className="px-3 py-2">Kontrakt</th>
                      <th className="px-3 py-2">Źródło</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => {
                      const isSelected = selectedInvoice?.id === invoice.id;

                      return (
                        <tr
                          key={invoice.id}
                          onClick={() => openDetailsPanel(invoice.id)}
                          className={`cursor-pointer rounded-lg shadow-sm transition hover:bg-[#fff7ef] ${
                            isSelected ? "bg-[#fffaf5]" : "bg-[#faf8f6]"
                          }`}
                        >
                          <td className="rounded-l-lg px-3 py-3 font-medium text-[#383433]">{invoice.number}</td>
                          <td className="px-3 py-3 text-[#383433]">{invoice.customerName}</td>
                          <td className="px-3 py-3 text-[#383433]">{formatDate(invoice.issueDate)}</td>
                          <td className="px-3 py-3 text-[#383433]">{formatDate(invoice.dueDate)}</td>
                          <td className="px-3 py-3 text-[#383433]">{currency.format(invoice.netAmount)}</td>
                          <td className="px-3 py-3 text-[#383433]">{currency.format(invoice.grossAmount)}</td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass[invoice.status]}`}>
                              {statusLabel[invoice.status]}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${flowTypeClass[invoice.flowType]}`}>
                              {flowTypeLabel[invoice.flowType]}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-[#383433]">{invoice.contractId ? (contractById.get(invoice.contractId)?.number ?? "Nieznany") : "Niepowiązana"}</td>
                          <td className="rounded-r-lg px-3 py-3 text-[#383433]">{invoice.source === "seed" ? "Seed" : "Sync"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div
            className={`fixed inset-0 z-30 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${showDetailsPanel ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <button
              type="button"
              aria-label="Zamknij panel szczegółów faktury"
              className={`absolute inset-0 bg-[#201b17]/35 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${showDetailsPanel ? "opacity-100" : "opacity-0"}`}
              onClick={() => setShowDetailsPanel(false)}
            />
            <aside
              className={`absolute right-0 top-0 h-full w-full max-w-[420px] overflow-y-auto border-l border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-4 shadow-2xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform transform-gpu md:p-6 ${
                showDetailsPanel ? "translate-x-0 scale-100 opacity-100" : "translate-x-full scale-[0.98] opacity-0"
              }`}
            >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[#383433]">Szczegóły i akcje</h3>
                    <p className="mt-1 text-sm text-[var(--brand-muted)]">Wybrana faktura i szybkie działania</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDetailsPanel(false)}
                    className="rounded-lg border border-[rgb(107_107_107_/_18%)] bg-white px-3 py-2 text-xs font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]"
                  >
                    Ukryj
                  </button>
                </div>

                {selectedInvoice ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Wybrana faktura</p>
                      <p className="mt-1 text-lg font-semibold text-[#383433]">{selectedInvoice.number}</p>
                      <p className="text-sm text-[var(--brand-muted)]">{selectedInvoice.customerName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs text-[var(--brand-muted)]">Status</p>
                        <p className="mt-1 font-semibold text-[#383433]">{statusLabel[selectedInvoice.status]}</p>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs text-[var(--brand-muted)]">Źródło</p>
                        <p className="mt-1 font-semibold text-[#383433]">{selectedInvoice.source === "seed" ? "Seed" : "Sync"}</p>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs text-[var(--brand-muted)]">Typ dokumentu</p>
                        <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${flowTypeClass[selectedInvoice.flowType]}`}>
                          {flowTypeLabel[selectedInvoice.flowType]}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs text-[var(--brand-muted)]">Netto</p>
                        <p className="mt-1 font-semibold text-[#383433]">{currency.format(selectedInvoice.netAmount)}</p>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs text-[var(--brand-muted)]">Brutto</p>
                        <p className="mt-1 font-semibold text-[#383433]">{currency.format(selectedInvoice.grossAmount)}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                      <p className="text-sm font-semibold text-[#383433]">Powiązanie biznesowe</p>
                      <div className="mt-3 space-y-2">
                        <label className="block text-xs text-[var(--brand-muted)]" htmlFor="invoice-flow-type">Typ faktury</label>
                        <select
                          id="invoice-flow-type"
                          value={selectedInvoice.flowType}
                          onChange={(event) => {
                            void updateInvoice(selectedInvoice.id, { flowType: event.target.value as InvoiceFlowType });
                          }}
                          className="h-10 w-full rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#fbfaf8] px-3 text-sm text-[#383433]"
                        >
                          <option value="revenue">Przychodowa</option>
                          <option value="cost">Kosztowa</option>
                        </select>

                        <label className="block text-xs text-[var(--brand-muted)]" htmlFor="invoice-contract-link">Powiązanie z kontraktem</label>
                        <select
                          id="invoice-contract-link"
                          value={selectedInvoice.contractId ?? ""}
                          onChange={(event) => {
                            const nextContractId = event.target.value || null;
                            void updateInvoice(selectedInvoice.id, { contractId: nextContractId });
                          }}
                          className="h-10 w-full rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#fbfaf8] px-3 text-sm text-[#383433]"
                        >
                          <option value="">Niepowiązana</option>
                          {contracts.map((contract) => (
                            <option key={contract.id} value={contract.id}>
                              {contract.number} • {contract.clientName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                      <p className="text-sm font-semibold text-[#383433]">Szybkie działania</p>
                      <div className="mt-3 flex flex-col gap-2">
                        <button type="button" className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white">
                          Otwórz fakturę
                        </button>
                        <button type="button" className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white px-4 py-2 text-sm font-semibold text-[#383433]">
                          Powiąż z kontraktem
                        </button>
                        <button type="button" className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white px-4 py-2 text-sm font-semibold text-[#383433]">
                          Wyślij przypomnienie
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#fff4ea] px-4 py-4 text-[#8e4a14] shadow-inner">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]">Podsumowanie</p>
                      <p className="mt-1 text-sm text-[#8c6a53]">Ten widok jest bazą do dalszego rozbudowania szczegółów faktury.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-white px-4 py-6 text-sm text-[var(--brand-muted)] shadow-sm">
                    Brak faktury do wyświetlenia.
                  </div>
                )}
            </aside>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
