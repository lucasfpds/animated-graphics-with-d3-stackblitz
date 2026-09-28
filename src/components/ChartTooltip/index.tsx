"use client";

import type { CSSProperties, FC } from "react";

import type { ChartTooltipState } from "@/types/charts";
import styles from "./ChartTooltip.module.css";

export type ChartTooltipProps = {
  state: ChartTooltipState;
};

/**
 * Tooltip único dos gráficos. A posição chega por CSS custom properties
 * (`--tooltip-x`/`--tooltip-y`) para que a aparência continue no CSS Module e
 * o componente siga testável no jsdom.
 */
export const ChartTooltip: FC<ChartTooltipProps> = ({ state }) => {
  const position = {
    "--tooltip-x": `${state.x}px`,
    "--tooltip-y": `${state.y}px`,
  } as CSSProperties;

  const announcement = state.visible
    ? `${state.title}: ${state.rows
        .map((row) => `${row.label} ${row.value}`)
        .join(", ")}`
    : "";

  return (
    <>
      <div
        className={styles.tooltip}
        data-visible={state.visible}
        style={position}
        aria-hidden="true"
      >
        <p className={styles.title}>{state.title}</p>
        <dl className={styles.rows}>
          {state.rows.map((row) => (
            <div key={row.label} className={styles.row}>
              <dt className={styles.label}>{row.label}</dt>
              <dd className={styles.value}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <span className={styles["live-region"]} aria-live="polite">
        {announcement}
      </span>
    </>
  );
};
