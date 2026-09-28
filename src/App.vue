<script setup lang="ts">
import { computed, ref, useCssModule } from "vue";

import ChartCard from "@/components/ChartCard.vue";
import ChartControls from "@/components/ChartControls.vue";
import BarChart from "@/components/charts/BarChart.vue";
import LineChart from "@/components/charts/LineChart.vue";
import PieChart from "@/components/charts/PieChart.vue";
import { useLiveSeries } from "@/composables/use-live-series";
import type {
  ChartCardHighlight,
  DataPoint,
  SeriesKey,
} from "@/types/charts";
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

const $style = useCssModule();

const { dataset, isPlaying, intervalMs, tick, toggle, step, shuffle, setIntervalMs } =
  useLiveSeries();

const metric = ref<SeriesKey>("revenue");
const selectedSeries = ref<SeriesKey | null>(null);
const selectedStageId = ref<string | null>(null);

const lineMetric = computed(() => selectedSeries.value ?? metric.value);
const lineMeta = computed(() => SERIES_META[lineMetric.value]);
const stages = computed(() => dataset.value.stages[metric.value]);
const timeline = computed(() => dataset.value.timelines[lineMetric.value]);
const stageTotal = computed(() => getSeriesTotal(stages.value));
const timelineTotal = computed(() => getSeriesTotal(timeline.value));
const timelineAverage = computed(() => getSeriesAverage(timeline.value));
const latestPoint = computed(() => getSeriesLatest(timeline.value));
const trend = computed(() => getSeriesTrend(timeline.value));
const distributionTotal = computed(() =>
  dataset.value.distribution.reduce(
    (accumulator, item) => accumulator + item.value,
    0,
  ),
);

const lineHighlight = computed<ChartCardHighlight>(() => {
  const value = latestPoint.value?.value ?? 0;
  const comparison = latestPoint.value?.comparison ?? 0;

  return {
    label: lineMeta.value.label,
    value: formatMetricValue(value, lineMeta.value.unit),
    variation: formatVariation(value, comparison),
    trend: value === comparison ? "flat" : value > comparison ? "up" : "down",
  };
});

const focusedShare = computed(() =>
  dataset.value.distribution.find((item) => item.series === lineMetric.value),
);

const handleSelectShare = (series: SeriesKey): void => {
  selectedSeries.value = selectedSeries.value === series ? null : series;
};

const handleSelectStage = (point: DataPoint): void => {
  selectedStageId.value = selectedStageId.value === point.id ? null : point.id;
};

const handleChangeMetric = (value: SeriesKey): void => {
  metric.value = value;
};
</script>

<template>
  <main :class="$style.page" :data-tick="tick" :data-playing="isPlaying">
    <header :class="$style.header">
      <h1 :class="$style.title">Gráficos animados com D3.js</h1>
      <p :class="$style.subtitle">
        <span
          :class="$style['live-dot']"
          :data-playing="isPlaying"
          aria-hidden="true"
        />
        <span>
          {{
            isPlaying ? "Feed em execução" : "Feed pausado"
          }} · atualiza a cada {{ formatDecimal(intervalMs / 1000) }}s · tick
          {{ tick }} · {{ formatDateTime(dataset.generatedAt) }}
        </span>
      </p>
    </header>

    <ChartControls
      :is-playing="isPlaying"
      :interval-ms="intervalMs"
      :metric="metric"
      :on-toggle-playing="toggle"
      :on-step="step"
      :on-shuffle="shuffle"
      :on-change-metric="handleChangeMetric"
      :on-change-interval="setIntervalMs"
    />

    <div :class="$style.grid">
      <ChartCard
        title="Etapas do funil"
        description="Cada barra é uma etapa; a linha tracejada marca o valor de referência do período anterior."
        :highlight="{
          label: 'Total do funil',
          value: formatMetricValue(stageTotal, SERIES_META[metric].unit),
        }"
      >
        <BarChart
          :points="stages"
          :metric="metric"
          :selected-id="selectedStageId"
          :on-select="handleSelectStage"
          :height="300"
          :title="`Etapas do funil — ${SERIES_META[metric].label}`"
          description="Gráfico de barras animado das etapas do funil. Use Tab para percorrer as barras e Enter para destacar uma etapa."
        />
      </ChartCard>

      <ChartCard
        title="Série temporal"
        description="Janela deslizante com zoom e pan no eixo do tempo e nos valores; a linha tracejada é a referência."
        :highlight="lineHighlight"
      >
        <LineChart
          :points="timeline"
          :metric="lineMetric"
          :height="300"
          :title="`Série temporal — ${lineMeta.label}`"
          description="Gráfico de linhas animado com zoom. Use a roda do mouse, os botões de ampliar/reduzir ou a tecla Enter sobre o gráfico para interagir."
        />
        <div :class="$style.stats">
          <div :class="$style.stat">
            <p :class="$style['stat-label']">Total da janela</p>
            <p :class="$style['stat-value']">
              {{ formatMetricValue(timelineTotal, lineMeta.unit) }}
            </p>
            <p :class="$style['stat-helper']">
              {{ `${timeline.length} pontos` }}
            </p>
          </div>
          <div :class="$style.stat">
            <p :class="$style['stat-label']">Média por ponto</p>
            <p :class="$style['stat-value']">
              {{ formatMetricValue(Math.round(timelineAverage), lineMeta.unit) }}
            </p>
          </div>
          <div :class="$style.stat">
            <p :class="$style['stat-label']">Tendência</p>
            <p :class="$style['stat-value']">
              {{
                formatVariation(
                  latestPoint?.value ?? 0,
                  latestPoint?.comparison ?? 0,
                )
              }}
            </p>
            <p :class="$style['stat-helper']">
              {{ trend >= 0 ? "alta na janela" : "baixa na janela" }}
            </p>
          </div>
        </div>
      </ChartCard>
    </div>

    <ChartCard
      title="Participação por métrica"
      description="Clique numa fatia para focar o gráfico de linhas naquela métrica; clique de novo para voltar ao conjunto completo."
      :highlight="{
        label: `Foco: ${lineMeta.label}`,
        value: formatShare(focusedShare?.value ?? 0, distributionTotal),
      }"
    >
      <PieChart
        :data="dataset.distribution"
        :selected-series="selectedSeries"
        :on-select="handleSelectShare"
        :height="280"
        title="Participação por métrica"
        description="Gráfico de pizza animado com a participação de cada métrica na janela atual. Use Tab para percorrer as fatias e Enter para focar uma métrica."
      />
    </ChartCard>

    <p :class="$style.footer">
      Dados sintéticos gerados por PRNG semeado (mulberry32): o mesmo tick produz
      exatamente os mesmos números no servidor, no cliente e nos testes.
    </p>
  </main>
</template>

<style module>
.page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 72rem;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title {
  font-size: var(--ds-font-size-xl);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.subtitle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: var(--ds-foreground-muted);
  font-size: var(--ds-font-size-sm);
}

.grid {
  display: grid;
  gap: 24px;
  min-width: 0;
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 4px;
}

.stat {
  padding: 12px 14px;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface-muted);
}

.stat-label {
  color: var(--ds-foreground-muted);
  font-size: var(--ds-font-size-xs);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.stat-value {
  margin-top: 4px;
  font-size: var(--ds-font-size-lg);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.stat-helper {
  margin-top: 2px;
  color: var(--ds-foreground-muted);
  font-size: var(--ds-font-size-xs);
}

.footer {
  color: var(--ds-foreground-muted);
  font-size: var(--ds-font-size-xs);
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-series-3);
}

.live-dot[data-playing="false"] {
  background: var(--ds-foreground-muted);
}
</style>
