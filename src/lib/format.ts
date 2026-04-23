import { formatDistanceToNowStrict } from "date-fns";

export function formatMoney(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export function formatPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function formatDelta(n: number, unit: "pp" | "%" = "%"): string {
  const sign = n > 0 ? "+" : n < 0 ? "" : "";
  return `${sign}${n.toFixed(1)}${unit}`;
}

export function formatNumber(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
}

export function formatRelativeDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const absStr = formatDistanceToNowStrict(date);
  if (diffMs < 0) return `${absStr} ago`;
  return `in ${absStr}`;
}
