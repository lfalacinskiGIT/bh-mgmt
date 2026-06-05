"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { normalizeMockDataset } from "@/lib/mock-dataset";
import type { MockDatasetName } from "@/lib/mock-contract-economics";
import { getTeamSummary } from "@/lib/mock-team";

type TimeEntryCategory = "project" | "nonProject" | "absence";

interface TimeEntryRow {
  id: string;
  contractId: string | null;
  contractNumber: string | null;
  employeeId: string;
  employeeName?: string;
  workDate: string;
  hours: number;
  category: TimeEntryCategory;
  lineOfBusiness: string | null;
}

interface ContractAllocation {
  contractId: string;
  contractNumber: string;
  lineOfBusiness: string;
  projectHours: number;
  allocatedPayrollNet: number;
}

interface EmployeeAllocation {
  employeeId: string;
  employeeName?: string;
  payrollNet: number;
  projectHours: number;
  nonProjectHours: number;
  absenceHours: number;
  allocatedToContractsNet: number;
  outsideContractsNet: number;
}

interface TimeSummaryPayload {
  month: string;
  totalHours: number;
  projectHours: number;
  nonProjectHours: number;
  absenceHours: number;
  activeEmployees: number;
  payrollNetTotal: number;
  allocatedPayrollNetToContracts: number;
  allocatedPayrollNetOutsideContracts: number;
  allocationCoveragePct: number;
  contractAllocations: ContractAllocation[];
  employeeAllocations: EmployeeAllocation[];
}

const currency = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 2,
});

const hours = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 });

const categoryLabel: Record<TimeEntryCategory, string> = {
  project: "Projektowe",
  nonProject: "Nieprojektowe",
  absence: "Absencje",
};

const categoryClass: Record<TimeEntryCategory, string> = {
  project: "bg-emerald-100 text-emerald-800",
  nonProject: "bg-amber-100 text-amber-800",
  absence: "bg-rose-100 text-rose-800",
};

export function TimeTrackingPage() {
  const [dataset, setDataset] = useState<MockDatasetName>("baseline");
  const [months, setMonths] = useState<string[]>([]);
  const [month, setMonth] = useState<string>("");
  const [employeeQuery, setEmployeeQuery] = useState<string>("");
  const [summary, setSummary] = useState<TimeSummaryPayload | null>(null);
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const summaryRes = await fetch(`/api/time/summary?dataset=${encodeURIComponent(dataset)}${month ? `&month=${encodeURIComponent(month)}` : ""}`, { cache: "no-store" });

        if (!summaryRes.ok) {
          throw new Error("Nie udało się pobrać podsumowania czasu pracy");
        }

        const summaryPayload = (await summaryRes.json()) as {
          availableMonths: string[];
          summary: TimeSummaryPayload;
        };

        const selectedMonth = month || summaryPayload.summary.month;

        const entriesRes = await fetch(
          `/api/time/entries?dataset=${encodeURIComponent(dataset)}${selectedMonth ? `&month=${encodeURIComponent(selectedMonth)}` : ""}&pageSize=200`,
          { cache: "no-store" },
        );

        if (!entriesRes.ok) {
          throw new Error("Nie udało się pobrać ewidencji czasu pracy");
        }

        const entriesPayload = (await entriesRes.json()) as { items: TimeEntryRow[] };

        if (active) {
          setMonths(summaryPayload.availableMonths);
          setMonth(selectedMonth);
          setSummary(summaryPayload.summary);
          setEntries(entriesPayload.items ?? []);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Nieznany błąd ładowania");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [dataset, month]);

  const topContracts = useMemo(() => (summary?.contractAllocations ?? []).slice(0, 10), [summary]);
  const employeeRows = useMemo(() => (summary?.employeeAllocations ?? []).slice(0, 12), [summary]);
  const employeeSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          employeeRows
            .map((row) => row.employeeName ?? row.employeeId)
            .filter((value) => value.trim().length > 0),
        ),
      ).sort((left, right) => left.localeCompare(right, "pl")),
    [employeeRows],
  );

  const filteredEntries = useMemo(() => {
    const needle = employeeQuery.trim().toLowerCase();
    if (!needle) {
      return entries;
    }

    return entries.filter((entry) => {
      const label = (entry.employeeName ?? entry.employeeId).toLowerCase();
      return label.includes(needle);
    });
  }, [employeeQuery, entries]);

  const filteredEmployeeRows = useMemo(() => {
    const needle = employeeQuery.trim().toLowerCase();
    if (!needle) {
      return employeeRows;
    }

    return employeeRows.filter((row) => {
      const label = (row.employeeName ?? row.employeeId).toLowerCase();
      return label.includes(needle);
    });
  }, [employeeQuery, employeeRows]);

  const teamSummary = useMemo(() => getTeamSummary(dataset), [dataset]);
  const overloadedMembers = useMemo(
    () => teamSummary.members.filter((member) => member.capacityStatus === "overloaded").slice(0, 6),
    [teamSummary.members],
  );

  const weeklyLoad = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const entry of filteredEntries) {
      const key = `${entry.workDate.slice(0, 7)}-W${Math.ceil(Number(entry.workDate.slice(8, 10)) / 7)}`;
      buckets.set(key, (buckets.get(key) ?? 0) + entry.hours);
    }

    return Array.from(buckets.entries())
      .map(([week, totalHours]) => ({ week, totalHours }))
      .sort((left, right) => left.week.localeCompare(right.week))
      .slice(-6);
  }, [filteredEntries]);

  const capacityRadar = useMemo(() => {
    const byContract = new Map<string, number>();
    const overloadedIds = new Set(overloadedMembers.map((member) => member.id));

    for (const entry of filteredEntries) {
      if (!entry.contractNumber || !overloadedIds.has(entry.employeeId) || entry.category !== "project") {
        continue;
      }

      byContract.set(entry.contractNumber, (byContract.get(entry.contractNumber) ?? 0) + entry.hours);
    }

    return Array.from(byContract.entries())
      .map(([contractNumber, hoursInRisk]) => ({ contractNumber, hoursInRisk }))
      .sort((left, right) => right.hoursInRisk - left.hoursInRisk)
      .slice(0, 5);
  }, [filteredEntries, overloadedMembers]);

  return (
    <AppShell title="Czas pracy" subtitle="Alokacja czasu i payroll na kontrakty" showSearch={false}>
      <section className="grid gap-4 xl:grid-cols-4">
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#3d8bfd] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Godziny łącznie</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{loading || !summary ? "-" : hours.format(summary.totalHours)}</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#4cb24f] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Payroll na kontrakty</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{loading || !summary ? "-" : currency.format(summary.allocatedPayrollNetToContracts)}</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#f28b25] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Payroll poza kontraktami</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{loading || !summary ? "-" : currency.format(summary.allocatedPayrollNetOutsideContracts)}</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#db1832] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Pokrycie alokacji</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{loading || !summary ? "-" : `${summary.allocationCoveragePct.toFixed(1)}%`}</p>
        </article>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Łączenie danych: czas pracy -&gt; payroll -&gt; kontrakt</h2>
            <p className="text-sm text-[var(--brand-muted)]">Model inspirowany dvlp-planner: godziny projektowe alokują koszt ludzi na kontrakty</p>
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
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="h-10 rounded-xl border border-[rgb(107_107_107_/_18%)] bg-[#fbfaf8] px-3 text-sm text-[#383433]"
            >
              {months.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <div>
              <input
                type="text"
                list="employee-filter-suggestions"
                value={employeeQuery}
                onChange={(event) => setEmployeeQuery(event.target.value)}
                placeholder="Filtruj po pracowniku"
                className="h-10 rounded-xl border border-[rgb(107_107_107_/_18%)] bg-[#fbfaf8] px-3 text-sm text-[#383433]"
              />
              <datalist id="employee-filter-suggestions">
                {employeeSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {summary ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-3">
              <p className="text-xs text-[var(--brand-muted)]">Projektowe</p>
              <p className="mt-1 font-semibold text-[#383433]">{hours.format(summary.projectHours)} h</p>
            </article>
            <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-3">
              <p className="text-xs text-[var(--brand-muted)]">Nieprojektowe</p>
              <p className="mt-1 font-semibold text-[#383433]">{hours.format(summary.nonProjectHours)} h</p>
            </article>
            <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-3">
              <p className="text-xs text-[var(--brand-muted)]">Absencje</p>
              <p className="mt-1 font-semibold text-[#383433]">{hours.format(summary.absenceHours)} h</p>
            </article>
          </div>
        ) : null}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Zespół i obciążenie</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-3">
              <p className="text-xs text-[var(--brand-muted)]">Członkowie</p>
              <p className="mt-1 text-lg font-semibold text-[#383433]">{teamSummary.members.length}</p>
            </div>
            <div className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-3">
              <p className="text-xs text-[var(--brand-muted)]">Śr. wykorzystanie</p>
              <p className="mt-1 text-lg font-semibold text-[#383433]">{Math.round(teamSummary.averageUtilization)}%</p>
            </div>
            <div className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-3">
              <p className="text-xs text-[var(--brand-muted)]">Przeciążeni</p>
              <p className="mt-1 text-lg font-semibold text-[#383433]">{teamSummary.overloadedCount}</p>
            </div>
          </div>
        </article>

        <aside className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Ryzyko capacity</h3>
          <div className="mt-3 max-h-[220px] space-y-2 overflow-auto pr-1">
            {overloadedMembers.length > 0 ? (
              overloadedMembers.map((member) => (
                <div key={member.id} className="rounded-xl border border-[rgb(107_107_107_/_12%)] bg-[#faf8f6] px-3 py-2">
                  <p className="text-sm font-semibold text-[#383433]">{member.name}</p>
                  <p className="text-xs text-[var(--brand-muted)]">{member.role}</p>
                  <p className="mt-1 text-sm text-[#383433]">Wykorzystanie: {member.utilizationPct}%</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--brand-muted)]">Brak przeciążonych osób dla wybranego datasetu.</p>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-[rgb(107_107_107_/_12%)] bg-[#fffaf5] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--brand-muted)]">Capacity radar (kontrakty)</p>
            <div className="mt-2 space-y-2">
              {capacityRadar.length > 0 ? (
                capacityRadar.map((item) => (
                  <div key={item.contractNumber}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-[#383433]">{item.contractNumber}</span>
                      <span className="font-semibold text-[#383433]">{item.hoursInRisk.toFixed(1)} h</span>
                    </div>
                    <div className="h-2 rounded-full bg-white">
                      <div className="h-2 rounded-full bg-[#db1832]" style={{ width: `${Math.min(100, item.hoursInRisk * 6)}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--brand-muted)]">Brak kontraktów podbijających przeciążenie w wybranym filtrze.</p>
              )}
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
        <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Obciążenie tygodniowe</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-6">
          {weeklyLoad.length > 0 ? (
            weeklyLoad.map((item) => (
              <article key={item.week} className="rounded-xl border border-[rgb(107_107_107_/_12%)] bg-[#faf8f6] p-3">
                <p className="text-[11px] text-[var(--brand-muted)]">{item.week}</p>
                <p className="mt-1 text-base font-semibold text-[#383433]">{item.totalHours.toFixed(1)} h</p>
                <div className="mt-2 h-2 rounded-full bg-white">
                  <div className="h-2 rounded-full bg-[#3d8bfd]" style={{ width: `${Math.min(100, item.totalHours * 1.8)}%` }} />
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-[var(--brand-muted)]">Brak danych tygodniowych dla wybranego filtra.</p>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Alokacja payroll na kontrakty</h3>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-[rgb(107_107_107_/_14%)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f7f4ef] text-left text-[11px] uppercase tracking-[0.1em] text-[var(--brand-muted)]">
                <tr>
                  <th className="px-3 py-2">Kontrakt</th>
                  <th className="px-3 py-2">Linia</th>
                  <th className="px-3 py-2">Godziny</th>
                  <th className="px-3 py-2">Payroll netto</th>
                </tr>
              </thead>
              <tbody>
                {topContracts.length > 0 ? (
                  topContracts.map((row) => (
                    <tr key={row.contractId} className="border-t border-[rgb(107_107_107_/_10%)]">
                      <td className="px-3 py-2 font-semibold text-[#383433]">{row.contractNumber}</td>
                      <td className="px-3 py-2 text-[#383433]">{row.lineOfBusiness}</td>
                      <td className="px-3 py-2 text-[#383433]">{hours.format(row.projectHours)} h</td>
                      <td className="px-3 py-2 font-semibold text-[#383433]">{currency.format(row.allocatedPayrollNet)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-3 text-[var(--brand-muted)]" colSpan={4}>Brak danych alokacji dla wybranego okresu.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Ewidencja czasu</h3>
          <div className="mt-3 max-h-[380px] space-y-2 overflow-auto pr-1">
            {filteredEntries.length > 0 ? (
              filteredEntries.slice(0, 20).map((entry) => (
                <article key={entry.id} className="rounded-xl border border-[rgb(107_107_107_/_12%)] bg-[#faf8f6] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#383433]">{entry.employeeName ?? entry.employeeId}</p>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${categoryClass[entry.category]}`}>
                      {categoryLabel[entry.category]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--brand-muted)]">{entry.workDate} • {entry.contractNumber ?? "Poza kontraktem"}</p>
                  <p className="mt-1 text-sm text-[#383433]">{hours.format(entry.hours)} h</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--brand-muted)]">Brak wpisów czasu pracy dla wybranego filtra.</p>
            )}
          </div>
        </aside>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
        <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Alokacja per pracownik</h3>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[rgb(107_107_107_/_14%)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f7f4ef] text-left text-[11px] uppercase tracking-[0.1em] text-[var(--brand-muted)]">
              <tr>
                <th className="px-3 py-2">Pracownik</th>
                <th className="px-3 py-2">Projektowe h</th>
                <th className="px-3 py-2">Nieprojektowe h</th>
                <th className="px-3 py-2">Absencje h</th>
                <th className="px-3 py-2">Payroll netto</th>
                <th className="px-3 py-2">Na kontrakty</th>
                <th className="px-3 py-2">Poza kontraktami</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployeeRows.length > 0 ? (
                filteredEmployeeRows.map((row) => (
                  <tr key={row.employeeId} className={`border-t border-[rgb(107_107_107_/_10%)] ${employeeQuery ? "row-flash" : ""}`}>
                    <td className="px-3 py-2 font-semibold text-[#383433]">{row.employeeName ?? row.employeeId}</td>
                    <td className="px-3 py-2 text-[#383433]">{hours.format(row.projectHours)}</td>
                    <td className="px-3 py-2 text-[#383433]">{hours.format(row.nonProjectHours)}</td>
                    <td className="px-3 py-2 text-[#383433]">{hours.format(row.absenceHours)}</td>
                    <td className="px-3 py-2 font-semibold text-[#383433]">{currency.format(row.payrollNet)}</td>
                    <td className="px-3 py-2 text-[#383433]">{currency.format(row.allocatedToContractsNet)}</td>
                    <td className="px-3 py-2 text-[#383433]">{currency.format(row.outsideContractsNet)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-3 text-[var(--brand-muted)]" colSpan={7}>Brak danych pracowników dla wybranego filtra.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
