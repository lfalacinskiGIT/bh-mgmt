"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { getProjectsSummary, type ProjectScheduleStatus } from "@/lib/mock-projects";
import { normalizeMockDataset } from "@/lib/mock-dataset";
import { useMockDataset } from "@/lib/use-mock-dataset";

const currency = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 2,
});

const scheduleLabel: Record<ProjectScheduleStatus, string> = {
  "on-track": "Na czas",
  "at-risk": "Ryzyko",
  late: "Opóźniony",
  done: "Zamknięty",
};

const scheduleClass: Record<ProjectScheduleStatus, string> = {
  "on-track": "bg-emerald-100 text-emerald-800",
  "at-risk": "bg-amber-100 text-amber-800",
  late: "bg-rose-100 text-rose-800",
  done: "bg-slate-100 text-slate-700",
};

export function ProjectsPage() {
  const [dataset, setDataset] = useMockDataset();
  const [search, setSearch] = useState("");
  const { projects, totalBudget, totalSpent, activeCount, riskCount, progressAvg, mostAtRisk } = useMemo(
    () => getProjectsSummary(dataset),
    [dataset],
  );

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return projects;
    }

    return projects.filter((project) => {
      const haystack = [project.name, project.contractNumber, project.manager, project.phase, project.status, project.risk]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [projects, search]);

  return (
    <AppShell
      title="Projekty"
      subtitle="Operacyjny widok harmonogramów, budżetów i ryzyk"
      showSearch
      searchPlaceholder="Szukaj projektu..."
      searchValue={search}
      onSearchChange={setSearch}
    >
      <section className="grid gap-4 xl:grid-cols-4">
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#f28b25] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Aktywne projekty</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{activeCount}</p></article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#4cb24f] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Budżet razem</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(totalBudget)}</p></article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#3d8bfd] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Wydane netto</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(totalSpent)}</p></article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#db1832] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Projekty pod ryzykiem</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{riskCount}</p></article>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Portfolio projektów</h2>
              <p className="text-sm text-[var(--brand-muted)]">Budżet, postęp i status harmonogramu</p>
            </div>
            <select
              value={dataset}
              onChange={(event) => setDataset(normalizeMockDataset(event.target.value))}
              className="h-10 rounded-xl border border-[rgb(107_107_107_/_18%)] bg-[#fbfaf8] px-3 text-sm text-[#383433] shadow-sm"
            >
              <option value="baseline">Dataset: Baseline</option>
              <option value="stress">Dataset: Stress</option>
              <option value="incomplete">Dataset: Incomplete</option>
            </select>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filtered.map((project) => {
              const variance = project.spentNet - project.budgetNet * project.progress;

              return (
                <article key={project.id} className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#383433]">{project.name}</p>
                      <p className="mt-1 text-xs text-[var(--brand-muted)]">{project.contractNumber} • {project.manager}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scheduleClass[project.scheduleStatus]}`}>{scheduleLabel[project.scheduleStatus]}</span>
                  </div>
                  <p className="mt-3 text-sm text-[var(--brand-muted)]">{project.phase}</p>
                  <div className="mt-3 h-2 rounded-full bg-white">
                    <div className="h-2 rounded-full bg-[var(--brand-primary)]" style={{ width: `${Math.round(project.progress * 100)}%` }} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-[#5a524d]">
                    <div className="flex items-center justify-between gap-3"><span>Postęp</span><span className="font-medium text-[#383433]">{Math.round(project.progress * 100)}%</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Budżet</span><span className="font-medium text-[#383433]">{currency.format(project.budgetNet)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Wydano</span><span className="font-medium text-[#383433]">{currency.format(project.spentNet)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Odchylenie</span><span className={`font-medium ${variance > 0 ? "text-[#db1832]" : "text-[#4cb24f]"}`}>{currency.format(variance)}</span></div>
                  </div>
                  <p className="mt-3 text-sm text-[var(--brand-muted)]">Ryzyko: {project.risk}</p>
                  <p className="mt-2 text-sm font-medium text-[#383433]">Następny krok: {project.nextAction}</p>
                </article>
              );
            })}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Podsumowanie sprintu</h3>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">Średni postęp całego portfolio</p>
            <div className="mt-4 h-3 rounded-full bg-[#faf8f6]">
              <div className="h-3 rounded-full bg-gradient-to-r from-[#f28b25] via-[#e0ad3b] to-[#4cb24f]" style={{ width: `${Math.round(progressAvg * 100)}%` }} />
            </div>
            <p className="mt-2 text-sm font-semibold text-[#383433]">{Math.round(progressAvg * 100)}%</p>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Największe ryzyko</h3>
            {mostAtRisk ? (
              <>
                <p className="mt-2 font-semibold text-[#383433]">{mostAtRisk.name}</p>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">{mostAtRisk.risk}</p>
                <p className="mt-3 text-sm text-[#5a524d]">Termin: {mostAtRisk.dueDate}</p>
              </>
            ) : null}
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Szybka lista</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#5a524d]">
              <li>• Uporządkować projekty z ryzykiem harmonogramu.</li>
              <li>• Domknąć odbiory i przenieść wnioski do bazy wiedzy.</li>
              <li>• Spiąć plan budżetów z raportem kosztów.</li>
            </ul>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}