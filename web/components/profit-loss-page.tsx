"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { normalizeMockDataset } from "@/lib/mock-dataset";
import type { MockDatasetName } from "@/lib/mock-contract-economics";
import { getProfitLossAvailablePeriods, getProfitLossSummary, type ProfitLossPeriod } from "@/lib/mock-profit-loss";

const currency = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 2,
});

function amountClass(value: number): string {
  return value >= 0 ? "text-emerald-700" : "text-rose-700";
}

export function ProfitLossPage() {
  const [dataset, setDataset] = useState<MockDatasetName>("baseline");
  const [period, setPeriod] = useState<ProfitLossPeriod>("all");

  const availablePeriods = useMemo(() => getProfitLossAvailablePeriods(dataset), [dataset]);
  const summary = useMemo(() => getProfitLossSummary(dataset, period), [dataset, period]);

  return (
    <AppShell title="P&L" subtitle="Zarządczy rachunek wyników i bridge do ekonomiki kontraktów" showSearch={false}>
      <section className="grid gap-4 xl:grid-cols-4">
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#4cb24f] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Przychody razem</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(summary.revenueTotalNet)}</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#f28b25] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Marża brutto</p>
          <p className={`mt-2 text-3xl font-semibold ${amountClass(summary.grossMarginNet)}`}>{currency.format(summary.grossMarginNet)}</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#3d8bfd] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Wynik operacyjny</p>
          <p className={`mt-2 text-3xl font-semibold ${amountClass(summary.operatingResultNet)}`}>{currency.format(summary.operatingResultNet)}</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#db1832] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Różnica bridge</p>
          <p className={`mt-2 text-3xl font-semibold ${amountClass(-Math.abs(summary.bridgeDifferenceNet))}`}>{currency.format(summary.bridgeDifferenceNet)}</p>
        </article>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">P&L zarządczy</h2>
            <p className="text-sm text-[var(--brand-muted)]">Łączenie danych kontraktowych, kosztów poza kontraktami i alokacji czasu pracy</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <select
              value={dataset}
              onChange={(event) => setDataset(normalizeMockDataset(event.target.value))}
              className="h-10 rounded-xl border border-[rgb(107_107_107_/_18%)] bg-[#fbfaf8] px-3 text-sm text-[#383433]"
            >
              <option value="baseline">Zestaw: Bazowy</option>
              <option value="stress">Zestaw: Stresowy</option>
              <option value="incomplete">Zestaw: Niekompletny</option>
            </select>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="h-10 rounded-xl border border-[rgb(107_107_107_/_18%)] bg-[#fbfaf8] px-3 text-sm text-[#383433]"
            >
              <option value="all">Wszystkie okresy</option>
              <option value="ytd">YTD</option>
              {availablePeriods.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] px-4 py-3 text-sm text-[#6a563f]">
          Okres raportu: {summary.periodLabel}
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[rgb(107_107_107_/_14%)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f7f4ef] text-left text-[11px] uppercase tracking-[0.1em] text-[var(--brand-muted)]">
              <tr>
                <th className="px-3 py-2">Pozycja P&L</th>
                <th className="px-3 py-2">Kwota netto</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[rgb(107_107_107_/_10%)]"><td className="px-3 py-2 font-semibold text-[#383433]">Przychody kontraktowe</td><td className="px-3 py-2 text-[#383433]">{currency.format(summary.revenueContractNet)}</td></tr>
              <tr className="border-t border-[rgb(107_107_107_/_10%)]"><td className="px-3 py-2 font-semibold text-[#383433]">Przychody poza kontraktami</td><td className="px-3 py-2 text-[#383433]">{currency.format(summary.revenueOutsideNet)}</td></tr>
              <tr className="border-t border-[rgb(107_107_107_/_10%)]"><td className="px-3 py-2 font-semibold text-[#383433]">Koszty kontraktowe (źródłowe)</td><td className="px-3 py-2 text-[#383433]">{currency.format(summary.costsContractNet)}</td></tr>
              <tr className="border-t border-[rgb(107_107_107_/_10%)]"><td className="px-3 py-2 font-semibold text-[#383433]">Koszty poza kontraktami (źródłowe)</td><td className="px-3 py-2 text-[#383433]">{currency.format(summary.costsOutsideNet)}</td></tr>
              <tr className="border-t border-[rgb(107_107_107_/_10%)]"><td className="px-3 py-2 font-semibold text-[#383433]">Payroll alokowany na kontrakty (z czasu pracy)</td><td className="px-3 py-2 text-[#383433]">{currency.format(summary.payrollAllocatedToContractsNet)}</td></tr>
              <tr className="border-t border-[rgb(107_107_107_/_10%)]"><td className="px-3 py-2 font-semibold text-[#383433]">Payroll poza kontraktami (z czasu pracy)</td><td className="px-3 py-2 text-[#383433]">{currency.format(summary.payrollOutsideContractsNet)}</td></tr>
              <tr className="border-t border-[rgb(107_107_107_/_10%)]"><td className="px-3 py-2 font-semibold text-[#383433]">Korekty modelowe poza kontraktami</td><td className="px-3 py-2 text-[#383433]">{currency.format(summary.outsideModelAdjustmentsNet)}</td></tr>
              <tr className="border-t border-[rgb(107_107_107_/_10%)] bg-[#fff4ea]"><td className="px-3 py-2 text-base font-semibold text-[#383433]">Wynik operacyjny (zarządczy)</td><td className={`px-3 py-2 text-base font-semibold ${amountClass(summary.operatingResultNet)}`}>{currency.format(summary.operatingResultNet)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Bridge do ekonomiki kontraktów</h3>
          <p className="mt-2 text-sm text-[var(--brand-muted)]">Różnica pomiędzy modelem P&L a uzgodnieniem kontraktowym</p>
          <div className="mt-4 rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] px-4 py-3">
            <p className="text-xs text-[var(--brand-muted)]">Różnica bridge</p>
            <p className={`mt-1 text-xl font-semibold ${amountClass(-Math.abs(summary.bridgeDifferenceNet))}`}>{currency.format(summary.bridgeDifferenceNet)}</p>
          </div>
          <p className="mt-3 text-sm text-[var(--brand-muted)]">Wartość powinna być redukowana przez poprawę jakości mapowań źródeł i reguł alokacji czasu pracy.</p>
        </article>

        <aside className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Nawigacja powiązana</h3>
          <div className="mt-3 grid gap-2">
            <Link href={`/raporty?dataset=${encodeURIComponent(dataset)}`} className="rounded-xl border border-[rgb(107_107_107_/_18%)] bg-white px-4 py-3 text-sm font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]">
              Otwórz Raporty (uzgodnienie)
            </Link>
            <Link href={`/kontrakty?dataset=${encodeURIComponent(dataset)}`} className="rounded-xl border border-[rgb(107_107_107_/_18%)] bg-white px-4 py-3 text-sm font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]">
              Otwórz Kontrakty
            </Link>
            <Link href={`/czas-pracy?dataset=${encodeURIComponent(dataset)}`} className="rounded-xl border border-[rgb(107_107_107_/_18%)] bg-white px-4 py-3 text-sm font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]">
              Otwórz Czas pracy
            </Link>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
