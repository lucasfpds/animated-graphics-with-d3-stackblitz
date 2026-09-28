"use client";

import type { FC } from "react";

import type { SeriesKey } from "@/types/charts";
import { SERIES_KEYS, SERIES_META, formatDecimal } from "@/utils/charts";
import styles from "./ChartControls.module.css";

export const DEFAULT_INTERVAL_OPTIONS = [1000, 2400, 5000] as const;

export type ChartControlsProps = {
  isPlaying: boolean;
  intervalMs: number;
  metric: SeriesKey;
  intervalOptions?: readonly number[];
  onTogglePlaying: () => void;
  /** Avança um ponto com o feed pausado. */
  onStep: () => void;
  /** Gera um histórico novo. */
  onShuffle: () => void;
  onChangeMetric: (metric: SeriesKey) => void;
  onChangeInterval: (intervalMs: number) => void;
};

/** Controles do feed: métrica, play/pause, avanço manual e intervalo. */
export const ChartControls: FC<ChartControlsProps> = ({
  isPlaying,
  intervalMs,
  metric,
  intervalOptions = DEFAULT_INTERVAL_OPTIONS,
  onTogglePlaying,
  onStep,
  onShuffle,
  onChangeMetric,
  onChangeInterval,
}) => (
  <div className={`flex flex-wrap items-center gap-4 ${styles.controls}`}>
    <div
      className={`flex items-center gap-1 ${styles.group}`}
      role="group"
      aria-label="Métrica exibida"
    >
      {SERIES_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={styles.option}
          aria-pressed={key === metric}
          onClick={() => onChangeMetric(key)}
        >
          {SERIES_META[key].label}
        </button>
      ))}
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={styles.action}
        aria-pressed={isPlaying}
        onClick={onTogglePlaying}
      >
        {isPlaying ? "Pausar" : "Reproduzir"}
      </button>
      <button type="button" className={styles.action} onClick={onStep}>
        Avançar
      </button>
      <button type="button" className={styles.action} onClick={onShuffle}>
        Embaralhar
      </button>
      <label className={`flex items-center gap-2 ${styles.field}`}>
        <span className={styles["field-label"]}>Intervalo</span>
        <select
          className={styles.select}
          value={intervalMs}
          onChange={(event) => onChangeInterval(Number(event.target.value))}
        >
          {intervalOptions.map((option) => (
            <option key={option} value={option}>
              {`${formatDecimal(option / 1000)}s`}
            </option>
          ))}
        </select>
      </label>
    </div>
  </div>
);
