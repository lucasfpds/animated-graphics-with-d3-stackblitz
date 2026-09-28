import type { FC } from "react";

import type { SeriesKey } from "@/types/charts";
import styles from "./ChartLegend.module.css";

export type ChartLegendItem = {
  id: string;
  label: string;
  /** Classe global de série (`ds-series-*`) que define a cor. */
  className: string;
  value?: string;
  series?: SeriesKey;
};

export type ChartLegendProps = {
  items: readonly ChartLegendItem[];
  /** Métrica em destaque (usada pelo gráfico de pizza). */
  selectedSeries?: SeriesKey | null;
  onSelect?: (series: SeriesKey) => void;
};

/** Legenda compartilhada; vira botão quando recebe `onSelect`. */
export const ChartLegend: FC<ChartLegendProps> = ({
  items,
  selectedSeries = null,
  onSelect,
}) => (
  <ul className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${styles.legend}`}>
    {items.map((item) => {
      const series = item.series;
      const content = (
        <>
          <span
            className={`${styles.swatch} ${item.className}`}
            aria-hidden="true"
          />
          <span className={styles.label}>{item.label}</span>
          {item.value ? <span className={styles.value}>{item.value}</span> : null}
        </>
      );

      return (
        <li key={item.id} className="flex items-center">
          {onSelect && series ? (
            <button
              type="button"
              className={styles["item-button"]}
              aria-pressed={selectedSeries === series}
              onClick={() => onSelect(series)}
            >
              {content}
            </button>
          ) : (
            <span className={styles.item}>{content}</span>
          )}
        </li>
      );
    })}
  </ul>
);
