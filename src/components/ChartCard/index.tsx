import { useId, type FC, type ReactNode } from "react";

import styles from "./ChartCard.module.css";

export type ChartCardTrend = "up" | "down" | "flat";

export type ChartCardHighlight = {
  label: string;
  value: string;
  /** Variação já formatada (ex.: "+12,4%"). */
  variation?: string;
  trend?: ChartCardTrend;
};

export type ChartCardProps = {
  title: string;
  description: string;
  highlight?: ChartCardHighlight;
  /** Controles exibidos no cabeçalho do cartão. */
  actions?: ReactNode;
  children: ReactNode;
};

/** Cartão padrão dos gráficos: título acessível, resumo e área do SVG. */
export const ChartCard: FC<ChartCardProps> = ({
  title,
  description,
  highlight,
  actions,
  children,
}) => {
  const titleId = useId();

  return (
    <section
      className={`flex min-w-0 flex-col gap-4 ${styles.card}`}
      aria-labelledby={titleId}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <p className={styles.description}>{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {highlight ? (
            <p className={styles.highlight}>
              <span className={styles["highlight-label"]}>
                {highlight.label}
              </span>
              <span className={styles["highlight-value"]}>
                {highlight.value}
              </span>
              {highlight.variation ? (
                <span
                  className={styles["highlight-variation"]}
                  data-trend={highlight.trend ?? "flat"}
                >
                  {highlight.variation}
                </span>
              ) : null}
            </p>
          ) : null}
          {actions}
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
};
