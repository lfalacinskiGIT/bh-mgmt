"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import type { MockInvoice } from "@/lib/mock-invoices-store";

interface IntegrationsPageProps {
  initialInvoices: MockInvoice[];
  isMockEnabled: boolean;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Brak danych";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function IntegrationsPage({ initialInvoices, isMockEnabled }: IntegrationsPageProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [invoiceCount, setInvoiceCount] = useState(initialInvoices.length);
  const [validationStatus, setValidationStatus] = useState<"idle" | "ok" | "error">("idle");
  const [validationSummary, setValidationSummary] = useState<string>("Walidacja nieuruchomiona");
  const [auditPreview, setAuditPreview] = useState<Array<{ id: string; finishedAt: string; status: string; created: number; errors: number }>>([]);
  const [auditHistory, setAuditHistory] = useState<Array<{ id: string; finishedAt: string; status: string; created: number; errors: number }>>([]);

  const sourceStats = useMemo(() => {
    const mockSourceCount = initialInvoices.filter((invoice) => invoice.source === "mock-sync").length;

    return {
      total: initialInvoices.length,
      mockSourceCount,
    };
  }, [initialInvoices]);

  useEffect(() => {
    let active = true;

    async function loadDiagnostics() {
      try {
        const [validationRes, auditRes] = await Promise.all([
          fetch("/api/mock/validate", { cache: "no-store" }),
          fetch("/api/sync/audit", { cache: "no-store" }),
        ]);

        if (active) {
          if (validationRes.ok) {
            const payload = (await validationRes.json()) as { total: number; failed: number };
            setValidationStatus(payload.failed === 0 ? "ok" : "error");
            setValidationSummary(`Sprawdzone pliki: ${payload.total}, błędy: ${payload.failed}`);
          } else {
            setValidationStatus("error");
            setValidationSummary("Walidacja danych mock zwróciła błędy");
          }

          if (auditRes.ok) {
            const auditPayload = (await auditRes.json()) as {
              items: Array<{ id: string; finishedAt: string; status: string; created: number; errors: number }>;
            };
            setAuditPreview((auditPayload.items ?? []).slice(0, 4));
            setAuditHistory((auditPayload.items ?? []).slice(0, 7));
          }
        }
      } catch {
        if (active) {
          setValidationStatus("error");
          setValidationSummary("Nie udało się pobrać diagnostyki mock danych");
        }
      }
    }

    void loadDiagnostics();

    return () => {
      active = false;
    };
  }, []);

  async function runOptimaSync() {
    try {
      setIsSyncing(true);
      setSyncMessage(null);

      const response = await fetch("/api/sync/optima", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const payload = (await response.json()) as { syncedCount?: number; syncedAt?: string };
      const syncedCount = payload.syncedCount ?? 0;
      setInvoiceCount((current) => current + syncedCount);
      setLastSyncAt(payload.syncedAt ?? new Date().toISOString());
      setSyncMessage(`Synchronizacja z Optimą zakończona. Dodano ${syncedCount} nowych faktur.`);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Nieznany błąd synchronizacji");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <AppShell
      title="Integracje"
      subtitle="Status połączeń i synchronizacji danych"
      showSearch={false}
    >
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <article className="card-surface rounded-xl border-l-[4px] border-l-[#3d8bfd] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Tryb środowiska</p>
          <p className="mt-2 text-2xl font-semibold text-[#383433]">{isMockEnabled ? "MOCK" : "LIVE"}</p>
        </article>

        <article className="card-surface rounded-xl border-l-[4px] border-l-[#f28b25] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Faktury w buforze</p>
          <p className="mt-2 text-2xl font-semibold text-[#383433]">{invoiceCount}</p>
        </article>

        <article className="card-surface rounded-xl border-l-[4px] border-l-[#4cb24f] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Źródło mock-sync</p>
          <p className="mt-2 text-2xl font-semibold text-[#383433]">{sourceStats.mockSourceCount}</p>
        </article>

        <article className="card-surface rounded-xl border-l-[4px] border-l-[#e0ad3b] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Ostatnia synchronizacja</p>
          <p className="mt-2 text-sm font-semibold text-[#383433]">{formatDateTime(lastSyncAt)}</p>
        </article>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Sync cockpit</h2>
            <p className="text-sm text-[var(--brand-muted)]">Status providerów, diagnostyka i historia synchronizacji</p>
          </div>

          <button
            type="button"
            onClick={() => void runOptimaSync()}
            disabled={isSyncing}
            className="h-11 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSyncing ? "Synchronizacja..." : "Uruchom synchronizację Optima"}
          </button>
        </div>

        {syncMessage ? (
          <div className="mt-4 rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] px-4 py-3 text-sm text-[#6a563f]">
            {syncMessage}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Optima</p>
            <p className="mt-2 text-sm font-semibold text-[#383433]">Gotowe do synchronizacji</p>
            <p className="mt-1 text-xs text-[var(--brand-muted)]">Endpoint /api/sync/optima</p>
          </article>

          <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Lista płac</p>
            <p className="mt-2 text-sm font-semibold text-[#383433]">Planowane</p>
            <p className="mt-1 text-xs text-[var(--brand-muted)]">Następny etap: mapowanie kosztów ludzi</p>
          </article>

          <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Ewidencja czasu</p>
            <p className="mt-2 text-sm font-semibold text-[#383433]">Planowane</p>
            <p className="mt-1 text-xs text-[var(--brand-muted)]">Następny etap: alokacja na kontrakty</p>
          </article>

          <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Formatki zarządcze</p>
            <p className="mt-2 text-sm font-semibold text-[#383433]">Planowane</p>
            <p className="mt-1 text-xs text-[var(--brand-muted)]">Następny etap: narzuty i prowizje</p>
          </article>
        </div>

        <div className="mt-5 rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <h3 className="text-base font-semibold text-[#383433]">Przepływ danych</h3>
            <span className="text-xs text-[var(--brand-muted)]">Optima -&gt; warstwa pośrednia -&gt; kontrakty/raporty</span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-lg border border-[rgb(107_107_107_/_12%)] bg-white px-3 py-2 text-sm text-[#383433]">1. Źródło: Optima/iFirma</div>
            <div className="rounded-lg border border-[rgb(107_107_107_/_12%)] bg-white px-3 py-2 text-sm text-[#383433]">2. Warstwa pośrednia: walidacja + audyt</div>
            <div className="rounded-lg border border-[rgb(107_107_107_/_12%)] bg-white px-3 py-2 text-sm text-[#383433]">3. Konsumpcja: faktury, kontrakty, raporty</div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Walidacja danych mock</p>
            <p className={`mt-2 text-sm font-semibold ${validationStatus === "ok" ? "text-emerald-700" : validationStatus === "error" ? "text-rose-700" : "text-[#383433]"}`}>
              {validationStatus === "ok" ? "Status: OK" : validationStatus === "error" ? "Status: Błąd" : "Status: Oczekuje"}
            </p>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">{validationSummary}</p>
          </article>

          <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Audit log synchronizacji</p>
            <div className="mt-2 space-y-2 text-sm text-[#383433]">
              {auditPreview.length > 0 ? (
                auditPreview.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg bg-[#faf8f6] px-3 py-2">
                    <span>{formatDateTime(entry.finishedAt)}</span>
                    <span className={entry.status === "success" ? "text-emerald-700" : "text-rose-700"}>{entry.status === "success" ? "OK" : "Błąd"}</span>
                    <span>+{entry.created}</span>
                    <span>bł. {entry.errors}</span>
                  </div>
                ))
              ) : (
                <p className="text-[var(--brand-muted)]">Brak zapisanych operacji sync.</p>
              )}
            </div>
          </article>
        </div>

        <article className="mt-5 rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Oś czasu sync (ostatnie 7 uruchomień)</p>
          <div className="mt-3 space-y-2">
            {auditHistory.length > 0 ? (
              auditHistory.map((entry) => (
                <div key={`timeline-${entry.id}`} className="flex items-center justify-between rounded-lg bg-[#faf8f6] px-3 py-2 text-sm">
                  <span className="text-[#383433]">{formatDateTime(entry.finishedAt)}</span>
                  <span className={entry.status === "success" ? "text-emerald-700" : "text-rose-700"}>{entry.status === "success" ? "OK" : "Błąd"}</span>
                  <span className="text-[#5a524d]">+{entry.created}</span>
                  <span className="text-[#5a524d]">bł. {entry.errors}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--brand-muted)]">Brak danych historycznych synchronizacji.</p>
            )}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
