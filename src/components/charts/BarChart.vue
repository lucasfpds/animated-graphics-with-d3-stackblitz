<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useCssModule, useId, watch } from "vue";
import { axisBottom, axisLeft } from "d3-axis";
import { select } from "d3-selection";
// Efeito colateral necessário: publica `selection.transition()` no protótipo.
import "d3-transition";

import ChartTooltip from "@/components/ChartTooltip.vue";
import { useChartDimensions } from "@/composables/use-chart-dimensions";
import { usePrefersReducedMotion } from "@/composables/use-prefers-reduced-motion";
import type { BarChartProps, ChartTooltipState, DataPoint } from "@/types/charts";
import {
  DEFAULT_MARGIN,
  DEFAULT_TRANSITION_DURATION,
  SERIES_META,
  createBandScale,
  createValueScale,
  formatCompactNumber,
  formatMetricValue,
  formatShare,
  formatVariation,
  getInnerSize,
  getSeriesTotal,
  resolveTransitionDuration,
} from "@/utils/charts";

const $style = useCssModule();

const BAR_ROLE = "bar";
const REFERENCE_ROLE = "bar-reference";
const EMPTY_TOOLTIP: ChartTooltipState = {
  visible: false,
  x: 0,
  y: 0,
  title: "",
  rows: [],
};

const props = withDefaults(defineProps<BarChartProps>(), {
  height: 320,
  duration: DEFAULT_TRANSITION_DURATION,
  selectedId: null,
});

const uid = useId();
const titleId = `${uid}-title`;
const descriptionId = `${uid}-desc`;

const svgRef = ref<SVGSVGElement | null>(null);
const tooltip = ref<ChartTooltipState>(EMPTY_TOOLTIP);
const hoveredId = ref<string | null>(null);
const prefersReducedMotion = usePrefersReducedMotion();
const { containerRef, dimensions } = useChartDimensions({
  fallback: { width: 720, height: props.height },
});

const transitionDuration = computed(() =>
  resolveTransitionDuration(props.duration, prefersReducedMotion.value),
);
const seriesClass = computed(() => SERIES_META[props.metric].className);
const unit = computed(() => SERIES_META[props.metric].unit);
const total = computed(() => getSeriesTotal(props.points));

const layout = computed(() => ({
  width: dimensions.value.width,
  height: props.height,
  margin: DEFAULT_MARGIN,
}));
const inner = computed(() => getInnerSize(layout.value));

const scales = computed(() => {
  const band = createBandScale(
    props.points.map((point) => point.label),
    [0, inner.value.width],
  );
  const value = createValueScale(
    props.points.flatMap((point) => [point.value, point.comparison]),
    [inner.value.height, 0],
  );

  return { band, value };
});

const render = (): void => {
  const svgElement = svgRef.value;

  if (!svgElement) {
    return;
  }

  const svg = select(svgElement);
  svg.attr("viewBox", `0 0 ${layout.value.width} ${layout.value.height}`);

  const plot = svg
    .selectAll<SVGGElement, null>("g[data-role='plot']")
    .data([null])
    .join("g")
    .attr("data-role", "plot")
    .attr(
      "transform",
      `translate(${layout.value.margin.left},${layout.value.margin.top})`,
    );

  const bandStart = (datum: DataPoint): number =>
    scales.value.band(datum.label) ?? 0;
  const bandWidth = Math.max(scales.value.band.bandwidth(), 1);

  const buildTooltip = (datum: DataPoint): ChartTooltipState => ({
    visible: true,
    x: layout.value.margin.left + bandStart(datum) + bandWidth / 2,
    y: layout.value.margin.top + scales.value.value(datum.value),
    title: datum.label,
    rows: [
      { label: "Valor", value: formatMetricValue(datum.value, unit.value) },
      { label: "Participação", value: formatShare(datum.value, total.value) },
      {
        label: "vs. referência",
        value: formatVariation(datum.value, datum.comparison),
      },
    ],
  });

  const hideTooltip = (): void => {
    hoveredId.value = null;
    tooltip.value = { ...tooltip.value, visible: false };
  };

  const showTooltip = (datum: DataPoint): void => {
    hoveredId.value = datum.id;
    tooltip.value = buildTooltip(datum);
  };

  plot
    .selectAll<SVGGElement, null>("g[data-role='axis-x']")
    .data([null])
    .join("g")
    .attr("data-role", "axis-x")
    .attr("class", $style.axis)
    .attr("transform", `translate(0,${inner.value.height})`)
    .call(axisBottom(scales.value.band).tickSizeOuter(0));

  plot
    .selectAll<SVGGElement, null>("g[data-role='axis-y']")
    .data([null])
    .join("g")
    .attr("data-role", "axis-y")
    .attr("class", $style.axis)
    .call(
      axisLeft(scales.value.value)
        .ticks(5)
        .tickFormat((value) => formatCompactNumber(Number(value))),
    )
    .call((layer) => layer.select(".domain").remove());

  const barY = (datum: DataPoint): number => scales.value.value(datum.value);
  const barHeight = (datum: DataPoint): number =>
    Math.max(inner.value.height - scales.value.value(datum.value), 0);

  const bars = plot
    .selectAll<SVGRectElement, DataPoint>("rect[data-role='bar']")
    .data(props.points, (datum) => datum.id)
    .join(
      (enter) =>
        enter
          .append("rect")
          .attr("data-role", BAR_ROLE)
          .attr("tabindex", 0)
          .attr("role", "button")
          .attr("y", inner.value.height)
          .attr("height", 0),
      (update) => update,
      (exit) => exit.remove(),
    )
    .attr("class", `${$style.bar} ${seriesClass.value}`)
    .attr("x", bandStart)
    .attr("width", bandWidth)
    .attr("data-clickable", props.onSelect ? "true" : "false")
    .attr(
      "aria-label",
      (datum) => `${datum.label}: ${formatMetricValue(datum.value, unit.value)}`,
    )
    .on("mouseenter", (_event, datum) => showTooltip(datum))
    .on("mouseleave", hideTooltip)
    .on("focus", (_event, datum) => showTooltip(datum))
    .on("blur", hideTooltip)
    .on("click", (_event, datum) => props.onSelect?.(datum));

  const references = plot
    .selectAll<SVGLineElement, DataPoint>("line[data-role='bar-reference']")
    .data(props.points, (datum) => datum.id)
    .join(
      (enter) =>
        enter
          .append("line")
          .attr("data-role", REFERENCE_ROLE)
          .attr("y1", inner.value.height)
          .attr("y2", inner.value.height),
      (update) => update,
      (exit) => exit.remove(),
    )
    .attr("class", $style["bar-reference"])
    .attr("x1", bandStart)
    .attr("x2", (datum) => bandStart(datum) + bandWidth);

  if (transitionDuration.value > 0) {
    bars
      .transition()
      .duration(transitionDuration.value)
      .attr("y", barY)
      .attr("height", barHeight);
    references
      .transition()
      .duration(transitionDuration.value)
      .attr("y1", (datum) => scales.value.value(datum.comparison))
      .attr("y2", (datum) => scales.value.value(datum.comparison));
  } else {
    bars.attr("y", barY).attr("height", barHeight);
    references
      .attr("y1", (datum) => scales.value.value(datum.comparison))
      .attr("y2", (datum) => scales.value.value(datum.comparison));
  }
};

const updateInteractive = (): void => {
  const svgElement = svgRef.value;

  if (!svgElement) {
    return;
  }

  select(svgElement)
    .selectAll<SVGRectElement, DataPoint>("rect[data-role='bar']")
    .attr("data-active", (datum) =>
      datum.id === hoveredId.value ? "true" : "false",
    )
    .attr("data-selected", (datum) =>
      datum.id === props.selectedId ? "true" : "false",
    );
};

onMounted(() => {
  render();
  updateInteractive();
});

watch(
  [scales, layout, total, transitionDuration, seriesClass, unit, () => props.onSelect],
  render,
);

watch([hoveredId, () => props.selectedId], updateInteractive);

onBeforeUnmount(() => {
  select(svgRef.value).selectAll("*").interrupt();
});
</script>

<template>
  <div ref="containerRef" :class="$style.frame">
    <svg
      ref="svgRef"
      :class="$style.chart"
      :width="dimensions.width"
      :height="height"
      role="group"
      :aria-labelledby="`${titleId} ${descriptionId}`"
    >
      <title :id="titleId">{{ title }}</title>
      <desc :id="descriptionId">{{ description }}</desc>
    </svg>
    <ChartTooltip :state="tooltip" />
    <p v-if="points.length === 0" :class="$style.empty">
      Sem dados para exibir.
    </p>
  </div>
</template>

<style module>
.frame {
  width: 100%;
}

.chart {
  display: block;
  max-width: 100%;
}

.axis :global(.domain),
.axis :global(.tick line) {
  stroke: var(--ds-grid);
}

.axis :global(.tick text) {
  fill: var(--ds-foreground-muted);
  font-size: var(--ds-font-size-xs);
}

.bar {
  fill: var(--ds-series-color, var(--ds-accent));
  opacity: 0.92;
  cursor: default;
  transition:
    opacity var(--ds-duration-fast) var(--ds-ease-out),
    stroke-width var(--ds-duration-fast) var(--ds-ease-out);
}

.bar[data-clickable="true"] {
  cursor: pointer;
}

.bar[data-active="true"],
.bar[data-selected="true"] {
  opacity: 1;
  stroke: var(--ds-foreground);
  stroke-width: 2;
}

.bar:focus-visible {
  outline: none;
  stroke: var(--ds-accent);
  stroke-width: 3;
}

.bar-reference {
  stroke: var(--ds-foreground-muted);
  stroke-dasharray: 4 3;
  stroke-width: 2;
  /* Fica acima das barras no DOM: não pode interceptar o ponteiro. */
  pointer-events: none;
}

.empty {
  color: var(--ds-foreground-muted);
  font-size: var(--ds-font-size-sm);
}
</style>
