/**
 * Formatação pt-BR centralizada: nenhum componente monta strings numéricas ou
 * de data por conta própria.
 */

import type { MetricUnit } from "@/types/charts";

export type { MetricUnit };

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const compactFormatter = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatNumber = (value: number): string =>
  numberFormatter.format(value);

export const formatDecimal = (value: number): string =>
  decimalFormatter.format(value);

export const formatCompactNumber = (value: number): string =>
  compactFormatter.format(value);

export const formatCurrency = (value: number): string =>
  currencyFormatter.format(value);

/** `ratio` é uma fração (0.42 → "42%"). */
export const formatPercent = (ratio: number): string =>
  percentFormatter.format(Number.isFinite(ratio) ? ratio : 0);

export const formatShare = (value: number, total: number): string =>
  formatPercent(total === 0 ? 0 : value / total);

export const formatShortDate = (timestamp: number): string =>
  shortDateFormatter.format(timestamp);

export const formatDateTime = (timestamp: number): string =>
  dateTimeFormatter.format(timestamp);

/** Formata de acordo com a unidade da métrica. */
export const formatMetricValue = (value: number, unit: MetricUnit): string =>
  unit === "currency" ? formatCurrency(value) : formatNumber(value);

/** Variação percentual entre dois valores (`0.12` → "+12,0%"). */
export const formatVariation = (current: number, previous: number): string => {
  if (previous === 0) {
    return formatPercent(current === 0 ? 0 : 1);
  }

  const variation = (current - previous) / Math.abs(previous);
  const prefix = variation > 0 ? "+" : "";

  return `${prefix}${formatPercent(variation)}`;
};
