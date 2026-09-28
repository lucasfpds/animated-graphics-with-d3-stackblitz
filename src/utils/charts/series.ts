/**
 * Catálogo das métricas exibidas no dashboard: rótulo, unidade e a classe CSS
 * (definida no design system) usada para colorir cada série.
 */

import type { MetricUnit, SeriesKey } from "@/types/charts";

export const SERIES_KEYS = [
  "revenue",
  "users",
  "conversions",
] as const satisfies readonly SeriesKey[];

export type SeriesMeta = {
  key: SeriesKey;
  label: string;
  unit: MetricUnit;
  /**
   * Classe global do design system (definida em `globals.css`) que publica a
   * cor da série em `--ds-series-color`.
   */
  className: string;
};

export const SERIES_META: Record<SeriesKey, SeriesMeta> = {
  revenue: {
    key: "revenue",
    label: "Receita",
    unit: "currency",
    className: "ds-series-1",
  },
  users: {
    key: "users",
    label: "Usuários ativos",
    unit: "count",
    className: "ds-series-2",
  },
  conversions: {
    key: "conversions",
    label: "Conversões",
    unit: "count",
    className: "ds-series-3",
  },
};

export const getSeriesMeta = (key: SeriesKey): SeriesMeta => SERIES_META[key];
