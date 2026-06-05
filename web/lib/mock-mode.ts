export function isMockMode(): boolean {
  const raw = process.env.MOCK_MODE;

  if (!raw) {
    return true;
  }

  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}
