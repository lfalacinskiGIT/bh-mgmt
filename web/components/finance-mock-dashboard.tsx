"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { MockInvoice } from "@/lib/mock-invoices-store";

interface InvoicesResponse {
  items: MockInvoice[];
  total: number;
}

interface FinanceMockDashboardProps {
  initialItems: MockInvoice[];
}

const currency = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 2,
});

const statusLabel: Record<MockInvoice["status"], string> = {
  issued: "Issued",
  paid: "Paid",
  overdue: "Overdue",
};

const statusClass: Record<MockInvoice["status"], string> = {
  issued: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-rose-100 text-rose-800",
};

export function FinanceMockDashboard({ initialItems }: FinanceMockDashboardProps) {
  const [items, setItems] = useState<MockInvoice[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadInvoices() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(`/api/finance/invoices?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to load invoices: ${response.status}`);
      }

      const payload = (await response.json()) as InvoicesResponse;
      setItems(payload.items ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function runSync() {
    try {
      setSyncing(true);
      setError(null);

      const response = await fetch("/api/sync/ifirma", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      await loadInvoices();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    } finally {
      setSyncing(false);
    }
  }

  const totals = useMemo(() => {
    const gross = items.reduce((sum, invoice) => sum + invoice.grossAmount, 0);
    const overdue = items
      .filter((invoice) => invoice.status === "overdue")
      .reduce((sum, invoice) => sum + invoice.grossAmount, 0);

    return {
      count: items.length,
      gross,
      overdue,
    };
  }, [items]);

  const menuDraft = [
    "Dashboard",
    "Contracts",
    "Invoices",
    "Payments",
    "Clients",
    "Reports",
    "Team",
    "Settings",
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-4 py-6 md:px-6">
      <header className="card-surface mb-6 flex items-center justify-between rounded-2xl px-4 py-3 shadow-sm md:px-6">
        <div className="flex items-center gap-4">
          <Image src="/logo-icon.png" alt="Box Haus" width={42} height={42} />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-muted)]">Prototype</p>
            <h1 className="text-xl font-semibold">Box Haus Finance Panel</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[var(--brand-muted)] px-3 py-1 text-xs font-medium text-white">
            User: Admin
          </span>
          <button
            type="button"
            onClick={() => void runSync()}
            disabled={syncing}
            className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncing ? "Syncing..." : "Synchronize (mock iFirma)"}
          </button>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="card-surface rounded-2xl p-4 shadow-sm">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--brand-muted)]">Menu draft</p>
          <ul className="space-y-2">
            {menuDraft.map((item) => (
              <li
                key={item}
                className="rounded-lg border border-[rgb(107_107_107_/_18%)] px-3 py-2 text-sm text-[var(--brand-muted)]"
              >
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="card-surface rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-[var(--brand-muted)]">Invoices count</p>
              <p className="mt-2 text-3xl font-semibold">{totals.count}</p>
            </article>
            <article className="card-surface rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-[var(--brand-muted)]">Gross value</p>
              <p className="mt-2 text-3xl font-semibold">{currency.format(totals.gross)}</p>
            </article>
            <article className="card-surface rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-[var(--brand-muted)]">Overdue value</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--brand-primary)]">
                {currency.format(totals.overdue)}
              </p>
            </article>
          </div>

          <section className="card-surface rounded-2xl p-4 shadow-sm md:p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold">Invoices (local JSON)</h2>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onBlur={() => void loadInvoices()}
                placeholder="Search by number or client"
                className="w-full rounded-xl border border-[rgb(107_107_107_/_24%)] bg-white px-3 py-2 text-sm outline-none ring-[var(--brand-primary)] focus:ring-2 md:max-w-xs"
              />
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-[var(--brand-muted)]">
                    <th className="px-3 py-2">Number</th>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Issue date</th>
                    <th className="px-3 py-2">Due date</th>
                    <th className="px-3 py-2">Gross</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-[var(--brand-muted)]">
                        Loading invoices...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-[var(--brand-muted)]">
                        No invoices found
                      </td>
                    </tr>
                  ) : (
                    items.map((invoice) => (
                      <tr key={invoice.id} className="rounded-lg bg-white shadow-sm">
                        <td className="rounded-l-lg px-3 py-3 font-medium">{invoice.number}</td>
                        <td className="px-3 py-3">{invoice.customerName}</td>
                        <td className="px-3 py-3">{invoice.issueDate}</td>
                        <td className="px-3 py-3">{invoice.dueDate}</td>
                        <td className="px-3 py-3 font-medium">{currency.format(invoice.grossAmount)}</td>
                        <td className="rounded-r-lg px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[invoice.status]}`}>
                            {statusLabel[invoice.status]}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
