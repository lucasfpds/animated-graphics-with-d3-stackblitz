"use client";

import { useCallback, useMemo, useState } from "react";

import { ChartCard, type ChartCardHighlight } from "@/components/ChartCard";
import { ChartControls } from "@/components/ChartControls";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { PieChart } from "@/components/charts/PieChart";
import { useLiveSeries } from "@/hooks/use-live-series";
import type { DataPoint, SeriesKey } from "@/types/charts";
import {
  SERIES_META,
  formatDateTime,
  formatDecimal,
  formatMetricValue,
  formatShare,
  formatVariation,
  getSeriesAverage,
  getSeriesLatest,
  getSeriesTotal,
  getSeriesTrend,
} from "@/utils/charts";
import styles from "./page.module.css";

/** Dashboard: estado da UI aqui, desenho dentro de cada gráfico. */
export default function Home() {
  const {
    dataset,
    isPlaying,
    intervalMs,
    tick,
    toggle,
    step,
    shuffle,
    setIntervalMs,
  } = useLiveSeries();

  const [metric, setMetric] = useState<SeriesKey>("revenue");
  const [selectedSeries, setSelectedSeries] = useState<SeriesKey | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const lineMetric = selectedSeries ?? metric;
  const lineMeta = SERIES_META[lineMetric];
  const stages = dataset.stages[metric];
  const timeline = dataset.timelines[lineMetric];
  const stageTotal = getSeriesTotal(stages);
  const timelineTotal = getSeriesTotal(timeline);
  const timelineAverage = getSeriesAverage(timeline);
  const latestPoint = getSeriesLatest(timeline);
  const trend = getSeriesTrend(timeline);
  const distributionTotal = useMemo(
    () =>
      dataset.distribution.reduce(
        (accumulator, item) => accumulator + item.value,
        0,
      ),
    [dataset.distribution],
  );

  const lineHighlight = useMemo<ChartCardHighlight>(() => {
    const value = latestPoint?.value ?? 0;
    const comparison = latestPoint?.comparison ?? 0;

    return {
      label: lineMeta.label,
      value: formatMetricValue(value, lineMeta.unit),
      variation: formatVariation(value, comparison),
      trend: value === comparison ? "flat" : value > comparison ? "up" : "down",
    };
  }, [latestPoint, lineMeta]);

  const focusedShare = dataset.distribution.find(
    (item) => item.series === lineMetric,
  );

  const handleSelectShare = useCallback((series: SeriesKey) => {
    setSelectedSeries((current) => (current === series ? null : series));
  }, []);

  const handleSelectStage = useCallback((point: DataPoint) => {
    setSelectedStageId((current) => (current === point.id ? null : point.id));
  }, []);

  const handleShuffle = useCallback(() => shuffle(), [shuffle]);

  return (
    <main
      className={`mx-auto flex w-full max-w-6xl flex-col gap-6 ${styles.page}`}
      data-tick={tick}
      data-playing={isPlaying}
    >
      <header className="flex flex-col gap-1">
        <h1 className={styles.title}>Gráficos animados com D3.js</h1>
        <p className={`flex flex-wrap items-center gap-2 ${styles.subtitle}`}>
          <span
            className={styles["live-dot"]}
            data-playing={isPlaying}
            aria-hidden="true"
          />
          <span>
            {isPlaying ? "Feed em execução" : "Feed pausado"} · atualiza a cada{" "}
            {formatDecimal(intervalMs / 1000)}s · tick {tick} ·{" "}
            {formatDateTime(dataset.generatedAt)}
          </span>
        </p>
      </header>

      <ChartControls
        isPlaying={isPlaying}
        intervalMs={intervalMs}
        metric={metric}
        onTogglePlaying={toggle}
        onStep={step}
        onShuffle={handleShuffle}
        onChangeMetric={setMetric}
        onChangeInterval={setIntervalMs}
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Etapas do funil"
          description="Cada barra é uma etapa; a linha tracejada marca o valor de referência do período anterior."
          highlight={{
            label: "Total do funil",
            value: formatMetricValue(stageTotal, SERIES_META[metric].unit),
          }}
        >
          <BarChart
            points={stages}
            metric={metric}
            selectedId={selectedStageId}
            onSelect={handleSelectStage}
            height={300}
            title={`Etapas do funil — ${SERIES_META[metric].label}`}
            description="Gráfico de barras animado das etapas do funil. Use Tab para percorrer as barras e Enter para destacar uma etapa."
          />
        </ChartCard>

        <ChartCard
          title="Série temporal"
          description="Janela deslizante com zoom e pan no eixo do tempo e nos valores; a linha tracejada é a referência."
          highlight={lineHighlight}
        >
          <LineChart
            points={timeline}
            metric={lineMetric}
            height={300}
            title={`Série temporal — ${lineMeta.label}`}
            description="Gráfico de linhas animado com zoom. Use a roda do mouse, os botões de ampliar/reduzir ou a tecla Enter sobre o gráfico para interagir."
          />
          <div className={styles.stats}>
            <div className={styles.stat}>
              <p className={styles["stat-label"]}>Total da janela</p>
              <p className={styles["stat-value"]}>
                {formatMetricValue(timelineTotal, lineMeta.unit)}
              </p>
              <p className={styles["stat-helper"]}>
                {`${timeline.length} pontos`}
              </p>
            </div>
            <div className={styles.stat}>
              <p className={styles["stat-label"]}>Média por ponto</p>
              <p className={styles["stat-value"]}>
                {formatMetricValue(Math.round(timelineAverage), lineMeta.unit)}
              </p>
            </div>
            <div className={styles.stat}>
              <p className={styles["stat-label"]}>Tendência</p>
              <p className={styles["stat-value"]}>
                {formatVariation(
                  latestPoint?.value ?? 0,
                  latestPoint?.comparison ?? 0,
                )}
              </p>
              <p className={styles["stat-helper"]}>
                {trend >= 0 ? "alta na janela" : "baixa na janela"}
              </p>
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Participação por métrica"
        description="Clique numa fatia para focar o gráfico de linhas naquela métrica; clique de novo para voltar ao conjunto completo."
        highlight={{
          label: `Foco: ${lineMeta.label}`,
          value: formatShare(focusedShare?.value ?? 0, distributionTotal),
        }}
      >
        <PieChart
          data={dataset.distribution}
          selectedSeries={selectedSeries}
          onSelect={handleSelectShare}
          height={280}
          title="Participação por métrica"
          description="Gráfico de pizza animado com a participação de cada métrica na janela atual. Use Tab para percorrer as fatias e Enter para focar uma métrica."
        />
      </ChartCard>

      <p className={styles.footer}>
        Dados sintéticos gerados por PRNG semeado (mulberry32): o mesmo tick
        produz exatamente os mesmos números no servidor, no cliente e nos
        testes.
      </p>
    </main>
  );
}