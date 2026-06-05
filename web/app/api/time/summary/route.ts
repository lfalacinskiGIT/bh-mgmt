import { NextRequest } from "next/server";
import { normalizeMockDataset } from "@/lib/mock-dataset";
import { getAvailableTimeMonths, getTimeTrackingSummary } from "@/lib/mock-time-tracking";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const dataset = normalizeMockDataset(params.get("dataset"));
  const month = params.get("month")?.trim() ?? "";

  const availableMonths = getAvailableTimeMonths(dataset);
  const selectedMonth = month || availableMonths[0] || "";

  const summary = getTimeTrackingSummary(dataset, selectedMonth);

  return Response.json({
    availableMonths,
    summary,
  });
}
