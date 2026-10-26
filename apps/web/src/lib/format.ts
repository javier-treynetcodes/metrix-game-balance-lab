const numberFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const timeFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export function formatNumber(value: number | undefined): string {
  return value === undefined ? '—' : numberFormat.format(value);
}

/** Duel times: one decimal, and a compact form for very long fights. */
export function formatTime(value: number): string {
  if (value >= 10_000) return `${numberFormat.format(Math.round(value / 1000))}k`;
  return timeFormat.format(value);
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
