export function parseOptionalNumber(input: unknown): number | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  const value = Number(input);
  return Number.isFinite(value) ? value : null;
}

export function parsePositiveInt(input: unknown, fallback: number, max: number): number {
  const value = Number.parseInt(String(input ?? ''), 10);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.min(value, max);
}

export function parseNonNegativeInt(input: unknown, fallback: number, max: number): number {
  const value = Number.parseInt(String(input ?? ''), 10);
  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return Math.min(value, max);
}

export function normalizeTagId(input: unknown): string {
  return String(input ?? '').trim().toUpperCase();
}

export function normalizeWebId(input: unknown): string {
  return String(input ?? '').trim().toUpperCase();
}

export function nowIso(): string {
  return new Date().toISOString();
}
