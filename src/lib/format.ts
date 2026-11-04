const numberFormat = new Intl.NumberFormat('en-PH');
const pesoFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});
const dateFormat = new Intl.DateTimeFormat('en-PH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** 94016 -> "94,016" */
export const num = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? numberFormat.format(value) : '—';

/** 2052432051 -> "₱2,052,432,051" */
export const peso = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? pesoFormat.format(value) : '—';

/** 2052432051 -> "₱2.05 billion" — for prose, never for a table cell. */
export const pesoShort = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  if (value >= 1_000_000_000) return `₱${(value / 1_000_000_000).toFixed(2)} billion`;
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)} million`;
  if (value >= 1_000) return `₱${(value / 1_000).toFixed(0)} thousand`;
  return peso(value);
};

/** 537100000 -> "₱537M" — for chart labels, where space is scarce. */
export const pesoCompact = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  if (value === 0) return '₱0';
  if (value >= 1_000_000_000) return `₱${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `₱${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000) return `₱${Math.round(value / 1_000)}k`;
  return peso(value);
};

/** 0.0735 -> "7.4%" */
export const pct = (value: number, digits = 1): string =>
  `${(value * 100).toFixed(digits).replace(/\.0$/, '')}%`;

/** ISO timestamp -> "2 Nov 2026" */
export const isoDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : dateFormat.format(parsed);
};

/** ISO date (YYYY-MM-DD) -> "2 Nov 2026", without timezone drift. */
export const dayDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? '—' : dateFormat.format(parsed);
};

/** {year, quarter} -> "Q2 2026" */
export const quarterLabel = (period: { year: number; quarter: number | null } | null): string => {
  if (!period) return '—';
  return period.quarter ? `Q${period.quarter} ${period.year}` : `CY ${period.year}`;
};
