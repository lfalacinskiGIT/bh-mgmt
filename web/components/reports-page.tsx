"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { getContractEconomics, type MockDatasetName } from "@/lib/mock-contract-economics";
import type { MockInvoice } from "@/lib/mock-invoices-store";
import { persistMockDataset, readMockDatasetFromStorage } from "@/lib/mock-dataset";
import {
  getContractEconomicsTotals,
  getLineOfBusinessSummary,
  getSourceRecords,
} from "@/lib/mock-management-reports";
import {
  buildKwsControlRules,
  detectKwsDuplicateRisks,
  getOutsideContractPositions,
  getReconciliationBridge,
  getContractReconciliationSnapshot,
  getSourceCostEntries,
} from "@/lib/mock-reporting-controls";

interface ReportsPageProps {
  initialInvoices: MockInvoice[];
}

const currency = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 2,
});

function csvEscape(value: string | number): string {
  const text = String(value ?? "");
  if (text.includes(";") || text.includes("\n") || text.includes("\"")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(fileName: string, headers: string[], rows: Array<Array<string | number>>) {
  const headerLine = headers.map(csvEscape).join(";");
  const rowLines = rows.map((row) => row.map(csvEscape).join(";"));
  const csvContent = [headerLine, ...rowLines].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getMonth(value: string) {
  return value.slice(0, 7);
}

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

function matchesPeriod(period: string, month: string, latestPeriod: string): boolean {
  if (period === "all") {
    return true;
  }

  if (period === "ytd") {
    const currentYear = latestPeriod.slice(0, 4);
    return month.startsWith(`${currentYear}-`);
  }

  return period === month;
}

export function ReportsPage({ initialInvoices }: ReportsPageProps) {
  const [dataset, setDataset] = useState<MockDatasetName>(() => readMockDatasetFromStorage());
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  useEffect(() => {
    persistMockDataset(dataset);
  }, [dataset]);

  const contractsData = useMemo(() => getContractEconomics(dataset), [dataset]);
  const sourceRecords = useMemo(() => getSourceRecords(dataset), [dataset]);
  const sourceCostEntries = useMemo(() => getSourceCostEntries(dataset), [dataset]);
  const outsideContractPositions = useMemo(() => getOutsideContractPositions(dataset), [dataset]);

  const contractTotals = getContractEconomicsTotals(contractsData);
  const lineSummary = getLineOfBusinessSummary(contractsData);

  const lineSummaryWithDrilldown = useMemo(() => {
    return lineSummary.map((line) => {
      const firstContract = contractsData.find((contract) => contract.lineOfBusiness === line.lineOfBusiness);
      return {
        ...line,
        primaryContractId: firstContract?.id ?? "",
      };
    });
  }, [contractsData, lineSummary]);

  const availablePeriods = useMemo(() => {
    const months = new Set<string>();

    for (const record of sourceRecords) {
      months.add(getMonth(record.postedAt));
    }

    for (const entry of sourceCostEntries) {
      months.add(entry.month);
    }

    return Array.from(months).sort((left, right) => right.localeCompare(left));
  }, [sourceCostEntries, sourceRecords]);

  const latestPeriod = availablePeriods[0] ?? "";

  const filteredManagementRecords = useMemo(
    () =>
      sourceRecords.filter((record) =>
        matchesPeriod(selectedPeriod, getMonth(record.postedAt), latestPeriod),
      ),
    [latestPeriod, selectedPeriod, sourceRecords],
  );

  const filteredCostEntries = useMemo(
    () => sourceCostEntries.filter((entry) => matchesPeriod(selectedPeriod, entry.month, latestPeriod)),
    [latestPeriod, selectedPeriod, sourceCostEntries],
  );

  const companyRevenueNet = filteredManagementRecords
    .filter((record) => record.type === "revenue")
    .reduce((sum, record) => sum + record.netAmount, 0);

  const companyCostNet = filteredManagementRecords
    .filter((record) => record.type === "cost")
    .reduce((sum, record) => sum + record.netAmount, 0);

  const contractRevenueNet = filteredManagementRecords
    .filter((record) => record.type === "revenue" && !!record.contractId)
    .reduce((sum, record) => sum + record.netAmount, 0);

  const contractCostNet = filteredManagementRecords
    .filter((record) => record.type === "cost" && !!record.contractId)
    .reduce((sum, record) => sum + record.netAmount, 0);

  const outsideContractsRevenueNet = filteredManagementRecords
    .filter((record) => record.type === "revenue" && !record.contractId)
    .reduce((sum, record) => sum + record.netAmount, 0);

  const outsideContractsCostNet = filteredManagementRecords
    .filter((record) => record.type === "cost" && !record.contractId)
    .reduce((sum, record) => sum + record.netAmount, 0);

  const deltaRevenueNet = companyRevenueNet - (contractRevenueNet + outsideContractsRevenueNet);
  const deltaCostNet = companyCostNet - (contractCostNet + outsideContractsCostNet);

  const kwsRisks = detectKwsDuplicateRisks(filteredCostEntries);
  const kwsRules = buildKwsControlRules(filteredCostEntries);
  const reconciliationSnapshot = getContractReconciliationSnapshot(filteredCostEntries, contractsData, outsideContractPositions);
  const reconciliationBridge = getReconciliationBridge(filteredCostEntries, contractsData, outsideContractPositions);

  const anchorMonth = selectedPeriod === "all" || selectedPeriod === "ytd" ? latestPeriod : selectedPeriod;
  const previousMonth = anchorMonth ? getPreviousMonth(anchorMonth) : "";

  const currentMonthRiskAtRisk = detectKwsDuplicateRisks(
    sourceCostEntries.filter((entry) => entry.month === anchorMonth),
  ).reduce((sum, risk) => sum + risk.amountAtRiskNet, 0);

  const previousMonthRiskAtRisk = detectKwsDuplicateRisks(
    sourceCostEntries.filter((entry) => entry.month === previousMonth),
  ).reduce((sum, risk) => sum + risk.amountAtRiskNet, 0);

  const monthOverMonthDelta = currentMonthRiskAtRisk - previousMonthRiskAtRisk;
  const monthOverMonthDeltaPct = previousMonthRiskAtRisk > 0 ? (monthOverMonthDelta / previousMonthRiskAtRisk) * 100 : 0;

  const selectedPeriodLabel =
    selectedPeriod === "all"
      ? "Wszystkie okresy"
      : selectedPeriod === "ytd"
        ? `YTD ${latestPeriod.slice(0, 4)}`
        : selectedPeriod;

  const invoicesNet = initialInvoices.reduce((sum, invoice) => sum + invoice.netAmount, 0);
  const invoicesCount = initialInvoices.length;

  function exportLineSummaryCsv() {
    const rows = lineSummaryWithDrilldown.map((line) => {
      const managerialMargin = line.recognizedRevenueNet > 0
        ? ((line.recognizedRevenueNet - line.totalCostNet) / line.recognizedRevenueNet) * 100
        : 0;

      return [
        line.lineOfBusiness,
        line.contractsCount,
        line.contractValueNet,
        line.recognizedRevenueNet,
        line.totalCostNet,
        line.marginReserveNet,
        managerialMargin.toFixed(1),
      ];
    });

    downloadCsv(
      `podsumowanie-linii-biznesowych-${selectedPeriod === "ytd" ? `ytd-${latestPeriod.slice(0, 4)}` : selectedPeriod}.csv`,
      [
        "linia_biznesowa",
        "kontrakty",
        "wartosc_umowna_netto",
        "przychody_rozpoznane_netto",
        "koszt_netto",
        "zapas_marzy_netto",
        "marza_zarzadcza_proc",
      ],
      rows,
    );
  }

  function exportKwsRisksCsv() {
    const rows = kwsRisks.map((risk) => [
      risk.severity,
      risk.ruleCode,
      risk.contractId ?? "Poza kontraktem",
      risk.referenceKey,
      risk.amountNet,
      risk.amountAtRiskNet,
      risk.note,
    ]);

    downloadCsv(
      `kws-ryzyka-antydublety-${selectedPeriod === "ytd" ? `ytd-${latestPeriod.slice(0, 4)}` : selectedPeriod}.csv`,
      ["severity", "rule_code", "contract", "reference", "amount_net", "amount_at_risk_net", "note"],
      rows,
    );
  }

  return (
    <AppShell title="Raporty" subtitle="Podsumowanie ekonomiki kontraktów i uzgodnienie firmy" showSearch={false}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#f28b25] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Wartość kontraktów</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(contractTotals.contractValueNet)}</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#e0ad3b] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Przychody rozpoznane</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(contractTotals.recognizedRevenueNet)}</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#4cb24f] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Koszt kontraktowy</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(contractTotals.totalCostNet)}</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#db1832] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Zapas marży</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(contractTotals.marginReserveNet)}</p>
        </article>
      </div>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Podsumowanie linii biznesowych</h2>
            <p className="text-sm text-[var(--brand-muted)]">Agregacja kontraktów Box Haus / Erdol z marżą zarządczą</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={dataset}
              onChange={(event) => setDataset(event.target.value === "stress" ? "stress" : "baseline")}
              aria-label="Zestaw danych"
              className="h-10 rounded-xl border border-[rgb(107_107_107_/_18%)] bg-[#fbfaf8] px-3 text-sm text-[#383433]"
            >
              <option value="baseline">Dataset: Baseline</option>
              <option value="stress">Dataset: Stress</option>
            </select>
            <select
              value={selectedPeriod}
              onChange={(event) => setSelectedPeriod(event.target.value)}
              aria-label="Filtr okresu"
              className="h-10 rounded-xl border border-[rgb(107_107_107_/_18%)] bg-[#fbfaf8] px-3 text-sm text-[#383433]"
            >
              <option value="all">Wszystkie okresy</option>
              <option value="ytd">YTD {latestPeriod.slice(0, 4)}</option>
              {availablePeriods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportLineSummaryCsv}
              className="h-10 rounded-xl border border-[rgb(107_107_107_/_18%)] bg-white px-4 text-sm font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]"
            >
              Eksport CSV
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[rgb(107_107_107_/_14%)]">
          <table className="min-w-full border-separate border-spacing-y-2 bg-white px-3 py-2 text-sm">
            <thead>
              <tr className="text-left text-[var(--brand-muted)]">
                <th className="px-3 py-2">Linia biznesowa</th>
                <th className="px-3 py-2">Kontrakty</th>
                <th className="px-3 py-2">Wartość umowna</th>
                <th className="px-3 py-2">Przychody</th>
                <th className="px-3 py-2">Koszt</th>
                <th className="px-3 py-2">Zapas marży</th>
                <th className="px-3 py-2">Marża zarządcza</th>
              </tr>
            </thead>
            <tbody>
              {lineSummaryWithDrilldown.map((line) => {
                const managerialMargin = line.recognizedRevenueNet > 0
                  ? (line.recognizedRevenueNet - line.totalCostNet) / line.recognizedRevenueNet
                  : 0;

                const rowContent = (
                  <>
                    <td className="rounded-l-lg px-3 py-3 font-semibold text-[#383433]">{line.lineOfBusiness}</td>
                    <td className="px-3 py-3 text-[#383433]">{line.contractsCount}</td>
                    <td className="px-3 py-3 font-medium text-[#383433]">{currency.format(line.contractValueNet)}</td>
                    <td className="px-3 py-3 text-[#383433]">{currency.format(line.recognizedRevenueNet)}</td>
                    <td className="px-3 py-3 text-[#383433]">{currency.format(line.totalCostNet)}</td>
                    <td className="px-3 py-3 font-semibold text-[#383433]">{currency.format(line.marginReserveNet)}</td>
                    <td className="rounded-r-lg px-3 py-3 font-semibold text-[#383433]">{(managerialMargin * 100).toFixed(1)}%</td>
                  </>
                );

                if (!line.primaryContractId) {
                  return (
                    <tr key={line.lineOfBusiness} className="rounded-lg bg-[#faf8f6] shadow-sm">
                      {rowContent}
                    </tr>
                  );
                }

                return (
                  <tr key={line.lineOfBusiness} className="rounded-lg bg-[#faf8f6] shadow-sm transition hover:bg-[#fff4ea]">
                    <td colSpan={7} className="p-0">
                      <Link
                        href={`/kontrakty?dataset=${encodeURIComponent(dataset)}&lineOfBusiness=${encodeURIComponent(line.lineOfBusiness)}&contractId=${encodeURIComponent(line.primaryContractId)}`}
                        className="grid grid-cols-7"
                      >
                        {rowContent}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Uzgodnienie: kontrakty vs poza kontraktami</h2>
            <p className="text-sm text-[var(--brand-muted)]">MVP opcji 1 z filtrem okresu dla zapisów źródłowych</p>
          </div>
          <p className="text-sm text-[var(--brand-muted)]">{selectedPeriodLabel} • dataset: {dataset} • rekordy źródłowe: {filteredManagementRecords.length}</p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand-muted)]">Kontrakty</h3>
            <p className="mt-3 text-sm text-[#383433]">Przychody: <strong>{currency.format(contractRevenueNet)}</strong></p>
            <p className="mt-1 text-sm text-[#383433]">Koszty: <strong>{currency.format(contractCostNet)}</strong></p>
          </article>

          <article className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand-muted)]">Poza kontraktami</h3>
            <p className="mt-3 text-sm text-[#383433]">Przychody: <strong>{currency.format(outsideContractsRevenueNet)}</strong></p>
            <p className="mt-1 text-sm text-[#383433]">Koszty: <strong>{currency.format(outsideContractsCostNet)}</strong></p>
          </article>

          <article className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#fff4ea] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#8e4a14]">Firma (zapisy źródłowe)</h3>
            <p className="mt-3 text-sm text-[#383433]">Przychody: <strong>{currency.format(companyRevenueNet)}</strong></p>
            <p className="mt-1 text-sm text-[#383433]">Koszty: <strong>{currency.format(companyCostNet)}</strong></p>
            <p className="mt-1 text-sm text-[#383433]">Wynik: <strong>{currency.format(companyRevenueNet - companyCostNet)}</strong></p>
          </article>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-4">
            <p className="text-xs text-[var(--brand-muted)]">Delta przychodów (firma - uzgodnione)</p>
            <p className={`mt-2 text-lg font-semibold ${deltaRevenueNet === 0 ? "text-[#4cb24f]" : "text-[#db1832]"}`}>
              {currency.format(deltaRevenueNet)}
            </p>
          </article>
          <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-4">
            <p className="text-xs text-[var(--brand-muted)]">Delta kosztów (firma - uzgodnione)</p>
            <p className={`mt-2 text-lg font-semibold ${deltaCostNet === 0 ? "text-[#4cb24f]" : "text-[#db1832]"}`}>
              {currency.format(deltaCostNet)}
            </p>
          </article>
        </div>

        <div className="mt-4 rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] px-4 py-3 text-sm text-[#6a563f]">
          Dane fakturowe (Optima sync): {invoicesCount} dokumentów, {currency.format(invoicesNet)} netto.
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-4">
            <p className="text-xs text-[var(--brand-muted)]">Model kontraktowy + poza kontraktami</p>
            <p className="mt-2 text-lg font-semibold text-[#383433]">{currency.format(reconciliationSnapshot.totalModelCostsNet)}</p>
          </article>
          <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-4">
            <p className="text-xs text-[var(--brand-muted)]">Koszty z zapisów źródłowych</p>
            <p className="mt-2 text-lg font-semibold text-[#383433]">{currency.format(reconciliationSnapshot.sourceLedgerCostsNet)}</p>
          </article>
          <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-4">
            <p className="text-xs text-[var(--brand-muted)]">Różnica niewyjaśniona</p>
            <p className="mt-2 text-lg font-semibold text-[#383433]">{currency.format(reconciliationSnapshot.unexplainedDifferenceNet)}</p>
          </article>
        </div>

        <div className="mt-5 rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <h3 className="text-base font-semibold text-[#383433]">Difference bridge</h3>
            <span className="text-xs text-[var(--brand-muted)]">Krokowe wyjaśnienie różnicy kosztowej</span>
          </div>
          <div className="mt-3 space-y-2">
            {reconciliationBridge.map((item) => (
              <div key={item.id} className="rounded-xl border border-[rgb(107_107_107_/_12%)] bg-white px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#383433]">{item.label}</p>
                  <span
                    className={`text-sm font-semibold ${
                      item.direction === "plus"
                        ? "text-[#2d8a2f]"
                        : item.direction === "minus"
                          ? "text-[#db1832]"
                          : "text-[#383433]"
                    }`}
                  >
                    {item.direction === "plus" ? "+ " : item.direction === "minus" ? "- " : "= "}
                    {currency.format(item.amountNet)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--brand-muted)]">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Kontrola KWS i anty-dublety</h2>
            <p className="text-sm text-[var(--brand-muted)]">Reguły ostrzegawcze z filtrem okresu i eksportem CSV</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--brand-muted)]">
            <span>Wysokie: {kwsRisks.filter((risk) => risk.severity === "high").length}</span>
            <span>|</span>
            <span>Średnie: {kwsRisks.filter((risk) => risk.severity === "medium").length}</span>
            <button
              type="button"
              onClick={exportKwsRisksCsv}
              className="ml-2 h-10 rounded-xl border border-[rgb(107_107_107_/_18%)] bg-white px-4 text-sm font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]"
            >
              Eksport CSV
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-4">
            <p className="text-xs text-[var(--brand-muted)]">KWS risk at risk ({anchorMonth || "n/d"})</p>
            <p className="mt-2 text-lg font-semibold text-[#383433]">{currency.format(currentMonthRiskAtRisk)}</p>
          </article>
          <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-4">
            <p className="text-xs text-[var(--brand-muted)]">KWS risk at risk ({previousMonth || "n/d"})</p>
            <p className="mt-2 text-lg font-semibold text-[#383433]">{currency.format(previousMonthRiskAtRisk)}</p>
          </article>
          <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-4">
            <p className="text-xs text-[var(--brand-muted)]">Zmiana m/m</p>
            <p className={`mt-2 text-lg font-semibold ${monthOverMonthDelta > 0 ? "text-[#db1832]" : monthOverMonthDelta < 0 ? "text-[#4cb24f]" : "text-[#383433]"}`}>
              {currency.format(monthOverMonthDelta)}
            </p>
            <p className="mt-1 text-xs text-[var(--brand-muted)]">{monthOverMonthDeltaPct.toFixed(1)}%</p>
          </article>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {kwsRules.map((rule) => (
            <article key={rule.id} className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[#383433]">{rule.name}</h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    rule.status === "critical"
                      ? "bg-rose-100 text-rose-800"
                      : rule.status === "warning"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {rule.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--brand-muted)]">{rule.description}</p>
              <p className="mt-2 text-sm text-[#383433]">{rule.details}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[rgb(107_107_107_/_14%)]">
          <table className="min-w-full border-separate border-spacing-y-2 bg-white px-3 py-2 text-sm">
            <thead>
              <tr className="text-left text-[var(--brand-muted)]">
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Rule</th>
                <th className="px-3 py-2">Contract</th>
                <th className="px-3 py-2">Reference</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">At risk</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {kwsRisks.length ? (
                kwsRisks.map((risk) => (
                  <tr key={risk.id} className="rounded-lg bg-[#faf8f6] shadow-sm">
                    <td className="rounded-l-lg px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${risk.severity === "high" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                        {risk.severity}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-[#383433]">{risk.ruleCode}</td>
                    <td className="px-3 py-3 text-[#383433]">{risk.contractId ?? "Poza kontraktem"}</td>
                    <td className="px-3 py-3 text-[#383433]">{risk.referenceKey}</td>
                    <td className="px-3 py-3 text-[#383433]">{currency.format(risk.amountNet)}</td>
                    <td className="px-3 py-3 text-[#383433]">{currency.format(risk.amountAtRiskNet)}</td>
                    <td className="rounded-r-lg px-3 py-3 text-[#383433]">{risk.note}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-[var(--brand-muted)]">
                    Brak ryzyk KWS dla wybranego okresu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
