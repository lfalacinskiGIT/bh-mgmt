"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ContractsIcon,
  CostControlIcon,
  DashboardIcon,
  IntegrationsIcon,
  InvoicesIcon,
  PaymentsIcon,
  ProjectsIcon,
  ReportsIcon,
  SalesIcon,
  SettingsIcon,
  TeamIcon,
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

type MenuItem = {
  label: string;
  href: string;
  icon: typeof DashboardIcon;
};

const menuItems: MenuItem[] = [
  { label: "Pulpit", href: "/pulpit", icon: DashboardIcon },
  { label: "Sprzedaż", href: "/sprzedaz", icon: SalesIcon },
  { label: "Kontrakty", href: "/kontrakty", icon: ContractsIcon },
  { label: "Projekty", href: "/projekty", icon: ProjectsIcon },
  { label: "Faktury", href: "/faktury", icon: InvoicesIcon },
  { label: "Płatności", href: "/platnosci", icon: PaymentsIcon },
  { label: "Kontrola kosztów", href: "/kontrola-kosztow", icon: CostControlIcon },
  { label: "Raporty", href: "/raporty", icon: ReportsIcon },
  { label: "Zespół", href: "/zespol", icon: TeamIcon },
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
  // Keep SSR/CSR initial markup stable; hydrate dataset from storage after mount.
  const [activeDataset, setActiveDataset] = useState<MockDatasetName>("baseline");

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

  function withDataset(path: string) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}dataset=${encodeURIComponent(activeDataset)}`;
  }

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-[#2d2b28]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[250px] shrink-0 border-r border-[rgb(107_107_107_/_14%)] bg-white/95 px-4 py-4 shadow-[0_0_24px_rgba(0,0,0,0.04)] md:flex md:flex-col">
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
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Szybki dostęp</p>
            <p className="mt-1 text-sm text-[#8c6a53]">Najczęściej używane obszary makiety.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#8c6a53] shadow-sm">Kontrakty</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#8c6a53] shadow-sm">Faktury</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#8c6a53] shadow-sm">Raporty</span>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgb(107_107_107_/_12%)] bg-white/90 px-4 py-4 shadow-[0_2px_18px_rgba(0,0,0,0.03)] md:px-6">
            <div className="flex items-center gap-4">
              <div className="md:hidden">
                <Image src="/logo.png" alt="Box Haus" width={120} height={34} className="h-auto w-auto" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
                  Dashboard Box Haus
                </p>
                <h1 className="text-lg font-semibold tracking-wide md:text-[22px]">{title}</h1>
                <p className="text-sm text-[var(--brand-muted)]">{subtitle}</p>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-end gap-3 md:flex-none">
              {showSearch ? (
                <div className="hidden w-full max-w-[320px] items-center gap-2 rounded-2xl border border-[rgb(107_107_107_/_16%)] bg-[#fbfaf8] px-4 py-2 text-sm text-[var(--brand-muted)] shadow-sm md:flex">
                  <span>⌕</span>
                  <input
                    value={searchValue}
                    onChange={(event) => onSearchChange?.(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-transparent outline-none placeholder:text-[var(--brand-muted)]"
                  />
                </div>
              ) : null}

              <button type="button" className="hidden rounded-xl border border-[rgb(107_107_107_/_16%)] bg-white px-3 py-2 text-[var(--brand-muted)] shadow-sm md:inline-flex">
                ⏷
              </button>
              <button type="button" className="hidden rounded-xl border border-[rgb(107_107_107_/_16%)] bg-white px-3 py-2 text-[var(--brand-muted)] shadow-sm md:inline-flex">
                🔔
              </button>
              <button type="button" className="hidden rounded-xl border border-[rgb(107_107_107_/_16%)] bg-white px-3 py-2 text-[var(--brand-muted)] shadow-sm md:inline-flex">
                ↗
              </button>
              <button type="button" className="hidden rounded-xl border border-[rgb(107_107_107_/_16%)] bg-white px-3 py-2 text-[var(--brand-muted)] shadow-sm md:inline-flex">
                ◌
              </button>

              <div className="flex items-center gap-3 rounded-full bg-white px-3 py-2 shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-primary)] text-sm font-semibold text-white">
                  JK
                </div>
                <span className="text-sm font-medium text-[#473126]">Jan Kowalski</span>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
