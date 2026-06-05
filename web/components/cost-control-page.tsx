"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { getContractEconomics, getContractTotalCost, getManagerialMargin, getMarginReserve } from "@/lib/mock-contract-economics";
import { buildKwsControlRules, detectKwsDuplicateRisks, getOutsideContractPositions, getReconciliationBridge, getSourceCostEntries } from "@/lib/mock-reporting-controls";
import { useMockDataset } from "@/lib/use-mock-dataset";

const currency = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 2,
});

function getPreviousMonth(month: string): string {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthNumber = Number(monthRaw);

  if (Number.isNaN(year) || Number.isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return month;
  }

  if (monthNumber === 1) {
    return `${year - 1}-12`;
  }

  return `${year}-${String(monthNumber - 1).padStart(2, "0")}`;
}

export function CostControlPage() {
  const [dataset] = useMockDataset();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [presentationMode, setPresentationMode] = useState<boolean>(false);

  const contracts = useMemo(() => getContractEconomics(dataset), [dataset]);
  const sourceCostEntries = useMemo(() => getSourceCostEntries(dataset), [dataset]);
  const outsideContractPositions = useMemo(() => getOutsideContractPositions(dataset), [dataset]);

  const months = useMemo(() => {
    return Array.from(new Set(sourceCostEntries.map((entry) => entry.month))).sort((left, right) => right.localeCompare(left));
  }, [sourceCostEntries]);

  const latestMonth = months[0] ?? "";
  const anchorMonth = selectedMonth === "all" ? latestMonth : selectedMonth;
  const previousMonth = anchorMonth ? getPreviousMonth(anchorMonth) : "";

  const selectedEntries = useMemo(() => {
    if (selectedMonth === "all") {
      return sourceCostEntries;
    }

    return sourceCostEntries.filter((entry) => entry.month === selectedMonth);
  }, [selectedMonth, sourceCostEntries]);

  const totalCostNet = selectedEntries.reduce((sum, entry) => sum + entry.amountNet, 0);
  const duplicateRisks = detectKwsDuplicateRisks(selectedEntries);
  const kwsRules = buildKwsControlRules(selectedEntries);
  const bridge = getReconciliationBridge(selectedEntries, contracts, outsideContractPositions);
  const previousMonthRisk = detectKwsDuplicateRisks(sourceCostEntries.filter((entry) => entry.month === previousMonth)).reduce((sum, item) => sum + item.amountAtRiskNet, 0);
  const currentMonthRisk = detectKwsDuplicateRisks(sourceCostEntries.filter((entry) => entry.month === anchorMonth)).reduce((sum, item) => sum + item.amountAtRiskNet, 0);
  const contractCostsNet = contracts.reduce((sum, contract) => sum + getContractTotalCost(contract), 0);
  const marginReserveNet = contracts.reduce((sum, contract) => sum + getMarginReserve(contract), 0);
  const avgManagerialMarginPct = contracts.length > 0 ? (contracts.reduce((sum, contract) => sum + getManagerialMargin(contract), 0) / contracts.length) * 100 : 0;
  const sourceLedgerCostsNet = selectedEntries.reduce((sum, entry) => sum + entry.amountNet, 0);

  const costBuckets = useMemo(() => {
    const buckets = new Map<string, number>();

    for (const entry of selectedEntries) {
      buckets.set(entry.source, (buckets.get(entry.source) ?? 0) + entry.amountNet);
    }

    return Array.from(buckets.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((left, right) => right.value - left.value);
  }, [selectedEntries]);

  return (
    <AppShell
      title="Kontrola kosztów"
      subtitle="Budżet, odchylenia i kontrola KWS w układzie mock"
      showSearch={false}
    >
      <section className="grid gap-4 xl:grid-cols-4">
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#f28b25] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Koszt netto</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(totalCostNet)}</p></article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#4cb24f] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Rezerwa kontraktowa</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(marginReserveNet)}</p></article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#3d8bfd] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Śr. marża zarządcza</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{avgManagerialMarginPct.toFixed(1)}%</p></article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#db1832] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Ryzyka KWS</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{duplicateRisks.length}</p></article>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Kontrola budżetu i KWS</h2>
              <p className="text-sm text-[var(--brand-muted)]">Porównanie wykonania, rezerw i sygnałów antyduplikacyjnych</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                aria-label="Wybierz miesiąc raportowania"
                title="Wybierz miesiąc raportowania"
                className="h-10 rounded-xl border border-[rgb(107_107_107_/_18%)] bg-[#fbfaf8] px-3 text-sm text-[#383433] shadow-sm"
              >
                <option value="all">Wszystkie miesiące</option>
                {months.map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPresentationMode((current) => !current)}
                className="h-10 rounded-xl border border-[rgb(107_107_107_/_18%)] bg-white px-4 text-sm font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]"
              >
                {presentationMode ? "Tryb szczegółowy" : "Tryb prezentacji"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {costBuckets.map((bucket) => (
              <div key={bucket.category} className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-[#383433]">{bucket.category}</span>
                  <span className="text-[var(--brand-muted)]">{currency.format(bucket.value)}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div className="h-2 rounded-full bg-[var(--brand-primary)]" style={{ width: `${Math.max(18, (bucket.value / Math.max(totalCostNet, 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-[#fffaf5] p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Bridging</p><p className="mt-2 text-sm font-semibold text-[#383433]">{currency.format(bridge.find((item) => item.direction === "total")?.amountNet ?? sourceLedgerCostsNet)}</p></div>
            <div className="rounded-2xl bg-[#fffaf5] p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">KWS rules</p><p className="mt-2 text-sm font-semibold text-[#383433]">{kwsRules.length}</p></div>
            <div className="rounded-2xl bg-[#fffaf5] p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">M/m ryzyko</p><p className="mt-2 text-sm font-semibold text-[#383433]">{currency.format(currentMonthRisk - previousMonthRisk)}</p></div>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Top ryzyka</h3>
            <div className="mt-3 space-y-2">
              {duplicateRisks.slice(0, presentationMode ? 2 : 3).map((risk) => (
                <div key={`${risk.ruleCode}-${risk.referenceKey}`} className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-3 text-sm">
                  <p className="font-semibold text-[#383433]">{risk.ruleCode} • {risk.severity === "high" ? "Wysokie" : "Średnie"}</p>
                  <p className="mt-1 text-[var(--brand-muted)]">{risk.note}</p>
                  <p className="mt-2 text-[#5a524d]">{currency.format(risk.amountAtRiskNet)}</p>
                </div>
              ))}
            </div>
          </article>

          {presentationMode ? null : (
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Bridging</h3>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">{contracts.length} kontraktów i {outsideContractPositions.length} pozycji poza kontraktem</p>
            <div className="mt-3 space-y-2 text-sm text-[#5a524d]">
              <p>• Koszt kontraktowy: {currency.format(contractCostsNet)}</p>
              <p>• Koszt całkowity: {currency.format(contracts.reduce((sum, contract) => sum + getContractTotalCost(contract), 0))}</p>
              <p>• Marża zarządcza: {avgManagerialMarginPct.toFixed(1)}%</p>
            </div>
          </article>
          )}
        </aside>
      </section>
    </AppShell>
  );
}