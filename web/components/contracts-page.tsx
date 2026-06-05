"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  getContractEconomics,
  getContractTotalCost,
  getManagerialMargin,
  getMarginReserve,
  type ContractEconomicsItem,
  type MockDatasetName,
  type ContractPriority,
  type ContractStatus,
} from "@/lib/mock-contract-economics";
import { normalizeMockDataset, persistMockDataset, readMockDatasetFromStorage } from "@/lib/mock-dataset";
import { getSourceRecords } from "@/lib/mock-management-reports";

const currency = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 2,
});

const contractStatusLabel: Record<ContractStatus, string> = {
  nowy: "Nowy",
  negocjacje: "Negocjacje",
  podpisany: "Podpisany",
  realizacja: "W realizacji",
  zakończony: "Zakończony",
};

const contractStatusClass: Record<ContractStatus, string> = {
  nowy: "bg-slate-100 text-slate-700",
  negocjacje: "bg-amber-100 text-amber-800",
  podpisany: "bg-emerald-100 text-emerald-800",
  realizacja: "bg-sky-100 text-sky-800",
  zakończony: "bg-rose-100 text-rose-800",
};

const statusDotClass: Record<ContractPriority, string> = {
  wysoki: "bg-[#db1832]",
  średni: "bg-[#e0ad3b]",
  niski: "bg-[#4cb24f]",
};

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  const monthIndex = Number(monthNumber) - 1;
  const date = new Date(Number(year), monthIndex, 1);

  if (Number.isNaN(date.getTime())) {
    return month;
  }

  return new Intl.DateTimeFormat("pl-PL", { month: "short", year: "numeric" }).format(date);
}

function quarterFromMonth(month: string): string {
  const [year, monthNumberRaw] = month.split("-");
  const monthNumber = Number(monthNumberRaw);
  const quarter = Math.ceil(monthNumber / 3);

  if (!year || Number.isNaN(monthNumber) || quarter < 1 || quarter > 4) {
    return "N/A";
  }

  return `${year}-Q${quarter}`;
}

function quarterLabel(quarterKey: string): string {
  const [year, quarterRaw] = quarterKey.split("-Q");
  if (!year || !quarterRaw) {
    return quarterKey;
  }

  return `Q${quarterRaw} ${year}`;
}

function formatDelta(amount: number): string {
  if (amount === 0) {
    return "0";
  }

  const sign = amount > 0 ? "+" : "-";
  return `${sign}${currency.format(Math.abs(amount))}`;
}

type MapCityCoordinate = {
  lat: number;
  lon: number;
};

const mapPolandBounds = {
  minLat: 49.0,
  maxLat: 54.95,
  minLon: 14.0,
  maxLon: 24.7,
};

const contractCityCoordinates: Record<string, MapCityCoordinate> = {
  Gdańsk: { lat: 54.352, lon: 18.646 },
  Poznań: { lat: 52.406, lon: 16.925 },
  Wrocław: { lat: 51.107, lon: 17.038 },
  Łódź: { lat: 51.759, lon: 19.456 },
  Katowice: { lat: 50.264, lon: 19.023 },
};

function projectMapPoint(lat: number, lon: number): { left: string; top: string } {
  const horizontalRange = mapPolandBounds.maxLon - mapPolandBounds.minLon;
  const verticalRange = mapPolandBounds.maxLat - mapPolandBounds.minLat;
  const left = ((lon - mapPolandBounds.minLon) / horizontalRange) * 100;
  const top = ((mapPolandBounds.maxLat - lat) / verticalRange) * 100;

  return {
    left: `${Math.min(96, Math.max(4, left))}%`,
    top: `${Math.min(96, Math.max(4, top))}%`,
  };
}

function buildSparklinePoints(values: number[], width = 220, height = 56): string {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return `0,${height / 2}`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function ContractsPage() {
  const searchParams = useSearchParams();
  const queryLineOfBusiness = searchParams.get("lineOfBusiness")?.trim() ?? "all";
  const queryContractId = searchParams.get("contractId")?.trim() ?? "";
  const queryDataset = normalizeMockDataset(searchParams.get("dataset")?.trim());
  const contractCardRef = useRef<HTMLElement | null>(null);

  const [dataset, setDataset] = useState<MockDatasetName>(() => {
    if (queryDataset !== "baseline") {
      return queryDataset;
    }

    if (typeof window === "undefined") {
      return "baseline";
    }

    return readMockDatasetFromStorage();
  });
  const [search, setSearch] = useState("");
  const [trendGranularity, setTrendGranularity] = useState<"month" | "quarter">("month");
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [lineOfBusinessFilter, setLineOfBusinessFilter] = useState<string>(queryLineOfBusiness || "all");
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"startDate" | "number" | "clientName" | "valueContractNet" | "marginReserve" | "status">("startDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [groupBy, setGroupBy] = useState<"none" | "status" | "city" | "lineOfBusiness">("none");
  const contractsData = useMemo(() => getContractEconomics(dataset), [dataset]);
  const [selectedContractId, setSelectedContractId] = useState<string>(queryContractId || (contractsData[0]?.id ?? ""));

  useEffect(() => {
    document.body.style.overflow = showSidePanel ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [showSidePanel]);

  useEffect(() => {
    persistMockDataset(dataset);
  }, [dataset]);

  const filteredContracts = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return contractsData.filter((contract) => {
      const lineMatch = lineOfBusinessFilter === "all" ? true : contract.lineOfBusiness === lineOfBusinessFilter;
      if (!lineMatch) {
        return false;
      }

      const statusMatch = statusFilter === "all" ? true : contract.status === statusFilter;
      if (!statusMatch) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const haystack = [contract.number, contract.clientName, contract.objectName, contract.city, contract.status]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [contractsData, lineOfBusinessFilter, search, statusFilter]);

  const sortedContracts = useMemo(() => {
    const contracts = [...filteredContracts];

    contracts.sort((left, right) => {
      let comparison = 0;

      switch (sortBy) {
        case "number":
          comparison = left.number.localeCompare(right.number);
          break;
        case "clientName":
          comparison = left.clientName.localeCompare(right.clientName);
          break;
        case "valueContractNet":
          comparison = left.valueContractNet - right.valueContractNet;
          break;
        case "marginReserve":
          comparison = getMarginReserve(left) - getMarginReserve(right);
          break;
        case "status":
          comparison = contractStatusLabel[left.status].localeCompare(contractStatusLabel[right.status]);
          break;
        case "startDate":
        default:
          comparison = left.startDate.localeCompare(right.startDate);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return contracts;
  }, [filteredContracts, sortBy, sortDirection]);

  const lineOfBusinessOptions = useMemo(
    () => Array.from(new Set(contractsData.map((contract) => contract.lineOfBusiness))).sort(),
    [contractsData],
  );

  const totals = useMemo(() => {
    const valueNet = filteredContracts.reduce((sum, contract) => sum + contract.valueContractNet, 0);
    const marginReserve = filteredContracts.reduce((sum, contract) => sum + getMarginReserve(contract), 0);
    const active = filteredContracts.filter((contract) => contract.status === "realizacja" || contract.status === "podpisany").length;
    const negotiation = filteredContracts.filter((contract) => contract.status === "negocjacje").length;
    const newContracts = filteredContracts.filter((contract) => contract.status === "nowy").length;
    const completed = filteredContracts.filter((contract) => contract.status === "zakończony").length;

    return { total: filteredContracts.length, valueNet, marginReserve, active, negotiation, newContracts, completed };
  }, [filteredContracts]);

  const recentContracts = [...filteredContracts].sort((left, right) => right.startDate.localeCompare(left.startDate)).slice(0, 3);
  const groupedContracts = useMemo(() => {
    if (groupBy === "none") {
      return [{ label: "Wszystkie kontrakty", key: "all", contracts: sortedContracts }];
    }

    const groups = new Map<string, ContractEconomicsItem[]>();

    sortedContracts.forEach((contract) => {
      const groupKey =
        groupBy === "status"
          ? contractStatusLabel[contract.status]
          : groupBy === "city"
            ? contract.city
            : contract.lineOfBusiness;

      const existing = groups.get(groupKey) ?? [];
      existing.push(contract);
      groups.set(groupKey, existing);
    });

    return Array.from(groups.entries())
      .map(([label, contracts]) => ({ label, key: label, contracts }))
      .sort((left, right) => right.contracts.length - left.contracts.length || left.label.localeCompare(right.label));
  }, [groupBy, sortedContracts]);
  const mapCityGroups = useMemo(() => {
    const grouped = new Map<string, { city: string; count: number; contractId: string; lat: number; lon: number }>();

    filteredContracts.forEach((contract) => {
      const coordinates = contractCityCoordinates[contract.city];

      if (!coordinates) {
        return;
      }

      const existing = grouped.get(contract.city);
      if (existing) {
        existing.count += 1;
        return;
      }

      grouped.set(contract.city, {
        city: contract.city,
        count: 1,
        contractId: contract.id,
        lat: coordinates.lat,
        lon: coordinates.lon,
      });
    });

    return Array.from(grouped.values()).sort((left, right) => right.count - left.count || left.city.localeCompare(right.city));
  }, [filteredContracts]);

  const selectedContract = filteredContracts.find((contract) => contract.id === selectedContractId) ?? filteredContracts[0] ?? null;
  const shouldSpotlightContractCard = !!queryContractId && selectedContract?.id === queryContractId;

  useEffect(() => {
    if (!shouldSpotlightContractCard || !contractCardRef.current) {
      return;
    }

    contractCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [shouldSpotlightContractCard]);

  const selectedMapCity = selectedContract ? contractCityCoordinates[selectedContract.city] : null;
  const mapSrc = selectedMapCity
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(selectedMapCity.lon - 0.55).toFixed(6)}%2C${(selectedMapCity.lat - 0.35).toFixed(6)}%2C${(selectedMapCity.lon + 0.55).toFixed(6)}%2C${(selectedMapCity.lat + 0.35).toFixed(6)}&layer=mapnik&marker=${selectedMapCity.lat.toFixed(6)}%2C${selectedMapCity.lon.toFixed(6)}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${mapPolandBounds.minLon}%2C${mapPolandBounds.minLat}%2C${mapPolandBounds.maxLon}%2C${mapPolandBounds.maxLat}&layer=mapnik`;

  const selectedContractStats = useMemo(() => {
    if (!selectedContract) {
      return null;
    }

    const totalCost = getContractTotalCost(selectedContract);
    const marginReserve = getMarginReserve(selectedContract);
    const managerialMargin = getManagerialMargin(selectedContract);

    return {
      totalCost,
      marginReserve,
      managerialMargin,
    };
  }, [selectedContract]);

  const selectedContractProperties = useMemo(() => {
    if (!selectedContract || !selectedContractStats) {
      return null;
    }

    const durationDays = Math.max(
      1,
      Math.round(
        (new Date(selectedContract.endDate).getTime() - new Date(selectedContract.startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    const realizedShare =
      selectedContract.valueContractNet > 0
        ? (selectedContract.revenueRecognizedNet / selectedContract.valueContractNet) * 100
        : 0;
    const costShare =
      selectedContract.valueContractNet > 0
        ? (selectedContractStats.totalCost / selectedContract.valueContractNet) * 100
        : 0;

    return {
      durationDays,
      realizedShare,
      costShare,
      remainingValue: selectedContract.valueContractNet - selectedContract.revenueRecognizedNet,
    };
  }, [selectedContract, selectedContractStats]);

  const selectedContractMonthlyTrend = useMemo(() => {
    if (!selectedContract) {
      return null;
    }

    const records = getSourceRecords(dataset).filter((record) => record.contractId === selectedContract.id);
    if (records.length === 0) {
      return null;
    }

    const perMonth = new Map<string, { revenue: number; cost: number }>();
    for (const record of records) {
      const month = record.postedAt.slice(0, 7);
      const current = perMonth.get(month) ?? { revenue: 0, cost: 0 };

      if (record.type === "revenue") {
        current.revenue += record.netAmount;
      } else {
        current.cost += record.netAmount;
      }

      perMonth.set(month, current);
    }

    const monthKeysAsc = Array.from(perMonth.keys()).sort((a, b) => a.localeCompare(b));
    const currentMonth = monthKeysAsc.at(-1);

    if (!currentMonth) {
      return null;
    }

    const previousMonth = monthKeysAsc.at(-2) ?? null;
    const currentData = perMonth.get(currentMonth) ?? { revenue: 0, cost: 0 };
    const previousData = previousMonth ? (perMonth.get(previousMonth) ?? { revenue: 0, cost: 0 }) : { revenue: 0, cost: 0 };

    const currentMargin = currentData.revenue - currentData.cost;
    const previousMargin = previousData.revenue - previousData.cost;

    const cumulativeCostCurrent = monthKeysAsc
      .filter((month) => month <= currentMonth)
      .reduce((sum, month) => sum + (perMonth.get(month)?.cost ?? 0), 0);

    const cumulativeCostPrevious = previousMonth
      ? monthKeysAsc
          .filter((month) => month <= previousMonth)
          .reduce((sum, month) => sum + (perMonth.get(month)?.cost ?? 0), 0)
      : 0;

    const reserveCurrent = selectedContract.valueContractNet - cumulativeCostCurrent;
    const reservePrevious = selectedContract.valueContractNet - cumulativeCostPrevious;

    let cumulativeCost = 0;
    const history = monthKeysAsc.map((month) => {
      const monthData = perMonth.get(month) ?? { revenue: 0, cost: 0 };
      cumulativeCost += monthData.cost;

      return {
        key: month,
        revenue: monthData.revenue,
        cost: monthData.cost,
        margin: monthData.revenue - monthData.cost,
        reserve: selectedContract.valueContractNet - cumulativeCost,
      };
    });

    return {
      currentMonth,
      previousMonth,
      current: {
        revenue: currentData.revenue,
        cost: currentData.cost,
        margin: currentMargin,
        reserve: reserveCurrent,
      },
      deltas: {
        revenue: currentData.revenue - previousData.revenue,
        cost: currentData.cost - previousData.cost,
        margin: currentMargin - previousMargin,
        reserve: reserveCurrent - reservePrevious,
      },
      history,
    };
  }, [dataset, selectedContract]);

  const selectedContractQuarterlyTrend = useMemo(() => {
    if (!selectedContract) {
      return null;
    }

    const records = getSourceRecords(dataset).filter((record) => record.contractId === selectedContract.id);
    if (records.length === 0) {
      return null;
    }

    const perQuarter = new Map<string, { revenue: number; cost: number }>();
    for (const record of records) {
      const quarter = quarterFromMonth(record.postedAt.slice(0, 7));
      const current = perQuarter.get(quarter) ?? { revenue: 0, cost: 0 };

      if (record.type === "revenue") {
        current.revenue += record.netAmount;
      } else {
        current.cost += record.netAmount;
      }

      perQuarter.set(quarter, current);
    }

    const quarterKeysAsc = Array.from(perQuarter.keys()).sort((a, b) => a.localeCompare(b));
    const currentQuarter = quarterKeysAsc.at(-1);

    if (!currentQuarter) {
      return null;
    }

    const previousQuarter = quarterKeysAsc.at(-2) ?? null;
    const currentData = perQuarter.get(currentQuarter) ?? { revenue: 0, cost: 0 };
    const previousData = previousQuarter ? (perQuarter.get(previousQuarter) ?? { revenue: 0, cost: 0 }) : { revenue: 0, cost: 0 };

    const currentMargin = currentData.revenue - currentData.cost;
    const previousMargin = previousData.revenue - previousData.cost;

    const cumulativeCostCurrent = quarterKeysAsc
      .filter((quarter) => quarter <= currentQuarter)
      .reduce((sum, quarter) => sum + (perQuarter.get(quarter)?.cost ?? 0), 0);

    const cumulativeCostPrevious = previousQuarter
      ? quarterKeysAsc
          .filter((quarter) => quarter <= previousQuarter)
          .reduce((sum, quarter) => sum + (perQuarter.get(quarter)?.cost ?? 0), 0)
      : 0;

    const reserveCurrent = selectedContract.valueContractNet - cumulativeCostCurrent;
    const reservePrevious = selectedContract.valueContractNet - cumulativeCostPrevious;

    let cumulativeCost = 0;
    const history = quarterKeysAsc.map((quarter) => {
      const quarterData = perQuarter.get(quarter) ?? { revenue: 0, cost: 0 };
      cumulativeCost += quarterData.cost;

      return {
        key: quarter,
        revenue: quarterData.revenue,
        cost: quarterData.cost,
        margin: quarterData.revenue - quarterData.cost,
        reserve: selectedContract.valueContractNet - cumulativeCost,
      };
    });

    return {
      currentQuarter,
      previousQuarter,
      current: {
        revenue: currentData.revenue,
        cost: currentData.cost,
        margin: currentMargin,
        reserve: reserveCurrent,
      },
      deltas: {
        revenue: currentData.revenue - previousData.revenue,
        cost: currentData.cost - previousData.cost,
        margin: currentMargin - previousMargin,
        reserve: reserveCurrent - reservePrevious,
      },
      history,
    };
  }, [dataset, selectedContract]);

  const activeTrend = trendGranularity === "month" ? selectedContractMonthlyTrend : selectedContractQuarterlyTrend;
  const activeTrendSparkline = useMemo(() => {
    if (!activeTrend) {
      return { marginPoints: "", reservePoints: "" };
    }

    const marginSeries = activeTrend.history.map((item) => item.margin);
    const reserveSeries = activeTrend.history.map((item) => item.reserve);

    return {
      marginPoints: buildSparklinePoints(marginSeries),
      reservePoints: buildSparklinePoints(reserveSeries),
    };
  }, [activeTrend]);

  const pipeline = [
    { label: "Nowe", value: totals.newContracts, color: "#f28b25" },
    { label: "Negocjacje", value: totals.negotiation, color: "#e0ad3b" },
    { label: "Podpisane", value: contractsData.filter((contract) => contract.status === "podpisany").length, color: "#4cb24f" },
    { label: "Realizacja", value: totals.active, color: "#3d8bfd" },
    { label: "Zakończone", value: totals.completed, color: "#db1832" },
  ];

  const quickTiles = [
    { title: "Aktywne kontrakty", value: totals.active, accentClass: "border-l-[#f28b25]" },
    { title: "Wartość portfela", value: currency.format(totals.valueNet), accentClass: "border-l-[#e0ad3b]" },
    { title: "Zapas marży", value: currency.format(totals.marginReserve), accentClass: "border-l-[#4cb24f]" },
    { title: "Do podpisu", value: totals.negotiation, accentClass: "border-l-[#db1832]" },
  ];

  const stageDotClass: Record<string, string> = {
    "#f28b25": "bg-[#f28b25]",
    "#e0ad3b": "bg-[#e0ad3b]",
    "#4cb24f": "bg-[#4cb24f]",
    "#3d8bfd": "bg-[#3d8bfd]",
    "#db1832": "bg-[#db1832]",
  };

  return (
    <AppShell
      title="Kontrakty"
      subtitle="Przegląd kontraktów i etapów realizacji"
      showSearch
      searchPlaceholder="Szukaj kontraktu..."
      searchValue={search}
      onSearchChange={setSearch}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {quickTiles.map((tile) => (
          <article key={tile.title} className={`card-surface rounded-xl border-l-[4px] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${tile.accentClass}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">{tile.title}</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <span className="text-3xl font-semibold text-[#383433]">{tile.value}</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(228_101_14_/_10%)] text-[var(--brand-primary)]">•</span>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Mapa kontraktów</h2>
            <p className="text-sm text-[var(--brand-muted)]">Przegląd etapów i lokalizacji</p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl bg-[#fbfaf8] p-1 shadow-sm">
            <select
              value={dataset}
              onChange={(event) => setDataset(normalizeMockDataset(event.target.value))}
              aria-label="Zestaw danych"
              className="h-10 rounded-lg border border-[rgb(107_107_107_/_16%)] bg-white px-3 text-sm text-[#383433]"
            >
              <option value="baseline">Dataset: Baseline</option>
              <option value="stress">Dataset: Stress</option>
              <option value="incomplete">Dataset: Incomplete</option>
            </select>
            <select
              value={lineOfBusinessFilter}
              onChange={(event) => setLineOfBusinessFilter(event.target.value)}
              aria-label="Filtr linii biznesowej"
              className="h-10 rounded-lg border border-[rgb(107_107_107_/_16%)] bg-white px-3 text-sm text-[#383433]"
            >
              <option value="all">Wszystkie linie</option>
              {lineOfBusinessOptions.map((line) => (
                <option key={line} value={line}>
                  {line}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ContractStatus | "all")}
              aria-label="Filtr statusu kontraktu"
              className="h-10 rounded-lg border border-[rgb(107_107_107_/_16%)] bg-white px-3 text-sm text-[#383433]"
            >
              <option value="all">Wszystkie statusy</option>
              {Object.entries(contractStatusLabel).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`rounded-lg px-3 py-2 text-sm shadow-sm transition ${viewMode === "cards" ? "bg-white font-semibold text-[var(--brand-primary)]" : "text-[var(--brand-muted)]"}`}
            >
              Mapa
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-lg px-3 py-2 text-sm shadow-sm transition ${viewMode === "list" ? "bg-white font-semibold text-[var(--brand-primary)]" : "text-[var(--brand-muted)]"}`}
            >
              Lista
            </button>
            <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--brand-primary)]">
              Zobacz wszystkie
            </button>
            <button
              type="button"
              onClick={() => setShowSidePanel((current) => !current)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--brand-primary)]"
            >
              {showSidePanel ? "Ukryj panel" : "Pokaż panel"}
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#f4f0e8] p-4 md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(232,240,214,0.65),transparent_34%)]" />
          <div className="relative flex min-h-[1120px] flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {pipeline.map((stage) => (
                <div key={stage.label} className="rounded-2xl border border-white/60 bg-white/72 p-4 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#4c4540]">{stage.label}</p>
                    <span className={`h-3 w-3 rounded-full ${stageDotClass[stage.color]}`} />
                  </div>
                  <p className="mt-3 text-4xl font-semibold text-[#383433]">{stage.value}</p>
                  <p className="mt-2 text-xs text-[var(--brand-muted)]">Kontrakty na obecnym etapie</p>
                </div>
              ))}
            </div>

            <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/70 bg-white/45 shadow-sm">
              <iframe
                title="OpenStreetMap kontraktów"
                src={mapSrc}
                className="absolute inset-0 h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06),rgba(255,255,255,0.12))]" />
              <div className="absolute left-4 top-4 rounded-lg border border-white/70 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">OpenStreetMap View</p>
                <p className="mt-1 text-sm font-semibold text-[#383433]">
                  {selectedContract ? `${selectedContract.city} • ${selectedContract.number}` : "Widok kontraktów"}
                </p>
              </div>

              <div className="absolute right-4 top-4 rounded-lg border border-white/70 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Miasta</p>
                <p className="mt-1 text-sm font-semibold text-[#383433]">{mapCityGroups.length} lokalizacji</p>
              </div>

              <div className="absolute inset-0">
                {mapCityGroups.map((marker) => {
                  const position = projectMapPoint(marker.lat, marker.lon);
                  const isSelected = selectedContract?.city === marker.city;

                  return (
                    <button
                      key={marker.city}
                      type="button"
                      onClick={() => setSelectedContractId(marker.contractId)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg transition hover:scale-105 ${
                        isSelected ? "bg-[#db1832] text-white" : "bg-[#3d8bfd] text-white"
                      }`}
                      style={{ left: position.left, top: position.top }}
                      aria-label={`Pokaż kontrakty w mieście ${marker.city}`}
                      title={`${marker.city} • ${marker.count} kontrakt${marker.count === 1 ? "" : marker.count < 5 ? "y" : "ów"}`}
                    >
                      <span className="flex h-11 w-11 items-center justify-center text-sm font-semibold">{marker.count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="absolute bottom-3 left-3 max-w-[360px] rounded-xl border border-white/70 bg-white/92 px-3 py-2 shadow-sm backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Legenda</p>
                <p className="mt-1 text-xs leading-snug text-[#383433]">Punkty pokazują liczbę kontraktów w mieście. Kliknij marker lub etykietę, aby podmienić wybrany kontrakt.</p>
                <div className="mt-2 flex max-w-full gap-1 overflow-x-auto pb-1">
                  {mapCityGroups.map((marker) => (
                    <button
                      key={`${marker.city}-chip`}
                      type="button"
                      onClick={() => setSelectedContractId(marker.contractId)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition ${
                        selectedContract?.city === marker.city ? "bg-[#383433] text-white" : "bg-[#faf8f6] text-[#383433]"
                      }`}
                    >
                      {marker.city} ({marker.count})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

          <div className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-white p-4 md:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Lista kontraktów</h2>
                <p className="text-sm text-[var(--brand-muted)]">Pełna lista z filtrowaniem, sortowaniem i grupowaniem</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={groupBy}
                  onChange={(event) => setGroupBy(event.target.value as "none" | "status" | "city" | "lineOfBusiness")}
                  aria-label="Grupuj kontrakty"
                  className="h-10 rounded-lg border border-[rgb(107_107_107_/_16%)] bg-[#fbfaf8] px-3 text-sm text-[#383433]"
                >
                  <option value="none">Bez grupowania</option>
                  <option value="status">Grupuj po statusie</option>
                  <option value="city">Grupuj po mieście</option>
                  <option value="lineOfBusiness">Grupuj po linii</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                  aria-label="Sortuj kontrakty"
                  className="h-10 rounded-lg border border-[rgb(107_107_107_/_16%)] bg-[#fbfaf8] px-3 text-sm text-[#383433]"
                >
                  <option value="startDate">Sortuj po dacie startu</option>
                  <option value="number">Sortuj po numerze</option>
                  <option value="clientName">Sortuj po kliencie</option>
                  <option value="valueContractNet">Sortuj po wartości</option>
                  <option value="marginReserve">Sortuj po zapasie marży</option>
                  <option value="status">Sortuj po statusie</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
                  className="h-10 rounded-lg border border-[rgb(107_107_107_/_16%)] bg-[#fbfaf8] px-3 text-sm font-semibold text-[#383433] shadow-sm"
                >
                  {sortDirection === "asc" ? "Rosnąco" : "Malejąco"}
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {groupedContracts.map((group) => (
                <section key={group.key} className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-3 md:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#383433]">{group.label}</h3>
                      <p className="text-xs text-[var(--brand-muted)]">{group.contracts.length} kontrakt{group.contracts.length === 1 ? "" : group.contracts.length < 5 ? "y" : "ów"}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#383433] shadow-sm">
                      {currency.format(group.contracts.reduce((sum, contract) => sum + contract.valueContractNet, 0))}
                    </span>
                  </div>

                  <div className="mt-3 overflow-x-auto rounded-xl border border-white/70 bg-white shadow-sm">
                    <table className="min-w-[1100px] w-full border-collapse text-sm">
                      <thead className="bg-[#f7f4ef] text-left text-[11px] uppercase tracking-[0.12em] text-[var(--brand-muted)]">
                        <tr>
                          <th className="px-3 py-3 font-semibold">Kontrakt</th>
                          <th className="px-3 py-3 font-semibold">Klient</th>
                          <th className="px-3 py-3 font-semibold">Miasto</th>
                          <th className="px-3 py-3 font-semibold">Linia</th>
                          <th className="px-3 py-3 font-semibold">Status</th>
                          <th className="px-3 py-3 font-semibold">Wartość</th>
                          <th className="px-3 py-3 font-semibold">Koszt</th>
                          <th className="px-3 py-3 font-semibold">Zapas</th>
                          <th className="px-3 py-3 font-semibold">Start / koniec</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.contracts.map((contract) => {
                          const totalCost = getContractTotalCost(contract);
                          const marginReserve = getMarginReserve(contract);
                          const isSelected = selectedContract?.id === contract.id;

                          return (
                            <tr
                              key={contract.id}
                              onClick={() => setSelectedContractId(contract.id)}
                              className={`cursor-pointer border-t border-[rgb(107_107_107_/_10%)] transition hover:bg-[#fff8f1] ${isSelected ? "bg-[#fff3e8]" : "bg-white"}`}
                            >
                              <td className="px-3 py-3 font-semibold text-[#383433]">{contract.number}</td>
                              <td className="px-3 py-3 text-[#383433]">{contract.clientName}</td>
                              <td className="px-3 py-3 text-[#383433]">{contract.city}</td>
                              <td className="px-3 py-3 text-[#383433]">{contract.lineOfBusiness}</td>
                              <td className="px-3 py-3">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${contractStatusClass[contract.status]}`}>
                                  {contractStatusLabel[contract.status]}
                                </span>
                              </td>
                              <td className="px-3 py-3 font-semibold text-[#383433]">{currency.format(contract.valueContractNet)}</td>
                              <td className="px-3 py-3 font-semibold text-[#383433]">{currency.format(totalCost)}</td>
                              <td className="px-3 py-3 font-semibold text-[#383433]">{currency.format(marginReserve)}</td>
                              <td className="px-3 py-3 text-[#383433]">
                                <div className="flex flex-col gap-1">
                                  <span>{contract.startDate}</span>
                                  <span className="text-xs text-[var(--brand-muted)]">{contract.endDate}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-white p-4 md:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Lista kontraktów</h2>
                <p className="text-sm text-[var(--brand-muted)]">Pełna lista z filtrowaniem, sortowaniem i grupowaniem</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={groupBy}
                  onChange={(event) => setGroupBy(event.target.value as "none" | "status" | "city" | "lineOfBusiness")}
                  aria-label="Grupuj kontrakty"
                  className="h-10 rounded-lg border border-[rgb(107_107_107_/_16%)] bg-[#fbfaf8] px-3 text-sm text-[#383433]"
                >
                  <option value="none">Bez grupowania</option>
                  <option value="status">Grupuj po statusie</option>
                  <option value="city">Grupuj po mieście</option>
                  <option value="lineOfBusiness">Grupuj po linii</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                  aria-label="Sortuj kontrakty"
                  className="h-10 rounded-lg border border-[rgb(107_107_107_/_16%)] bg-[#fbfaf8] px-3 text-sm text-[#383433]"
                >
                  <option value="startDate">Sortuj po dacie startu</option>
                  <option value="number">Sortuj po numerze</option>
                  <option value="clientName">Sortuj po kliencie</option>
                  <option value="valueContractNet">Sortuj po wartości</option>
                  <option value="marginReserve">Sortuj po zapasie marży</option>
                  <option value="status">Sortuj po statusie</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
                  className="h-10 rounded-lg border border-[rgb(107_107_107_/_16%)] bg-[#fbfaf8] px-3 text-sm font-semibold text-[#383433] shadow-sm"
                >
                  {sortDirection === "asc" ? "Rosnąco" : "Malejąco"}
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {groupedContracts.map((group) => (
                <section key={group.key} className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-3 md:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#383433]">{group.label}</h3>
                      <p className="text-xs text-[var(--brand-muted)]">{group.contracts.length} kontrakt{group.contracts.length === 1 ? "" : group.contracts.length < 5 ? "y" : "ów"}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#383433] shadow-sm">
                      {currency.format(group.contracts.reduce((sum, contract) => sum + contract.valueContractNet, 0))}
                    </span>
                  </div>

                  <div className="mt-3 overflow-x-auto rounded-xl border border-white/70 bg-white shadow-sm">
                    <table className="min-w-[1100px] w-full border-collapse text-sm">
                      <thead className="bg-[#f7f4ef] text-left text-[11px] uppercase tracking-[0.12em] text-[var(--brand-muted)]">
                        <tr>
                          <th className="px-3 py-3 font-semibold">Kontrakt</th>
                          <th className="px-3 py-3 font-semibold">Klient</th>
                          <th className="px-3 py-3 font-semibold">Miasto</th>
                          <th className="px-3 py-3 font-semibold">Linia</th>
                          <th className="px-3 py-3 font-semibold">Status</th>
                          <th className="px-3 py-3 font-semibold">Wartość</th>
                          <th className="px-3 py-3 font-semibold">Koszt</th>
                          <th className="px-3 py-3 font-semibold">Zapas</th>
                          <th className="px-3 py-3 font-semibold">Start / koniec</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.contracts.map((contract) => {
                          const totalCost = getContractTotalCost(contract);
                          const marginReserve = getMarginReserve(contract);
                          const isSelected = selectedContract?.id === contract.id;

                          return (
                            <tr
                              key={contract.id}
                              onClick={() => setSelectedContractId(contract.id)}
                              className={`cursor-pointer border-t border-[rgb(107_107_107_/_10%)] transition hover:bg-[#fff8f1] ${isSelected ? "bg-[#fff3e8]" : "bg-white"}`}
                            >
                              <td className="px-3 py-3 font-semibold text-[#383433]">{contract.number}</td>
                              <td className="px-3 py-3 text-[#383433]">{contract.clientName}</td>
                              <td className="px-3 py-3 text-[#383433]">{contract.city}</td>
                              <td className="px-3 py-3 text-[#383433]">{contract.lineOfBusiness}</td>
                              <td className="px-3 py-3">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${contractStatusClass[contract.status]}`}>
                                  {contractStatusLabel[contract.status]}
                                </span>
                              </td>
                              <td className="px-3 py-3 font-semibold text-[#383433]">{currency.format(contract.valueContractNet)}</td>
                              <td className="px-3 py-3 font-semibold text-[#383433]">{currency.format(totalCost)}</td>
                              <td className="px-3 py-3 font-semibold text-[#383433]">{currency.format(marginReserve)}</td>
                              <td className="px-3 py-3 text-[#383433]">
                                <div className="flex flex-col gap-1">
                                  <span>{contract.startDate}</span>
                                  <span className="text-xs text-[var(--brand-muted)]">{contract.endDate}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          </div>
        <div className={`fixed inset-0 z-30 transition-opacity duration-300 ease-out ${showSidePanel ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
          <button
            type="button"
            aria-label="Zamknij panel skrótów i aktywności"
            className={`absolute inset-0 bg-[#201b17]/35 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${showSidePanel ? "opacity-100" : "opacity-0"}`}
            onClick={() => setShowSidePanel(false)}
          />
          <aside
            className={`absolute right-0 top-0 h-full w-full max-w-[420px] overflow-y-auto border-l border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-4 shadow-2xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform transform-gpu md:p-6 ${
              showSidePanel ? "translate-x-0 scale-100 opacity-100" : "translate-x-full scale-[0.98] opacity-0"
            }`}
          >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[#383433]">Skróty i aktywność</h3>
                  <p className="mt-1 text-sm text-[var(--brand-muted)]">Najważniejsze działania i ostatnie zmiany</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSidePanel(false)}
                  className="rounded-lg border border-[rgb(107_107_107_/_18%)] bg-white px-3 py-2 text-xs font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]"
                >
                  Ukryj
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <button type="button" className="rounded-xl bg-white px-4 py-3 text-left shadow-sm transition hover:shadow-md">
                  <p className="text-sm text-[var(--brand-muted)]">Nowy kontrakt</p>
                  <p className="mt-2 text-xs text-[#383433]">Szybki dostęp do tworzenia umowy.</p>
                </button>
                <button type="button" className="rounded-xl bg-white px-4 py-3 text-left shadow-sm transition hover:shadow-md">
                  <p className="text-sm text-[var(--brand-muted)]">Historia zmian</p>
                  <p className="mt-2 text-xs text-[#383433]">Ostatnie zmiany i synchronizacje.</p>
                </button>
                <button type="button" className="rounded-xl bg-white px-4 py-3 text-left shadow-sm transition hover:shadow-md">
                  <p className="text-sm text-[var(--brand-muted)]">Podgląd KPI</p>
                  <p className="mt-2 text-xs text-[#383433]">Przegląd kluczowych wskaźników kontraktu.</p>
                </button>
              </div>
            </aside>
          </div>
      </section>

      {selectedContract && selectedContractStats ? (
        <section
          ref={contractCardRef}
          className={`mt-6 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6 ${
            shouldSpotlightContractCard
              ? "border-2 border-[var(--brand-primary)] bg-[#fff8f1]"
              : "bg-white"
          }`}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Karta kontraktu (MVP)</h2>
              <p className="text-sm text-[var(--brand-muted)]">
                {selectedContract.number} • {selectedContract.objectName}
              </p>
            </div>
            <span className="rounded-full bg-[#fff4ea] px-3 py-1 text-xs font-semibold text-[#8e4a14]">
              Linia biznesowa: {selectedContract.lineOfBusiness}
            </span>
          </div>

          {shouldSpotlightContractCard ? (
            <div className="mt-3 rounded-xl bg-[rgb(228_101_14_/_10%)] px-3 py-2 text-xs font-semibold text-[#8e4a14]">
              Widok ustawiony z drilldown raportowego dla wybranego kontraktu.
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
              <p className="text-xs text-[var(--brand-muted)]">Wartość umowna</p>
              <p className="mt-2 text-lg font-semibold text-[#383433]">{currency.format(selectedContract.valueContractNet)}</p>
            </article>
            <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
              <p className="text-xs text-[var(--brand-muted)]">Przychody rozpoznane</p>
              <p className="mt-2 text-lg font-semibold text-[#383433]">{currency.format(selectedContract.revenueRecognizedNet)}</p>
            </article>
            <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
              <p className="text-xs text-[var(--brand-muted)]">Koszt całkowity</p>
              <p className="mt-2 text-lg font-semibold text-[#383433]">{currency.format(selectedContractStats.totalCost)}</p>
            </article>
            <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
              <p className="text-xs text-[var(--brand-muted)]">Zapas marży</p>
              <p className="mt-2 text-lg font-semibold text-[#383433]">{currency.format(selectedContractStats.marginReserve)}</p>
            </article>
            <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4">
              <p className="text-xs text-[var(--brand-muted)]">Marża zarządcza</p>
              <p className="mt-2 text-lg font-semibold text-[#383433]">{(selectedContractStats.managerialMargin * 100).toFixed(1)}%</p>
            </article>
          </div>

          <div className="mt-5 grid items-start gap-4 xl:grid-cols-[1.45fr_0.75fr]">
            <div className="grid gap-4">
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-4">
                  <h3 className="text-base font-semibold text-[#383433]">Struktura kosztu kontraktu</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Magazyny wirtualne</span><span className="font-semibold text-[#383433]">{currency.format(selectedContract.costBreakdown.warehouseDirectNet)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Koszty ludzi</span><span className="font-semibold text-[#383433]">{currency.format(selectedContract.costBreakdown.laborNet)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Koszty produkcji</span><span className="font-semibold text-[#383433]">{currency.format(selectedContract.costBreakdown.productionNet)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Ekipy, flota, narzędzia</span><span className="font-semibold text-[#383433]">{currency.format(selectedContract.costBreakdown.crewFleetToolsNet)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Prowizje handlowe</span><span className="font-semibold text-[#383433]">{currency.format(selectedContract.costBreakdown.salesCommissionNet)}</span></div>
                  </div>
                </article>

                <article className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-4">
                  <h3 className="text-base font-semibold text-[#383433]">Drilldown / audit trail</h3>
                  <div className="mt-3 max-h-[340px] space-y-3 overflow-auto pr-1">
                    {selectedContract.auditTrail.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-[rgb(107_107_107_/_12%)] bg-white px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[#383433]">{entry.source}</p>
                          <span className="text-xs text-[var(--brand-muted)]">{entry.recordedAt}</span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--brand-muted)]">{entry.description}</p>
                        <p className="mt-2 text-sm font-semibold text-[#383433]">{currency.format(entry.amountNet)}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              {activeTrend ? (
                <article className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-[#383433]">
                      {trendGranularity === "month"
                        ? `Trend m/m (${monthLabel(selectedContractMonthlyTrend?.currentMonth ?? "")})`
                        : `Trend q/q (${quarterLabel(selectedContractQuarterlyTrend?.currentQuarter ?? "")})`}
                    </h3>
                    <div className="flex items-center gap-1 rounded-lg bg-[#faf8f6] p-1">
                      <button
                        type="button"
                        onClick={() => setTrendGranularity("month")}
                        className={`rounded px-2 py-1 text-[11px] font-semibold ${trendGranularity === "month" ? "bg-white text-[#383433] shadow-sm" : "text-[var(--brand-muted)]"}`}
                      >
                        Miesiąc
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrendGranularity("quarter")}
                        className={`rounded px-2 py-1 text-[11px] font-semibold ${trendGranularity === "quarter" ? "bg-white text-[#383433] shadow-sm" : "text-[var(--brand-muted)]"}`}
                      >
                        Kwartał
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-2 text-sm text-[#383433]">
                      <div className="flex items-center justify-between gap-3">
                        <span>{trendGranularity === "month" ? "Przychód miesiąca" : "Przychód kwartału"}</span>
                        <span className="font-semibold">{currency.format(activeTrend.current.revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>{trendGranularity === "month" ? "Koszt miesiąca" : "Koszt kwartału"}</span>
                        <span className="font-semibold">{currency.format(activeTrend.current.cost)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>{trendGranularity === "month" ? "Wynik miesiąca" : "Wynik kwartału"}</span>
                        <span className="font-semibold">{currency.format(activeTrend.current.margin)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Zapas marży (kumulacja)</span>
                        <span className="font-semibold">{currency.format(activeTrend.current.reserve)}</span>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-[rgb(107_107_107_/_10%)] bg-[#fffaf5] px-2 py-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--brand-muted)]">Trend wyniku</p>
                        <svg viewBox="0 0 220 56" className="h-14 w-full" role="img" aria-label="Sparkline trendu wyniku">
                          {activeTrend.history.length > 1 ? (
                            <polyline fill="none" stroke="#3d8bfd" strokeWidth="2" points={activeTrendSparkline.marginPoints} />
                          ) : (
                            <circle cx="110" cy="28" r="3" fill="#3d8bfd" />
                          )}
                        </svg>
                      </div>
                      <div className="rounded-lg border border-[rgb(107_107_107_/_10%)] bg-[#fffaf5] px-2 py-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--brand-muted)]">Trend zapasu marży</p>
                        <svg viewBox="0 0 220 56" className="h-14 w-full" role="img" aria-label="Sparkline trendu zapasu marży">
                          {activeTrend.history.length > 1 ? (
                            <polyline fill="none" stroke="#4cb24f" strokeWidth="2" points={activeTrendSparkline.reservePoints} />
                          ) : (
                            <circle cx="110" cy="28" r="3" fill="#4cb24f" />
                          )}
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-[#faf8f6] px-3 py-2 text-xs text-[var(--brand-muted)]">
                    {trendGranularity === "month"
                      ? selectedContractMonthlyTrend?.previousMonth
                        ? `vs ${monthLabel(selectedContractMonthlyTrend.previousMonth)}: przychód ${formatDelta(selectedContractMonthlyTrend.deltas.revenue)}, koszt ${formatDelta(selectedContractMonthlyTrend.deltas.cost)}, wynik ${formatDelta(selectedContractMonthlyTrend.deltas.margin)}, zapas ${formatDelta(selectedContractMonthlyTrend.deltas.reserve)}`
                        : "Brak poprzedniego miesiąca do porównania m/m."
                      : selectedContractQuarterlyTrend?.previousQuarter
                        ? `vs ${quarterLabel(selectedContractQuarterlyTrend.previousQuarter)}: przychód ${formatDelta(selectedContractQuarterlyTrend.deltas.revenue)}, koszt ${formatDelta(selectedContractQuarterlyTrend.deltas.cost)}, wynik ${formatDelta(selectedContractQuarterlyTrend.deltas.margin)}, zapas ${formatDelta(selectedContractQuarterlyTrend.deltas.reserve)}`
                        : "Brak poprzedniego kwartału do porównania q/q."}
                  </div>
                </article>
              ) : null}
            </div>

            {selectedContractProperties ? (
              <aside className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-4">
                <h3 className="text-base font-semibold text-[#383433]">Właściwości i podsumowanie</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Kontrakt</span><span className="font-semibold text-[#383433]">{selectedContract.number}</span></div>
                  <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Klient</span><span className="font-semibold text-[#383433]">{selectedContract.clientName}</span></div>
                  <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Miasto</span><span className="font-semibold text-[#383433]">{selectedContract.city}</span></div>
                  <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Status</span><span className="font-semibold text-[#383433]">{contractStatusLabel[selectedContract.status]}</span></div>
                  <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Priorytet</span><span className="font-semibold text-[#383433]">{selectedContract.priority}</span></div>
                  <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Czas trwania</span><span className="font-semibold text-[#383433]">{selectedContractProperties.durationDays} dni</span></div>
                  <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Rozpoznany przychód</span><span className="font-semibold text-[#383433]">{selectedContractProperties.realizedShare.toFixed(1)}%</span></div>
                  <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Pokrycie kosztami</span><span className="font-semibold text-[#383433]">{selectedContractProperties.costShare.toFixed(1)}%</span></div>
                </div>

                <div className="mt-4 rounded-xl border border-[rgb(107_107_107_/_12%)] bg-white px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Podsumowanie biznesowe</p>
                  <ul className="mt-2 space-y-1 text-sm text-[#383433]">
                    <li>• Pozostała wartość do rozpoznania: {currency.format(selectedContractProperties.remainingValue)}.</li>
                    <li>• Zapas marży: {currency.format(selectedContractStats.marginReserve)}.</li>
                    <li>• Marża zarządcza: {(selectedContractStats.managerialMargin * 100).toFixed(1)}%.</li>
                  </ul>
                </div>
              </aside>
            ) : null}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
