"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { normalizeMockDataset } from "@/lib/mock-dataset";
import { getSalesSummary, type SalesStage } from "@/lib/mock-sales";
import { useMockDataset } from "@/lib/use-mock-dataset";

const currency = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 2,
});

const stageLabel: Record<SalesStage, string> = {
  lead: "Lead",
  oferta: "Oferta",
  negocjacje: "Negocjacje",
  wygrana: "Wygrana",
  utracona: "Utracona",
};

const stageClass: Record<SalesStage, string> = {
  lead: "bg-slate-100 text-slate-700",
  oferta: "bg-amber-100 text-amber-800",
  negocjacje: "bg-orange-100 text-orange-800",
  wygrana: "bg-emerald-100 text-emerald-800",
  utracona: "bg-rose-100 text-rose-800",
};

export function SalesPage() {
  const [dataset, setDataset] = useMockDataset();
  const [search, setSearch] = useState("");
  const { opportunities, pipelineValue, weightedPipelineValue, avgProbability, stageCounts, topOpportunity } = useMemo(
    () => getSalesSummary(dataset),
    [dataset],
  );

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return opportunities;
    }

    return opportunities.filter((item) => {
      const haystack = [item.number, item.clientName, item.opportunityName, item.city, item.owner, item.stage, item.source]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [opportunities, search]);

  const closeSoon = filtered.filter((item) => item.stage !== "utracona").slice(0, 3);

  return (
    <AppShell
      title="Sprzedaż"
      subtitle="Pipeline, leady i następne kroki w makiecie Box Haus"
      showSearch
      searchPlaceholder="Szukaj szansy sprzedaży..."
      searchValue={search}
      onSearchChange={setSearch}
    >
      <section className="grid gap-4 xl:grid-cols-4">
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#f28b25] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Pipeline netto</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(pipelineValue)}</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#4cb24f] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Ważony pipeline</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{currency.format(weightedPipelineValue)}</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#3d8bfd] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Średnia szansa</p>
          <p className="mt-2 text-3xl font-semibold text-[#383433]">{Math.round(avgProbability * 100)}%</p>
        </article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#db1832] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Największa szansa</p>
          <p className="mt-2 text-sm font-semibold text-[#383433]">{topOpportunity ? topOpportunity.opportunityName : "Brak danych"}</p>
          <p className="mt-1 text-xs text-[var(--brand-muted)]">{topOpportunity ? currency.format(topOpportunity.valueNet) : ""}</p>
        </article>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Szanse sprzedażowe</h2>
              <p className="text-sm text-[var(--brand-muted)]">Leady, oferty i negocjacje z możliwością filtrowania</p>
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
            {filtered.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#383433]">{item.opportunityName}</p>
                    <p className="mt-1 text-xs text-[var(--brand-muted)]">{item.number} • {item.clientName}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stageClass[item.stage]}`}>{stageLabel[item.stage]}</span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-[#5a524d]">
                  <div className="flex items-center justify-between gap-3"><span>Lokalizacja</span><span className="font-medium text-[#383433]">{item.city}</span></div>
                  <div className="flex items-center justify-between gap-3"><span>Wartość</span><span className="font-medium text-[#383433]">{currency.format(item.valueNet)}</span></div>
                  <div className="flex items-center justify-between gap-3"><span>Szansa</span><span className="font-medium text-[#383433]">{Math.round(item.probability * 100)}%</span></div>
                  <div className="flex items-center justify-between gap-3"><span>Owner</span><span className="font-medium text-[#383433]">{item.owner}</span></div>
                </div>
                <p className="mt-3 text-sm text-[var(--brand-muted)]">{item.nextStep}</p>
                <Link href={`/kontrakty?dataset=${dataset}`} className="mt-4 inline-flex text-sm font-semibold text-[var(--brand-primary)]">
                  Zobacz kontrakty powiązane
                </Link>
              </article>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Funnel</h3>
            <div className="mt-4 space-y-3">
              {Object.entries(stageCounts).map(([stage, count]) => (
                <div key={stage} className="rounded-xl bg-[#faf8f6] p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[#383433]">{stageLabel[stage as SalesStage]}</span>
                    <span className="text-[var(--brand-muted)]">{count}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white">
                    <div className="h-2 rounded-full bg-[var(--brand-primary)]" style={{ width: `${Math.max(14, count * 20)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Do domknięcia</h3>
            <div className="mt-4 space-y-3">
              {closeSoon.map((item) => (
                <div key={item.id} className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-3">
                  <p className="font-semibold text-[#383433]">{item.opportunityName}</p>
                  <p className="mt-1 text-sm text-[var(--brand-muted)]">{item.clientName} • {item.expectedClose}</p>
                  <p className="mt-2 text-sm text-[#5a524d]">{item.nextStep}</p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}