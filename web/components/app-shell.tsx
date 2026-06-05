"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ContractsIcon,
  CostControlIcon,
  DashboardIcon,
  IntegrationsIcon,
  InvoicesIcon,
  PaymentsIcon,
  ProfitLossIcon,
  ProjectsIcon,
  ReportsIcon,
  SalesIcon,
  SettingsIcon,
  WorkTimeIcon,
} from "@/components/menu-icons";
import type { MockDatasetName } from "@/lib/mock-contract-economics";
import { MOCK_DATASET_CHANGED_EVENT, readMockDatasetFromStorage } from "@/lib/mock-dataset";

interface AppShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

type ThemeMode = "light" | "dark" | "system";

type MenuItem = {
  label: string;
  href: string;
  icon: typeof DashboardIcon;
};

const headerActionButtonClass =
  "hidden md:inline-flex h-9 w-9 min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-[rgb(107_107_107_/_16%)] bg-white p-0 text-[var(--brand-muted)] shadow-sm aspect-square";

const menuItems: MenuItem[] = [
  { label: "Pulpit", href: "/pulpit", icon: DashboardIcon },
  { label: "Sprzedaż", href: "/sprzedaz", icon: SalesIcon },
  { label: "Kontrakty", href: "/kontrakty", icon: ContractsIcon },
  { label: "Projekty", href: "/projekty", icon: ProjectsIcon },
  { label: "Faktury", href: "/faktury", icon: InvoicesIcon },
  { label: "Płatności", href: "/platnosci", icon: PaymentsIcon },
  { label: "Czas i zespół", href: "/czas-pracy", icon: WorkTimeIcon },
  { label: "Kontrola kosztów", href: "/kontrola-kosztow", icon: CostControlIcon },
  { label: "Raporty", href: "/raporty", icon: ReportsIcon },
  { label: "P&L", href: "/pl", icon: ProfitLossIcon },
  { label: "Integracje", href: "/integracje", icon: IntegrationsIcon },
  { label: "Ustawienia", href: "/ustawienia", icon: SettingsIcon },
];

export function AppShell({
  title,
  subtitle,
  children,
  showSearch = false,
  searchPlaceholder = "Szukaj...",
  searchValue,
  onSearchChange,
}: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Keep SSR/CSR initial markup stable; hydrate dataset from storage after mount.
  const [activeDataset, setActiveDataset] = useState<MockDatasetName>("baseline");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [syncContext, setSyncContext] = useState<{
    status: "ok" | "error" | "idle";
    label: string;
  }>({ status: "idle", label: "Sync: brak danych" });
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function syncDataset() {
      setActiveDataset(readMockDatasetFromStorage());
    }

    syncDataset();

    window.addEventListener("storage", syncDataset);
    window.addEventListener(MOCK_DATASET_CHANGED_EVENT, syncDataset);

    return () => {
      window.removeEventListener("storage", syncDataset);
      window.removeEventListener(MOCK_DATASET_CHANGED_EVENT, syncDataset);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSyncContext() {
      try {
        const response = await fetch("/api/sync/audit", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Sync audit unavailable");
        }

        const payload = (await response.json()) as {
          items?: Array<{ status: string; finishedAt: string }>;
        };

        if (!active) {
          return;
        }

        const latest = payload.items?.[0];
        if (!latest) {
          setSyncContext({ status: "idle", label: "Sync: brak historii" });
          return;
        }

        const status = latest.status === "success" ? "ok" : "error";
        const finishedAt = new Intl.DateTimeFormat("pl-PL", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(latest.finishedAt));

        setSyncContext({
          status,
          label: status === "ok" ? `Sync OK: ${finishedAt}` : `Sync z błędem: ${finishedAt}`,
        });
      } catch {
        if (active) {
          setSyncContext({ status: "error", label: "Sync: niedostępny" });
        }
      }
    }

    void loadSyncContext();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("bh-theme-mode");
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
      setThemeMode(storedTheme);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyThemeMode = () => {
      const resolved = themeMode === "system" ? (mediaQuery.matches ? "dark" : "light") : themeMode;
      root.dataset.theme = resolved;
    };

    applyThemeMode();

    const handleSystemThemeChange = () => {
      if (themeMode === "system") {
        applyThemeMode();
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    window.localStorage.setItem("bh-theme-mode", themeMode);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [themeMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!themeMenuRef.current) {
        return;
      }

      if (!themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsThemeMenuOpen(false);
        setIsFocusMode(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const themeModeLabel = useMemo(() => {
    if (themeMode === "light") {
      return "Jasny";
    }

    if (themeMode === "dark") {
      return "Ciemny";
    }

    return "Systemowy";
  }, [themeMode]);

  const contextPeriod = useMemo(() => {
    return searchParams.get("period") || searchParams.get("month") || "bieżący";
  }, [searchParams]);

  const syncBadgeClass = syncContext.status === "ok"
    ? "bg-emerald-100 text-emerald-800"
    : syncContext.status === "error"
      ? "bg-rose-100 text-rose-800"
      : "bg-slate-100 text-slate-700";

  const datasetLabel: Record<MockDatasetName, string> = {
    baseline: "Bazowy",
    stress: "Stresowy",
    incomplete: "Niekompletny",
  };

  function withDataset(path: string) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}dataset=${encodeURIComponent(activeDataset)}`;
  }

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-[#2d2b28]">
      <div className="flex min-h-screen">
        <aside className={`${isFocusMode ? "hidden" : "hidden w-[250px] shrink-0 border-r border-[rgb(107_107_107_/_14%)] bg-white/95 px-4 py-4 shadow-[0_0_24px_rgba(0,0,0,0.04)] md:flex md:flex-col"}`}>
          <div className="mb-6 flex items-center px-1">
            <Image src="/logo.png" alt="Box Haus" width={132} height={40} className="h-auto w-auto" />
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={withDataset(item.href)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${
                    isActive
                      ? "bg-[var(--brand-primary)] text-white shadow-sm"
                      : "text-[var(--brand-muted)] hover:bg-[rgb(228_101_14_/_7%)] hover:text-[#2d2b28]"
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded ${isActive ? "bg-white/20" : "bg-transparent"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl bg-[#fff4ea] px-4 py-4 text-[#8e4a14] shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Dzisiaj</p>
            <p className="mt-1 text-sm text-[#8c6a53]">3 priorytety operacyjne dla demo.</p>
            <div className="mt-3 space-y-2 text-xs">
              <div className="rounded-xl bg-white px-3 py-2 text-[#5a524d] shadow-sm">1. Zweryfikuj ryzyka KWS w raportach</div>
              <div className="rounded-xl bg-white px-3 py-2 text-[#5a524d] shadow-sm">2. Sprawdź status synchronizacji Optima</div>
              <div className="rounded-xl bg-white px-3 py-2 text-[#5a524d] shadow-sm">3. Potwierdź marżę top kontraktu</div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className={`${isFocusMode ? "hidden" : "flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(107_107_107_/_12%)] bg-white/90 px-4 py-3 shadow-[0_2px_18px_rgba(0,0,0,0.03)] md:px-6"}`}>
            <div className="flex items-center gap-4">
              <div className="md:hidden">
                <Image src="/logo.png" alt="Box Haus" width={120} height={34} className="h-auto w-auto" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
                  Raportowanie zarządcze
                </p>
                <h1 className="text-lg font-semibold tracking-wide md:text-[22px]">{title}</h1>
                <p className="text-sm text-[var(--brand-muted)]">{subtitle}</p>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-end gap-3 md:flex-none">
              {showSearch ? (
                <div className="hidden h-10 w-full max-w-[320px] items-center gap-2 rounded-2xl border border-[rgb(107_107_107_/_16%)] bg-[#fbfaf8] px-4 text-sm text-[var(--brand-muted)] shadow-sm md:flex">
                  <span>⌕</span>
                  <input
                    value={searchValue}
                    onChange={(event) => onSearchChange?.(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-transparent outline-none placeholder:text-[var(--brand-muted)]"
                  />
                </div>
              ) : null}

              <div className="relative hidden md:block" ref={themeMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsThemeMenuOpen((current) => !current)}
                  className={`${headerActionButtonClass} !inline-flex`}
                  aria-label={`Tryb motywu: ${themeModeLabel}`}
                  title={`Tryb motywu: ${themeModeLabel}`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path d="M8 14a4 4 0 1 0 8 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>

                {isThemeMenuOpen ? (
                  <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-[rgb(107_107_107_/_16%)] bg-white p-1.5 shadow-lg">
                    {([
                      { value: "light", label: "Jasny" },
                      { value: "dark", label: "Ciemny" },
                      { value: "system", label: "Systemowy" },
                    ] as Array<{ value: ThemeMode; label: string }>).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setThemeMode(option.value);
                          setIsThemeMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm ${themeMode === option.value ? "bg-[#fff2e8] text-[#8e4a14]" : "text-[#383433] hover:bg-[#faf7f4]"}`}
                      >
                        <span>{option.label}</span>
                        {themeMode === option.value ? <span className="text-xs">●</span> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <button type="button" className={headerActionButtonClass} aria-label="Powiadomienia">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path d="M12 5a4 4 0 0 0-4 4v2.6c0 .8-.3 1.5-.8 2.1L6 15h12l-1.2-1.3a3 3 0 0 1-.8-2.1V9a4 4 0 0 0-4-4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 17a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setIsFocusMode(true)}
                className={headerActionButtonClass}
                aria-label="Skupienie na treści"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M21 15v6h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className={headerActionButtonClass}
                aria-label="Odśwież widok"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="flex items-center gap-2 rounded-full bg-white px-2.5 py-1.5 shadow-sm">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-semibold text-white">
                  JK
                </div>
                <span className="text-sm font-medium text-[#473126]">Jan Kowalski</span>
              </div>
            </div>
          </header>

          <div className={`${isFocusMode ? "hidden" : "flex flex-wrap items-center gap-2 border-b border-[rgb(107_107_107_/_10%)] bg-[#fff7ef] px-4 py-2 text-xs md:px-6"}`}>
            <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-[#6a563f] shadow-sm">Zestaw: {datasetLabel[activeDataset]}</span>
            <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-[#6a563f] shadow-sm">Okres: {contextPeriod}</span>
            <span className={`rounded-full px-2.5 py-1 font-semibold shadow-sm ${syncBadgeClass}`}>{syncContext.label}</span>
          </div>

          <main className={`flex-1 ${isFocusMode ? "px-2 py-2 md:px-3 md:py-3" : "px-4 py-5 md:px-6 md:py-6"}`}>
            <div className="exec-enter">{children}</div>
          </main>

          {isFocusMode ? (
            <button
              type="button"
              onClick={() => setIsFocusMode(false)}
              className="fixed right-4 top-4 z-40 inline-flex h-9 items-center gap-2 rounded-xl border border-[rgb(107_107_107_/_16%)] bg-white px-3 text-sm font-medium text-[#383433] shadow-lg"
            >
              <span>Wyłącz focus</span>
              <span className="text-xs text-[var(--brand-muted)]">Esc</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
