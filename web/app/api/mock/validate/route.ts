import { validateRequiredMockDataFiles } from "@/lib/mock-required-data-validation";

export async function GET() {
  const results = await validateRequiredMockDataFiles();
  const failed = results.filter((result) => !result.ok);

  return Response.json(
    {
      ok: failed.length === 0,
      total: results.length,
      failed: failed.length,
      results,
    },
    { status: failed.length === 0 ? 200 : 500 },
  );
}
