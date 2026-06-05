import { readFile } from "node:fs/promises";
import type { ZodType } from "zod";

export class MockDataValidationError extends Error {
  readonly filePath: string;

  constructor(filePath: string, message: string) {
    super(message);
    this.name = "MockDataValidationError";
    this.filePath = filePath;
  }
}

export async function readJsonFileWithSchema<T>(filePath: string, schema: ZodType<T>): Promise<T> {
  let raw: string;

  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      throw new MockDataValidationError(filePath, `Mock data file not found: ${filePath}`);
    }

    throw new MockDataValidationError(filePath, `Cannot read mock data file: ${filePath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new MockDataValidationError(filePath, `Invalid JSON format in ${filePath}`);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");

    throw new MockDataValidationError(filePath, `Mock data schema validation failed for ${filePath}. ${issues}`);
  }

  return result.data;
}
