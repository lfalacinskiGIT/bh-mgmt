"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { getTeamSummary } from "@/lib/mock-team";
import { useMockDataset } from "@/lib/use-mock-dataset";

const statusBadge: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  busy: "bg-amber-100 text-amber-800",
  overloaded: "bg-rose-100 text-rose-800",
};

export function TeamPage() {
  const [dataset, setDataset] = useMockDataset();
  const [search, setSearch] = useState("");
  const { members, averageUtilization, overloadedCount, busyCount, disciplines } = useMemo(() => getTeamSummary(dataset), [dataset]);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return members;
    }

    return members.filter((member) => [member.name, member.role, member.discipline, member.location, member.focus, ...member.skills].join(" ").toLowerCase().includes(normalized));
  }, [members, search]);

  return (
    <AppShell
      title="Zespół"
      subtitle="Role, obciążenie i odpowiedzialności w układzie operacyjnym"
      showSearch
      searchPlaceholder="Szukaj osoby, roli lub kompetencji..."
      searchValue={search}
      onSearchChange={setSearch}
    >
      <section className="grid gap-4 xl:grid-cols-4">
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#f28b25] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Członkowie</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{filtered.length}</p></article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#3d8bfd] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Śr. wykorzystanie</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{Math.round(averageUtilization)}%</p></article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#e0ad3b] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Busy</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{busyCount}</p></article>
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#db1832] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Przeciążeni</p><p className="mt-2 text-3xl font-semibold text-[#383433]">{overloadedCount}</p></article>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Mapa zespołu</h2>
              <p className="text-sm text-[var(--brand-muted)]">Rola, kompetencje i aktualne obciążenie</p>
            </div>
            <select
              value={dataset}
              onChange={(event) => setDataset(event.target.value === "stress" ? "stress" : "baseline")}
              className="h-10 rounded-xl border border-[rgb(107_107_107_/_18%)] bg-[#fbfaf8] px-3 text-sm text-[#383433] shadow-sm"
            >
              <option value="baseline">Dataset: Baseline</option>
              <option value="stress">Dataset: Stress</option>
            </select>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filtered.map((member) => (
              <article key={member.id} className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#383433]">{member.name}</p>
                    <p className="mt-1 text-xs text-[var(--brand-muted)]">{member.role} • {member.location}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[member.capacityStatus]}`}>{member.utilizationPct}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div className="h-2 rounded-full bg-[var(--brand-primary)]" style={{ width: `${member.utilizationPct}%` }} />
                </div>
                <p className="mt-3 text-sm text-[var(--brand-muted)]">{member.focus}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {member.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#5a524d] shadow-sm">{skill}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Dyscypliny</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {disciplines.map((discipline) => (
                <span key={discipline} className="rounded-full bg-[#fff4ea] px-3 py-2 text-sm font-medium text-[#8e4a14]">{discipline}</span>
              ))}
            </div>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
            <h3 className="text-xl font-semibold tracking-tight text-[#383433]">Zadania zespołowe</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#5a524d]">
              <li>• Przenieść odpowiedzialności do ustawień ról.</li>
              <li>• Zbalansować przeciążone osoby z projektów.</li>
              <li>• Dodać notatki o kompetencjach i dostępności.</li>
            </ul>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}