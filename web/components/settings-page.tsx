"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { persistMockDataset, readMockDatasetFromStorage } from "@/lib/mock-dataset";
import type { MockDatasetName } from "@/lib/mock-contract-economics";

const settingsRows = [
  { label: "Tryb makiety", value: "Mock-first", helper: "Aplikacja korzysta z JSON-owych danych demonstracyjnych" },
  { label: "Synchronizacja", value: "Optima / mock", helper: "Integracje pokazują przepływ danych, bez realnego API" },
  { label: "Widoczność menu", value: "Pełna", helper: "Każdy route ma już ekran zamiast placeholdera" },
  { label: "Zestaw danych", value: "Baseline / Stress / Incomplete", helper: "Przełączanie zestawu zapisuje się lokalnie" },
];

export function SettingsPage() {
  const [dataset, setDataset] = useState<MockDatasetName>(() => readMockDatasetFromStorage());
  const [compactMode, setCompactMode] = useState(true);
  const [showHints, setShowHints] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  function changeDataset(nextDataset: MockDatasetName) {
    setDataset(nextDataset);
    persistMockDataset(nextDataset);
  }

  return (
    <AppShell title="Ustawienia" subtitle="Konfiguracja makiety, danych i zachowania aplikacji" showSearch={false}>
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Konfiguracja aplikacji</h2>
              <p className="text-sm text-[var(--brand-muted)]">Tu zbieramy ustawienia, które realnie mają znaczenie dla makiety</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {settingsRows.map((row) => (
              <div key={row.label} className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">{row.label}</p>
                <p className="mt-2 text-lg font-semibold text-[#383433]">{row.value}</p>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">{row.helper}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#383433]">Zestaw danych mock</p>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">Zmieniaj baseline i stress, aby sprawdzić inne warianty makiety</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => changeDataset("baseline")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${dataset === "baseline" ? "bg-[var(--brand-primary)] text-white" : "bg-white text-[#383433] shadow-sm"}`}
                >
                  Baseline
                </button>
                <button
                  type="button"
                  onClick={() => changeDataset("stress")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${dataset === "stress" ? "bg-[var(--brand-primary)] text-white" : "bg-white text-[#383433] shadow-sm"}`}
                >
                  Stress
                </button>
                <button
                  type="button"
                  onClick={() => changeDataset("incomplete")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${dataset === "incomplete" ? "bg-[var(--brand-primary)] text-white" : "bg-white text-[#383433] shadow-sm"}`}
                >
                  Incomplete
                </button>
              </div>
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Przełączniki</h3>
            <div className="mt-4 space-y-3 text-sm text-[#5a524d]">
              <label className="flex items-center justify-between gap-4 rounded-xl bg-[#faf8f6] px-4 py-3">
                <span className="font-medium text-[#383433]">Tryb kompaktowy</span>
                <input type="checkbox" checked={compactMode} onChange={(event) => setCompactMode(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-xl bg-[#faf8f6] px-4 py-3">
                <span className="font-medium text-[#383433]">Podpowiedzi w UI</span>
                <input type="checkbox" checked={showHints} onChange={(event) => setShowHints(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-xl bg-[#faf8f6] px-4 py-3">
                <span className="font-medium text-[#383433]">Auto-refresh mocków</span>
                <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
              </label>
            </div>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Status makiety</h3>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">Ustawienia zmieniają tylko lokalny widok i zapis w przeglądarce.</p>
            <p className="mt-4 text-sm font-semibold text-[#383433]">Dataset: {dataset}</p>
            <p className="mt-2 text-sm text-[#5a524d]">Tryb kompaktowy: {compactMode ? "tak" : "nie"}</p>
            <p className="mt-1 text-sm text-[#5a524d]">Podpowiedzi: {showHints ? "tak" : "nie"}</p>
            <p className="mt-1 text-sm text-[#5a524d]">Auto-refresh: {autoRefresh ? "tak" : "nie"}</p>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}