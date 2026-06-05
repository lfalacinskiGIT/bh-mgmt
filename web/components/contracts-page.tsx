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
import type { MockInvoice } from "@/lib/mock-invoices-store";

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

const contractCardAccentClass: Record<ContractStatus, string> = {
  nowy: "border-l-slate-400",
  negocjacje: "border-l-amber-400",
  podpisany: "border-l-emerald-500",
  realizacja: "border-l-sky-500",
  zakończony: "border-l-rose-400",
};

function getLineOfBusinessBadgeClass(lineOfBusiness: string): string {
  const normalized = lineOfBusiness.toLowerCase();

  if (normalized.includes("box")) {
    return "bg-sky-100 text-sky-800";
  }

  if (normalized.includes("erdol")) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-violet-100 text-violet-800";
}

const invoiceFlowLabel = {
  revenue: "Przychodowa",
  cost: "Kosztowa",
} as const;

const invoiceStatusLabel: Record<MockInvoice["status"], string> = {
  issued: "Wystawiona",
  paid: "Opłacona",
  overdue: "Przeterminowana",
};

function renderQuickTileIcon(icon: "briefcase" | "wallet" | "shield" | "pen") {
  if (icon === "briefcase") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="3" y="7" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (icon === "wallet") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M4 7h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16.5" cy="13" r="1.2" fill="currentColor" />
      </svg>
    );
  }

  if (icon === "shield") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M12 3l7 3v5c0 5-3.2 8.3-7 10-3.8-1.7-7-5-7-10V6l7-3Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M4 20h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m7 16 7-7 3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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

interface TrendChartPoint {
  x: number;
  y: number;
  value: number;
}

interface TrendChartModel {
  linePoints: string;
  areaPoints: string;
  points: TrendChartPoint[];
  ticks: Array<{ y: number; value: number }>;
}

function formatAxisCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)} mln`;
  }

  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)} tys.`;
  }

  return `${sign}${abs.toFixed(0)}`;
}

function buildTrendChart(values: number[]): TrendChartModel {
  const width = 320;
  const height = 120;
  const paddingX = 28;
  const paddingY = 14;

  if (values.length === 0) {
    return {
      linePoints: "",
      areaPoints: "",
      points: [],
      ticks: [],
    };
  }

  const minRaw = Math.min(...values);
  const maxRaw = Math.max(...values);
  const paddingValue = Math.max(Math.abs(maxRaw - minRaw) * 0.2, Math.abs(maxRaw || 1) * 0.08, 1);
  const min = minRaw - paddingValue;
  const max = maxRaw + paddingValue;
  const range = max - min || 1;

  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  const toY = (value: number) => paddingY + ((max - value) / range) * plotHeight;

  const points = values.map((value, index) => {
    const x = values.length > 1 ? paddingX + (index * plotWidth) / (values.length - 1) : width / 2;
    const y = toY(value);

    return {
      x,
      y,
      value,
    };
  });

  const linePoints = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");

  const areaPoints =
    points.length > 0
      ? `${points[0].x.toFixed(2)},${(height - paddingY).toFixed(2)} ${linePoints} ${points.at(-1)?.x.toFixed(2)},${(height - paddingY).toFixed(2)}`
      : "";

  const tickValues = [max, (max + min) / 2, min];
  const ticks = tickValues.map((value) => ({
    y: toY(value),
    value,
  }));

  return {
    linePoints,
    areaPoints,
    points,
    ticks,
  };
}

function buildXAxisLabels(
  keys: string[],
  granularity: "month" | "quarter",
): { start: string; middle: string; end: string } {
  if (keys.length === 0) {
    return { start: "", middle: "", end: "" };
  }

  const formatKey = (key: string) => (granularity === "month" ? monthLabel(key) : quarterLabel(key));
  const first = keys[0];
  const middle = keys[Math.floor((keys.length - 1) / 2)];
  const last = keys.at(-1) ?? keys[0];

  return {
    start: formatKey(first),
    middle: formatKey(middle),
    end: formatKey(last),
  };
}

export function ContractsPage() {
  const searchParams = useSearchParams();
  const queryLineOfBusiness = searchParams.get("lineOfBusiness")?.trim() ?? "all";
  const queryContractId = searchParams.get("contractId")?.trim() ?? "";
  const queryDataset = normalizeMockDataset(searchParams.get("dataset")?.trim());
  const isDatasetInitializedRef = useRef(queryDataset !== "baseline");

  const [dataset, setDataset] = useState<MockDatasetName>(queryDataset !== "baseline" ? queryDataset : "baseline");
  const [search, setSearch] = useState("");
  const [trendGranularity, setTrendGranularity] = useState<"month" | "quarter">("month");
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [panelMode, setPanelMode] = useState<"compact" | "expanded">("compact");
  const [panelTab, setPanelTab] = useState<"overview" | "finance" | "documents" | "timeline">("overview");
  const [invoices, setInvoices] = useState<MockInvoice[]>([]);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
  const [invoiceActionId, setInvoiceActionId] = useState<string | null>(null);
  const [invoiceActionError, setInvoiceActionError] = useState<string | null>(null);
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
    if (queryDataset !== "baseline") {
      isDatasetInitializedRef.current = true;
      return;
    }

    setDataset(readMockDatasetFromStorage());
    isDatasetInitializedRef.current = true;
  }, [queryDataset]);

  useEffect(() => {
    if (!isDatasetInitializedRef.current) {
      return;
    }

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
  const selectedContract = filteredContracts.find((contract) => contract.id === selectedContractId) ?? filteredContracts[0] ?? null;
  const isDrilldownContract = !!queryContractId && selectedContract?.id === queryContractId;

  useEffect(() => {
    if (isDrilldownContract) {
      setShowSidePanel(true);
    }
  }, [isDrilldownContract]);

  useEffect(() => {
    if (!showSidePanel || invoices.length > 0) {
      return;
    }

    let isMounted = true;

    const loadInvoices = async () => {
      try {
        setIsInvoicesLoading(true);
        const response = await fetch("/api/finance/invoices?pageSize=500");
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { items?: MockInvoice[] };
        if (isMounted) {
          setInvoices(payload.items ?? []);
        }
      } finally {
        if (isMounted) {
          setIsInvoicesLoading(false);
        }
      }
    };

    void loadInvoices();

    return () => {
      isMounted = false;
    };
  }, [invoices.length, showSidePanel]);

  function handleSelectContract(contractId: string) {
    setSelectedContractId(contractId);
    setShowSidePanel(true);
  }

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
  const activeTrendCharts = useMemo(() => {
    if (!activeTrend) {
      return {
        margin: buildTrendChart([]),
        reserve: buildTrendChart([]),
      };
    }

    const marginSeries = activeTrend.history.map((item) => item.margin);
    const reserveSeries = activeTrend.history.map((item) => item.reserve);

    return {
      margin: buildTrendChart(marginSeries),
      reserve: buildTrendChart(reserveSeries),
    };
  }, [activeTrend]);

  const activeTrendXAxisLabels = useMemo(() => {
    if (!activeTrend) {
      return { start: "", middle: "", end: "" };
    }

    const keys = activeTrend.history.map((item) => item.key);
    return buildXAxisLabels(keys, trendGranularity);
  }, [activeTrend, trendGranularity]);

  const contractInvoices = useMemo(() => {
    if (!selectedContract) {
      return [];
    }

    return invoices.filter((invoice) => invoice.contractId === selectedContract.id);
  }, [invoices, selectedContract]);

  const unlinkedInvoices = useMemo(() => invoices.filter((invoice) => !invoice.contractId), [invoices]);

  const monthlyFinanceRows = useMemo(() => {
    if (!selectedContractMonthlyTrend) {
      return [];
    }

    return selectedContractMonthlyTrend.history.slice(-6);
  }, [selectedContractMonthlyTrend]);

  const contractInvoicesSummary = useMemo(() => {
    const revenueGross = contractInvoices.filter((invoice) => invoice.flowType === "revenue").reduce((sum, invoice) => sum + invoice.grossAmount, 0);
    const costGross = contractInvoices.filter((invoice) => invoice.flowType === "cost").reduce((sum, invoice) => sum + invoice.grossAmount, 0);
    const overdue = contractInvoices.filter((invoice) => invoice.status === "overdue").length;

    return {
      count: contractInvoices.length,
      revenueGross,
      costGross,
      overdue,
    };
  }, [contractInvoices]);

  async function updateInvoiceContractLink(invoiceId: string, contractId: string | null) {
    try {
      setInvoiceActionError(null);
      setInvoiceActionId(invoiceId);

      const response = await fetch("/api/finance/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoiceId, contractId }),
      });

      if (!response.ok) {
        throw new Error("Invoice update failed");
      }

      const payload = (await response.json()) as { item?: MockInvoice };

      if (!payload.item) {
        return;
      }

      setInvoices((current) => current.map((invoice) => (invoice.id === payload.item?.id ? payload.item : invoice)));
    } catch {
      setInvoiceActionError("Nie udało się zaktualizować powiązania faktury.");
    } finally {
      setInvoiceActionId(null);
    }
  }

  const quickTiles = [
    {
      title: "Aktywne kontrakty",
      value: totals.active,
      accentClass: "border-l-[#f28b25]",
      icon: "briefcase" as const,
      iconClass: "bg-amber-100 text-amber-700",
    },
    {
      title: "Wartość portfela",
      value: currency.format(totals.valueNet),
      accentClass: "border-l-[#e0ad3b]",
      icon: "wallet" as const,
      iconClass: "bg-sky-100 text-sky-700",
    },
    {
      title: "Zapas marży",
      value: currency.format(totals.marginReserve),
      accentClass: "border-l-[#4cb24f]",
      icon: "shield" as const,
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Do podpisu",
      value: totals.negotiation,
      accentClass: "border-l-[#db1832]",
      icon: "pen" as const,
      iconClass: "bg-rose-100 text-rose-700",
    },
  ];

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
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tile.iconClass}`}>
                {renderQuickTileIcon(tile.icon)}
              </span>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] md:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-[#383433]">Widok kontraktów</h2>
            <p className="text-sm text-[var(--brand-muted)]">Przełącznik listy i kafli z filtrowaniem</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start rounded-xl bg-[#fbfaf8] p-1 shadow-sm">
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
              Kafle
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-lg px-3 py-2 text-sm shadow-sm transition ${viewMode === "list" ? "bg-white font-semibold text-[var(--brand-primary)]" : "text-[var(--brand-muted)]"}`}
            >
              Lista
            </button>
            <button
              type="button"
              onClick={() => setShowSidePanel((current) => !current)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--brand-primary)]"
            >
              {showSidePanel ? "Ukryj kartę" : "Pokaż kartę"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-[#faf8f6] p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as "none" | "status" | "city" | "lineOfBusiness")}
              aria-label="Grupuj kontrakty"
              className="h-10 rounded-lg border border-[rgb(107_107_107_/_16%)] bg-white px-3 text-sm text-[#383433]"
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
              className="h-10 rounded-lg border border-[rgb(107_107_107_/_16%)] bg-white px-3 text-sm text-[#383433]"
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
              className="h-10 rounded-lg border border-[rgb(107_107_107_/_16%)] bg-white px-3 text-sm font-semibold text-[#383433] shadow-sm"
            >
              {sortDirection === "asc" ? "Rosnąco" : "Malejąco"}
            </button>
          </div>

          <div className="mt-4">
            {viewMode === "cards" ? (
              sortedContracts.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {sortedContracts.map((contract) => {
                    const isSelected = selectedContract?.id === contract.id;
                    const totalCost = getContractTotalCost(contract);
                    const lineBadgeClass = getLineOfBusinessBadgeClass(contract.lineOfBusiness);

                    return (
                      <button
                        key={contract.id}
                        type="button"
                        onClick={() => handleSelectContract(contract.id)}
                        className={`rounded-2xl border border-l-4 p-4 text-left shadow-sm transition hover:shadow-md ${contractCardAccentClass[contract.status]} ${
                          isSelected
                            ? "border-[var(--brand-primary)] bg-[#fff5eb] ring-1 ring-[rgb(228_101_14_/_28%)]"
                            : "border-[rgb(107_107_107_/_14%)] bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusDotClass[contract.priority]}`} />
                            <p className="text-sm font-semibold text-[#383433]">{contract.number}</p>
                          </div>
                          <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${contractStatusClass[contract.status]}`}>
                            {contractStatusLabel[contract.status]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[#383433]">{contract.clientName}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-[var(--brand-muted)]">
                          <span>{contract.city}</span>
                          <span>•</span>
                          <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${lineBadgeClass}`}>{contract.lineOfBusiness}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-[#faf8f6] px-2 py-1.5">
                            <p className="text-[var(--brand-muted)]">Wartość</p>
                            <p className="mt-0.5 font-semibold text-[#383433]">{currency.format(contract.valueContractNet)}</p>
                          </div>
                          <div className="rounded-lg bg-[#faf8f6] px-2 py-1.5">
                            <p className="text-[var(--brand-muted)]">Koszt</p>
                            <p className="mt-0.5 font-semibold text-[#383433]">{currency.format(totalCost)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[rgb(107_107_107_/_20%)] bg-white p-6 text-sm text-[var(--brand-muted)]">
                  Brak kontraktów dla wybranych filtrów.
                </div>
              )
            ) : groupedContracts.length > 0 ? (
              <div className="space-y-4">
                {groupedContracts.map((group) => (
                  <section key={group.key} className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-white p-3 md:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-[#383433]">{group.label}</h3>
                        <p className="text-xs text-[var(--brand-muted)]">{group.contracts.length} kontrakt{group.contracts.length === 1 ? "" : group.contracts.length < 5 ? "y" : "ów"}</p>
                      </div>
                      <span className="rounded-full bg-[#faf8f6] px-3 py-1 text-xs font-semibold text-[#383433] shadow-sm">
                        {currency.format(group.contracts.reduce((sum, contract) => sum + contract.valueContractNet, 0))}
                      </span>
                    </div>

                    <div className="mt-3 overflow-x-auto rounded-xl border border-[rgb(107_107_107_/_10%)] bg-white shadow-sm">
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
                                onClick={() => handleSelectContract(contract.id)}
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
            ) : (
              <div className="rounded-xl border border-dashed border-[rgb(107_107_107_/_20%)] bg-white p-6 text-sm text-[var(--brand-muted)]">
                Brak kontraktów dla wybranych filtrów.
              </div>
            )}
          </div>
        </div>
        <div className={`fixed inset-0 z-30 transition-opacity duration-300 ease-out ${showSidePanel ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
          <button
            type="button"
            aria-label="Zamknij panel karty kontraktu"
            className={`absolute inset-0 bg-[#201b17]/35 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${showSidePanel ? "opacity-100" : "opacity-0"}`}
            onClick={() => setShowSidePanel(false)}
          />
          <aside
            className={`absolute right-0 top-0 h-full w-full overflow-y-auto border-l border-[rgb(107_107_107_/_14%)] bg-[#fffaf5] p-4 shadow-2xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform transform-gpu md:p-6 ${panelMode === "expanded" ? "max-w-[960px]" : "max-w-[420px]"} ${
              showSidePanel ? "translate-x-0 scale-100 opacity-100" : "translate-x-full scale-[0.98] opacity-0"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#383433]">Karta kontraktu</h3>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">Podgląd 360 wybranego kontraktu</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPanelMode((current) => (current === "compact" ? "expanded" : "compact"))}
                  className="rounded-lg border border-[rgb(107_107_107_/_18%)] bg-white px-3 py-2 text-xs font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]"
                >
                  {panelMode === "compact" ? "Rozszerz" : "Zwiń"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSidePanel(false)}
                  className="rounded-lg border border-[rgb(107_107_107_/_18%)] bg-white px-3 py-2 text-xs font-semibold text-[#383433] shadow-sm transition hover:bg-[#fff7ef]"
                >
                  Ukryj
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#fbfaf8] p-1">
              <button
                type="button"
                onClick={() => setPanelTab("overview")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${panelTab === "overview" ? "bg-white text-[#383433] shadow-sm" : "text-[var(--brand-muted)]"}`}
              >
                Przegląd
              </button>
              <button
                type="button"
                onClick={() => setPanelTab("finance")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${panelTab === "finance" ? "bg-white text-[#383433] shadow-sm" : "text-[var(--brand-muted)]"}`}
              >
                Finanse
              </button>
              <button
                type="button"
                onClick={() => setPanelTab("documents")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${panelTab === "documents" ? "bg-white text-[#383433] shadow-sm" : "text-[var(--brand-muted)]"}`}
              >
                Dokumenty
              </button>
              <button
                type="button"
                onClick={() => setPanelTab("timeline")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${panelTab === "timeline" ? "bg-white text-[#383433] shadow-sm" : "text-[var(--brand-muted)]"}`}
              >
                Oś czasu
              </button>
            </div>

            {selectedContract && selectedContractStats ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[#383433]">{selectedContract.number}</p>
                  <p className="mt-1 text-xs text-[var(--brand-muted)]">{selectedContract.objectName}</p>
                  <p className="mt-2 inline-block rounded-full bg-[#fff4ea] px-3 py-1 text-xs font-semibold text-[#8e4a14]">
                    Linia biznesowa: {selectedContract.lineOfBusiness}
                  </p>
                </div>

                {isDrilldownContract ? (
                  <div className="rounded-xl bg-[rgb(228_101_14_/_10%)] px-3 py-2 text-xs font-semibold text-[#8e4a14]">
                    Widok ustawiony z drilldown raportowego dla wybranego kontraktu.
                  </div>
                ) : null}

                {panelTab === "overview" ? (
                  <>
                    <div className={`grid gap-3 ${panelMode === "expanded" ? "md:grid-cols-2" : "grid-cols-1"}`}>
                      <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-3">
                        <p className="text-xs text-[var(--brand-muted)]">Wartość umowna</p>
                        <p className="mt-1 text-base font-semibold text-[#383433]">{currency.format(selectedContract.valueContractNet)}</p>
                      </article>
                      <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-3">
                        <p className="text-xs text-[var(--brand-muted)]">Przychody rozpoznane</p>
                        <p className="mt-1 text-base font-semibold text-[#383433]">{currency.format(selectedContract.revenueRecognizedNet)}</p>
                      </article>
                      <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-3">
                        <p className="text-xs text-[var(--brand-muted)]">Koszt całkowity</p>
                        <p className="mt-1 text-base font-semibold text-[#383433]">{currency.format(selectedContractStats.totalCost)}</p>
                      </article>
                      <article className="rounded-xl border border-[rgb(107_107_107_/_14%)] bg-white p-3">
                        <p className="text-xs text-[var(--brand-muted)]">Zapas marży</p>
                        <p className="mt-1 text-base font-semibold text-[#383433]">{currency.format(selectedContractStats.marginReserve)}</p>
                      </article>
                    </div>

                    {selectedContractProperties ? (
                      <article className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-white p-4">
                        <h4 className="text-sm font-semibold text-[#383433]">Wskaźniki realizacji</h4>
                        <div className="mt-3 space-y-3">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-[var(--brand-muted)]">Rozpoznanie przychodu</span>
                              <span className="font-semibold text-[#383433]">{selectedContractProperties.realizedShare.toFixed(1)}%</span>
                            </div>
                            <progress
                              className="h-2 w-full overflow-hidden rounded-full [appearance:none] [&::-webkit-progress-bar]:bg-[#f3eee8] [&::-webkit-progress-value]:bg-[var(--brand-primary)] [&::-moz-progress-bar]:bg-[var(--brand-primary)]"
                              max={100}
                              value={Math.max(0, Math.min(100, selectedContractProperties.realizedShare))}
                            />
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-[var(--brand-muted)]">Pokrycie kosztami</span>
                              <span className="font-semibold text-[#383433]">{selectedContractProperties.costShare.toFixed(1)}%</span>
                            </div>
                            <progress
                              className="h-2 w-full overflow-hidden rounded-full [appearance:none] [&::-webkit-progress-bar]:bg-[#f3eee8] [&::-webkit-progress-value]:bg-[#3d8bfd] [&::-moz-progress-bar]:bg-[#3d8bfd]"
                              max={100}
                              value={Math.max(0, Math.min(100, selectedContractProperties.costShare))}
                            />
                          </div>
                        </div>
                      </article>
                    ) : null}
                  </>
                ) : null}

                {panelTab === "finance" && activeTrend ? (
                  <article className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-[#383433]">Trend kontraktu</h4>
                      <div className="flex items-center gap-1 rounded-lg bg-[#faf8f6] p-1">
                        <button
                          type="button"
                          onClick={() => setTrendGranularity("month")}
                          className={`rounded px-2 py-1 text-[11px] font-semibold ${trendGranularity === "month" ? "bg-white text-[#383433] shadow-sm" : "text-[var(--brand-muted)]"}`}
                        >
                          M
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrendGranularity("quarter")}
                          className={`rounded px-2 py-1 text-[11px] font-semibold ${trendGranularity === "quarter" ? "bg-white text-[#383433] shadow-sm" : "text-[var(--brand-muted)]"}`}
                        >
                          Q
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <div className="rounded-lg border border-[rgb(107_107_107_/_10%)] bg-[#fffaf5] px-2 py-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--brand-muted)]">Trend wyniku</p>
                        <svg viewBox="0 0 320 120" className="h-32 w-full" role="img" aria-label="Wykres trendu wyniku z osią i skalą">
                          {activeTrendCharts.margin.ticks.map((tick) => (
                            <g key={`margin-tick-${tick.y.toFixed(2)}`}>
                              <line x1="28" y1={tick.y} x2="292" y2={tick.y} stroke="rgb(107 107 107 / 18%)" strokeDasharray="3 3" />
                              <text x="2" y={tick.y + 3} className="fill-[var(--brand-muted)] text-[10px]">
                                {formatAxisCurrency(tick.value)}
                              </text>
                            </g>
                          ))}

                          {activeTrendCharts.margin.areaPoints ? (
                            <polygon points={activeTrendCharts.margin.areaPoints} fill="rgb(61 139 253 / 12%)" />
                          ) : null}

                          {activeTrendCharts.margin.linePoints ? (
                            <polyline
                              fill="none"
                              stroke="#3d8bfd"
                              strokeWidth="2.25"
                              points={activeTrendCharts.margin.linePoints}
                              className="finance-line-anim"
                            />
                          ) : null}

                          {activeTrendCharts.margin.points.map((point) => (
                            <circle
                              key={`margin-point-${point.x.toFixed(2)}-${point.y.toFixed(2)}`}
                              cx={point.x}
                              cy={point.y}
                              r="2.8"
                              fill="#3d8bfd"
                              className="finance-point-anim"
                            />
                          ))}
                        </svg>
                        <div className="mt-1 grid grid-cols-3 text-[10px] text-[var(--brand-muted)]">
                          <span>{activeTrendXAxisLabels.start}</span>
                          <span className="text-center">{activeTrendXAxisLabels.middle}</span>
                          <span className="text-right">{activeTrendXAxisLabels.end}</span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-[rgb(107_107_107_/_10%)] bg-[#fffaf5] px-2 py-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--brand-muted)]">Trend zapasu marży</p>
                        <svg viewBox="0 0 320 120" className="h-32 w-full" role="img" aria-label="Wykres trendu zapasu marży z osią i skalą">
                          {activeTrendCharts.reserve.ticks.map((tick) => (
                            <g key={`reserve-tick-${tick.y.toFixed(2)}`}>
                              <line x1="28" y1={tick.y} x2="292" y2={tick.y} stroke="rgb(107 107 107 / 18%)" strokeDasharray="3 3" />
                              <text x="2" y={tick.y + 3} className="fill-[var(--brand-muted)] text-[10px]">
                                {formatAxisCurrency(tick.value)}
                              </text>
                            </g>
                          ))}

                          {activeTrendCharts.reserve.areaPoints ? (
                            <polygon points={activeTrendCharts.reserve.areaPoints} fill="rgb(76 178 79 / 12%)" />
                          ) : null}

                          {activeTrendCharts.reserve.linePoints ? (
                            <polyline
                              fill="none"
                              stroke="#4cb24f"
                              strokeWidth="2.25"
                              points={activeTrendCharts.reserve.linePoints}
                              className="finance-line-anim"
                            />
                          ) : null}

                          {activeTrendCharts.reserve.points.map((point) => (
                            <circle
                              key={`reserve-point-${point.x.toFixed(2)}-${point.y.toFixed(2)}`}
                              cx={point.x}
                              cy={point.y}
                              r="2.8"
                              fill="#4cb24f"
                              className="finance-point-anim"
                            />
                          ))}
                        </svg>
                        <div className="mt-1 grid grid-cols-3 text-[10px] text-[var(--brand-muted)]">
                          <span>{activeTrendXAxisLabels.start}</span>
                          <span className="text-center">{activeTrendXAxisLabels.middle}</span>
                          <span className="text-right">{activeTrendXAxisLabels.end}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-[#faf8f6] px-2 py-2">
                        <p className="text-[var(--brand-muted)]">Wynik</p>
                        <p className="mt-1 font-semibold text-[#383433]">{currency.format(activeTrend.current.margin)}</p>
                      </div>
                      <div className="rounded-lg bg-[#faf8f6] px-2 py-2">
                        <p className="text-[var(--brand-muted)]">Zapas marży</p>
                        <p className="mt-1 font-semibold text-[#383433]">{currency.format(activeTrend.current.reserve)}</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg bg-[#faf8f6] px-3 py-2 text-xs text-[var(--brand-muted)]">
                      {trendGranularity === "month"
                        ? selectedContractMonthlyTrend?.previousMonth
                          ? `vs ${monthLabel(selectedContractMonthlyTrend.previousMonth)}: przychód ${formatDelta(selectedContractMonthlyTrend.deltas.revenue)}, koszt ${formatDelta(selectedContractMonthlyTrend.deltas.cost)}, wynik ${formatDelta(selectedContractMonthlyTrend.deltas.margin)}`
                          : "Brak poprzedniego miesiąca do porównania m/m."
                        : selectedContractQuarterlyTrend?.previousQuarter
                          ? `vs ${quarterLabel(selectedContractQuarterlyTrend.previousQuarter)}: przychód ${formatDelta(selectedContractQuarterlyTrend.deltas.revenue)}, koszt ${formatDelta(selectedContractQuarterlyTrend.deltas.cost)}, wynik ${formatDelta(selectedContractQuarterlyTrend.deltas.margin)}`
                          : "Brak poprzedniego kwartału do porównania q/q."}
                    </div>

                    <div className="mt-4 rounded-xl border border-[rgb(107_107_107_/_12%)] bg-[#fffaf5] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">Mini-macierz m/m</h5>
                        <span className="text-[11px] text-[var(--brand-muted)]">Przychody vs koszty (ostatnie 6 mies.)</span>
                      </div>
                      <div className="mt-2 overflow-x-auto rounded-lg border border-[rgb(107_107_107_/_10%)] bg-white">
                        <table className="min-w-full text-xs">
                          <thead className="bg-[#f7f4ef] text-left uppercase tracking-[0.08em] text-[var(--brand-muted)]">
                            <tr>
                              <th className="px-2 py-2">Miesiąc</th>
                              <th className="px-2 py-2">Przychody</th>
                              <th className="px-2 py-2">Koszty</th>
                              <th className="px-2 py-2">Saldo</th>
                              <th className="px-2 py-2">Koszt/Przychód</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthlyFinanceRows.length > 0 ? (
                              monthlyFinanceRows.map((item) => {
                                const costToRevenue = item.revenue > 0 ? (item.cost / item.revenue) * 100 : 0;
                                const balanceClass = item.margin >= 0 ? "text-emerald-700" : "text-rose-700";

                                return (
                                  <tr key={item.key} className="border-t border-[rgb(107_107_107_/_10%)]">
                                    <td className="px-2 py-2 font-semibold text-[#383433]">{monthLabel(item.key)}</td>
                                    <td className="px-2 py-2 text-[#383433]">{currency.format(item.revenue)}</td>
                                    <td className="px-2 py-2 text-[#383433]">{currency.format(item.cost)}</td>
                                    <td className={`px-2 py-2 font-semibold ${balanceClass}`}>{currency.format(item.margin)}</td>
                                    <td className="px-2 py-2 text-[#383433]">{costToRevenue.toFixed(1)}%</td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-2 py-3 text-center text-[var(--brand-muted)]">
                                  Brak danych miesięcznych dla kontraktu.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </article>
                ) : null}

                {panelTab === "documents" ? (
                  <article className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-white p-4">
                    <h4 className="text-sm font-semibold text-[#383433]">Powiązane dokumenty</h4>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-[#faf8f6] px-2 py-2">
                        <p className="text-[var(--brand-muted)]">Liczba faktur</p>
                        <p className="mt-1 font-semibold text-[#383433]">{contractInvoicesSummary.count}</p>
                      </div>
                      <div className="rounded-lg bg-[#faf8f6] px-2 py-2">
                        <p className="text-[var(--brand-muted)]">Po terminie</p>
                        <p className="mt-1 font-semibold text-[#383433]">{contractInvoicesSummary.overdue}</p>
                      </div>
                      <div className="rounded-lg bg-[#faf8f6] px-2 py-2">
                        <p className="text-[var(--brand-muted)]">Przychody brutto</p>
                        <p className="mt-1 font-semibold text-[#383433]">{currency.format(contractInvoicesSummary.revenueGross)}</p>
                      </div>
                      <div className="rounded-lg bg-[#faf8f6] px-2 py-2">
                        <p className="text-[var(--brand-muted)]">Koszty brutto</p>
                        <p className="mt-1 font-semibold text-[#383433]">{currency.format(contractInvoicesSummary.costGross)}</p>
                      </div>
                    </div>

                    {invoiceActionError ? (
                      <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        {invoiceActionError}
                      </div>
                    ) : null}

                    <div className="mt-3 max-h-[340px] space-y-2 overflow-auto pr-1">
                      {isInvoicesLoading ? (
                        <p className="text-xs text-[var(--brand-muted)]">Ładowanie dokumentów...</p>
                      ) : contractInvoices.length > 0 ? (
                        contractInvoices.map((invoice) => (
                          <div key={invoice.id} className="rounded-lg border border-[rgb(107_107_107_/_12%)] bg-[#fffaf5] px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-[#383433]">{invoice.number}</p>
                                <p className="text-xs text-[var(--brand-muted)]">{invoice.customerName}</p>
                              </div>
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${invoice.flowType === "revenue" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                {invoiceFlowLabel[invoice.flowType]}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-[#5a524d]">
                              <span>{invoiceStatusLabel[invoice.status]}</span>
                              <span className="font-semibold text-[#383433]">{currency.format(invoice.grossAmount)}</span>
                            </div>
                            <div className="mt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => void updateInvoiceContractLink(invoice.id, null)}
                                disabled={invoiceActionId === invoice.id}
                                className="rounded-lg border border-[rgb(107_107_107_/_16%)] bg-white px-2 py-1 text-[11px] font-semibold text-[#383433] transition hover:bg-[#fff7ef] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {invoiceActionId === invoice.id ? "Zapisywanie..." : "Odepnij"}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[var(--brand-muted)]">Brak dokumentów powiązanych z kontraktem.</p>
                      )}
                    </div>

                    <div className="mt-4 border-t border-[rgb(107_107_107_/_10%)] pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">Szybkie przypinanie</h5>
                        <span className="text-[11px] text-[var(--brand-muted)]">Faktury niepowiązane</span>
                      </div>

                      <div className="mt-2 max-h-[220px] space-y-2 overflow-auto pr-1">
                        {unlinkedInvoices.length > 0 ? (
                          unlinkedInvoices.slice(0, 12).map((invoice) => (
                            <div key={invoice.id} className="rounded-lg border border-[rgb(107_107_107_/_12%)] bg-white px-3 py-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-[#383433]">{invoice.number}</p>
                                  <p className="text-xs text-[var(--brand-muted)]">{invoice.customerName}</p>
                                </div>
                                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${invoice.flowType === "revenue" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                  {invoiceFlowLabel[invoice.flowType]}
                                </span>
                              </div>

                              <div className="mt-2 flex items-center justify-between text-xs text-[#5a524d]">
                                <span>{invoiceStatusLabel[invoice.status]}</span>
                                <span className="font-semibold text-[#383433]">{currency.format(invoice.grossAmount)}</span>
                              </div>

                              <div className="mt-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => selectedContract && void updateInvoiceContractLink(invoice.id, selectedContract.id)}
                                  disabled={invoiceActionId === invoice.id || !selectedContract}
                                  className="rounded-lg border border-[rgb(107_107_107_/_16%)] bg-white px-2 py-1 text-[11px] font-semibold text-[#383433] transition hover:bg-[#fff7ef] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {invoiceActionId === invoice.id ? "Zapisywanie..." : "Przypnij"}
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[var(--brand-muted)]">Brak niepowiązanych faktur do przypięcia.</p>
                        )}
                      </div>
                    </div>
                  </article>
                ) : null}

                {panelTab === "timeline" && selectedContractProperties ? (
                  <aside className="rounded-2xl border border-[rgb(107_107_107_/_14%)] bg-white p-4">
                    <h4 className="text-sm font-semibold text-[#383433]">Właściwości i podsumowanie</h4>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Klient</span><span className="font-semibold text-[#383433]">{selectedContract.clientName}</span></div>
                      <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Miasto</span><span className="font-semibold text-[#383433]">{selectedContract.city}</span></div>
                      <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Status</span><span className="font-semibold text-[#383433]">{contractStatusLabel[selectedContract.status]}</span></div>
                      <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Priorytet</span><span className="font-semibold text-[#383433]">{selectedContract.priority}</span></div>
                      <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Czas trwania</span><span className="font-semibold text-[#383433]">{selectedContractProperties.durationDays} dni</span></div>
                      <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Rozpoznany przychód</span><span className="font-semibold text-[#383433]">{selectedContractProperties.realizedShare.toFixed(1)}%</span></div>
                      <div className="flex items-center justify-between"><span className="text-[var(--brand-muted)]">Pokrycie kosztami</span><span className="font-semibold text-[#383433]">{selectedContractProperties.costShare.toFixed(1)}%</span></div>
                    </div>

                    <div className="mt-4 border-t border-[rgb(107_107_107_/_10%)] pt-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">Audit trail</p>
                      <div className="mt-2 max-h-[280px] space-y-2 overflow-auto pr-1">
                        {selectedContract.auditTrail.map((entry) => (
                          <div key={entry.id} className="rounded-lg border border-[rgb(107_107_107_/_12%)] bg-[#fffaf5] px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-[#383433]">{entry.source}</p>
                              <span className="text-[11px] text-[var(--brand-muted)]">{entry.recordedAt}</span>
                            </div>
                            <p className="mt-1 text-xs text-[var(--brand-muted)]">{entry.description}</p>
                            <p className="mt-1 text-sm font-semibold text-[#383433]">{currency.format(entry.amountNet)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </aside>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[rgb(107_107_107_/_20%)] bg-white p-4 text-sm text-[var(--brand-muted)]">
                Wybierz kontrakt z listy lub kafli, aby zobaczyć szczegóły.
              </div>
            )}
            </aside>
        </div>
      </section>
    </AppShell>
  );
}
