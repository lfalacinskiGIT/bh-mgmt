"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { getContractEconomics } from "@/lib/mock-contract-economics";
import { useMockDataset } from "@/lib/use-mock-dataset";
import type { MockInvoice } from "@/lib/mock-invoices-store";

interface PaymentsPageProps {
  initialInvoices: MockInvoice[];
}

const currency = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 2,
});

export function PaymentsPage({ initialInvoices }: PaymentsPageProps) {
  const [dataset] = useMockDataset();
  const [search, setSearch] = useState("");

  const contracts = useMemo(() => getContractEconomics(dataset), [dataset]);
  const contractById = useMemo(() => new Map(contracts.map((contract) => [contract.id, contract])), [contracts]);

  const sortedInvoices = useMemo(
    () => [...initialInvoices].sort((left, right) => right.dueDate.localeCompare(left.dueDate)),
    [initialInvoices],
  );

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return sortedInvoices;
    }

    return sortedInvoices.filter((invoice) => {
      const haystack = [invoice.number, invoice.customerName, invoice.status, invoice.source, invoice.issueDate, invoice.dueDate]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [search, sortedInvoices]);

  const totals = useMemo(() => {
    const overdue = filtered.filter((invoice) => invoice.status === "overdue");
    const paid = filtered.filter((invoice) => invoice.status === "paid");
    const expected = filtered.filter((invoice) => invoice.status !== "paid").reduce((sum, invoice) => sum + invoice.grossAmount, 0);
    const revenue = filtered.filter((invoice) => invoice.flowType === "revenue").reduce((sum, invoice) => sum + invoice.grossAmount, 0);
    const cost = filtered.filter((invoice) => invoice.flowType === "cost").reduce((sum, invoice) => sum + invoice.grossAmount, 0);

    return {
      count: filtered.length,
      overdueGross: overdue.reduce((sum, invoice) => sum + invoice.grossAmount, 0),
      overdueCount: overdue.length,
      paidCount: paid.length,
      expected,
      revenue,
      cost,
    };
  }, [filtered]);

  return (
    <AppShell
      title="Płatności"
      subtitle="Należności, terminy i działania windykacyjne w makiecie"
      showSearch
      searchPlaceholder="Szukaj płatności lub faktury..."
      searchValue={search}
      onSearchChange={setSearch}
    >
      <section className="grid gap-4 xl:grid-cols-4">
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#f28b25] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Rekordy</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{totals.count}</p></article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#db1832] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Po terminie</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{totals.overdueCount}</p></article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#4cb24f] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Przychody brutto</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(totals.revenue)}</p></article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#3d8bfd] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Koszty brutto</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(totals.cost)}</p></article>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Harmonogram przepływów</h2>
              <p className="text-sm text-[var(--brand-muted)]">Faktury przychodowe i kosztowe z powiązaniami do kontraktów</p>
            </div>
            <Link href="/faktury" className="text-sm font-semibold text-[var(--brand-primary)]">Otwórz faktury</Link>
          </div>

          <div className="mt-4 grid gap-3">
            {filtered.slice(0, 8).map((invoice) => {
              const overdue = invoice.status === "overdue";
              const paid = invoice.status === "paid";

              return (
                <article key={invoice.id} className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#383433]">{invoice.customerName}</p>
                      <p className="mt-1 text-xs text-[var(--brand-muted)]">{invoice.number} • {invoice.source}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`rounded-full px-3 py-1 text-xs font-semibold ${invoice.flowType === "revenue" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {invoice.flowType === "revenue" ? "Przychodowa" : "Kosztowa"}
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-semibold ${overdue ? "bg-rose-100 text-rose-800" : paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {invoice.status}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-[#5a524d] md:grid-cols-3">
                    <div><span className="block text-[var(--brand-muted)]">Netto</span><span className="font-medium text-[#383433]">{currency.format(invoice.netAmount)}</span></div>
                    <div><span className="block text-[var(--brand-muted)]">Brutto</span><span className="font-medium text-[#383433]">{currency.format(invoice.grossAmount)}</span></div>
                    <div><span className="block text-[var(--brand-muted)]">Termin</span><span className="font-medium text-[#383433]">{invoice.dueDate}</span></div>
                  </div>
                  <p className="mt-2 text-xs text-[var(--brand-muted)]">Kontrakt: {invoice.contractId ? (contractById.get(invoice.contractId)?.number ?? "Nieznany") : "Niepowiązana"}</p>
                </article>
              );
            })}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Kwota zagrożona</h3>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">Brutto oczekujące na ściągnięcie lub przypomnienie</p>
            <p className="mt-4 text-3xl font-semibold text-[#383433]">{currency.format(totals.overdueGross)}</p>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Działania</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#5a524d]">
              <li>• Wyślij przypomnienia do pozycji po terminie.</li>
              <li>• Uzupełnij typ dokumentu: przychodowy lub kosztowy.</li>
              <li>• Podłącz faktury do kontraktów bezpośrednio z widoku Faktury.</li>
              <li>• Przenieś informacje o należnościach do raportów tygodniowych.</li>
            </ul>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}