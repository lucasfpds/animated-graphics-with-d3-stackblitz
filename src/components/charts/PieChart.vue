<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useCssModule, useId, watch } from "vue";
import { select } from "d3-selection";
import "d3-transition";
import { pie, type PieArcDatum } from "d3-shape";

import ChartLegend from "@/components/ChartLegend.vue";
import ChartTooltip from "@/components/ChartTooltip.vue";
import { useChartDimensions } from "@/composables/use-chart-dimensions";
import { usePrefersReducedMotion } from "@/composables/use-prefers-reduced-motion";
import type {
  ChartLegendItem,
  ChartTooltipState,
  PieChartProps,
  PieDatum,
} from "@/types/charts";
import {
  DEFAULT_TRANSITION_DURATION,
  SERIES_META,
  createArcPathFromGeometry,
  createArcTween,
  formatMetricValue,
  formatShare,
  getArcCentroid,
  resolveTransitionDuration,
  type ArcGeometry,
} from "@/utils/charts";

const $style = useCssModule();

const SLICE_ROLE = "slice";
const LABEL_ROLE = "slice-label";
/** Deslocamento do raio externo quando a fatia está em destaque. */
const EXPANDED_OFFSET = 10;
const PIE_MARGIN = { top: 16, right: 16, bottom: 16, left: 16 };

const EMPTY_TOOLTIP: ChartTooltipState = {
  visible: false,
  x: 0,
  y: 0,
  title: "",
  rows: [],
};

const props = withDefaults(defineProps<PieChartProps>(), {
  height: 300,
  duration: DEFAULT_TRANSITION_DURATION,
  selectedSeries: null,
  showLegend: true,
});

const uid = useId();
const titleId = `${uid}-title`;
const descriptionId = `${uid}-desc`;

const svgRef = ref<SVGSVGElement | null>(null);
const previousGeometry = new Map<string, ArcGeometry>();
const tooltip = ref<ChartTooltipState>(EMPTY_TOOLTIP);
const hoveredId = ref<string | null>(null);
const prefersReducedMotion = usePrefersReducedMotion();
const { containerRef, dimensions } = useChartDimensions({
  fallback: { width: 360, height: props.height },
});

const transitionDuration = computed(() =>
  resolveTransitionDuration(props.duration, prefersReducedMotion.value),
);
const total = computed(() =>
  props.data.reduce((accumulator, item) => accumulator + item.value, 0),
);
const inner = computed(() => ({
  width: Math.max(
    dimensions.value.width - PIE_MARGIN.left - PIE_MARGIN.right,
    0,
  ),
  height: Math.max(props.height - PIE_MARGIN.top - PIE_MARGIN.bottom, 0),
}));
const outerRadius = computed(() =>
  Math.max(Math.min(inner.value.width, inner.value.height) / 2 - EXPANDED_OFFSET, 1),
);

const arcs = computed(() =>
  pie<PieDatum>()
    .value((datum) => datum.value)
    .sort(null)([...props.data]),
);

const highlightedId = computed(() => {
  if (hoveredId.value) {
    return hoveredId.value;
  }

  return (
    props.data.find((datum) => datum.series === props.selectedSeries)?.id ??
    null
  );
});

const geometryFor = (datum: PieArcDatum<PieDatum>): ArcGeometry => ({
  startAngle: datum.startAngle,
  endAngle: datum.endAngle,
  padAngle: datum.padAngle,
  outerRadius:
    datum.data.id === highlightedId.value
      ? outerRadius.value + EXPANDED_OFFSET
      : outerRadius.value,
});

const legendItems = computed<ChartLegendItem[]>(() =>
  props.data.map((datum) => ({
    id: datum.id,
    label: datum.label,
    className: SERIES_META[datum.series].className,
    value: formatShare(datum.value, total.value),
    series: datum.series,
  })),
);

const render = (): void => {
  const svgElement = svgRef.value;

  if (!svgElement) {
    return;
  }

  const svg = select(svgElement);
  svg.attr("viewBox", `0 0 ${dimensions.value.width} ${props.height}`);

  const centerX = PIE_MARGIN.left + inner.value.width / 2;
  const centerY = PIE_MARGIN.top + inner.value.height / 2;

  const plot = svg
    .selectAll<SVGGElement, null>("g[data-role='plot']")
    .data([null])
    .join("g")
    .attr("data-role", "plot")
    .attr("transform", `translate(${centerX},${centerY})`);

  const buildTooltip = (datum: PieArcDatum<PieDatum>): ChartTooltipState => {
    const [labelX, labelY] = getArcCentroid(geometryFor(datum), 0);

    return {
      visible: true,
      x: centerX + labelX,
      y: centerY + labelY,
      title: datum.data.label,
      rows: [
        {
          label: "Valor",
          value: formatMetricValue(
            datum.data.value,
            SERIES_META[datum.data.series].unit,
          ),
        },
        {
          label: "Participação",
          value: formatShare(datum.data.value, total.value),
        },
      ],
    };
  };

  const showTooltip = (datum: PieArcDatum<PieDatum>): void => {
    hoveredId.value = datum.data.id;
    tooltip.value = buildTooltip(datum);
  };

  const hideTooltip = (): void => {
    hoveredId.value = null;
    tooltip.value = { ...tooltip.value, visible: false };
  };

  const slices = plot
    .selectAll<SVGPathElement, PieArcDatum<PieDatum>>("path[data-role='slice']")
    .data(arcs.value, (datum) => datum.data.id)
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("data-role", SLICE_ROLE)
          .attr("tabindex", 0)
          .attr("role", "button")
          .each((datum) => {
            const geometry = geometryFor(datum);

            // A fatia nasce colapsada e "abre" na primeira transição.
            previousGeometry.set(datum.data.id, {
              ...geometry,
              endAngle: geometry.startAngle,
            });
          }),
      (update) => update,
      (exit) => exit.remove(),
    )
    .attr("class", (datum) =>
      [$style.slice, SERIES_META[datum.data.series].className].join(" "),
    )
    .attr(
      "aria-label",
      (datum) =>
        `${datum.data.label}: ${formatMetricValue(
          datum.data.value,
          SERIES_META[datum.data.series].unit,
        )} (${formatShare(datum.data.value, total.value)})`,
    )
    .on("mouseenter", (_event, datum) => showTooltip(datum))
    .on("mouseleave", hideTooltip)
    .on("focus", (_event, datum) => showTooltip(datum))
    .on("blur", hideTooltip)
    .on("click", (_event, datum) => props.onSelect?.(datum.data.series));

  if (transitionDuration.value > 0) {
    slices
      .transition()
      .duration(transitionDuration.value)
      .attrTween("d", (datum) => {
        const previous =
          previousGeometry.get(datum.data.id) ?? geometryFor(datum);

        return createArcTween(previous, 0)(geometryFor(datum));
      });
  } else {
    slices.attr("d", (datum) =>
      createArcPathFromGeometry(geometryFor(datum), 0),
    );
  }

  const visibleArcs = arcs.value.filter(
    (datum) => (datum.endAngle - datum.startAngle) / (2 * Math.PI) >= 0.05,
  );

  plot
    .selectAll<SVGTextElement, PieArcDatum<PieDatum>>(
      "text[data-role='slice-label']",
    )
    .data(visibleArcs, (datum) => datum.data.id)
    .join(
      (enter) =>
        enter
          .append("text")
          .attr("data-role", LABEL_ROLE)
          .attr("class", $style.label),
      (update) => update,
      (exit) => exit.remove(),
    )
    .attr("x", (datum) => getArcCentroid(geometryFor(datum), 0)[0])
    .attr("y", (datum) => getArcCentroid(geometryFor(datum), 0)[1])
    .text((datum) => formatShare(datum.data.value, total.value));

  arcs.value.forEach((datum) => {
    previousGeometry.set(datum.data.id, geometryFor(datum));
  });
};

const updateInteractive = (): void => {
  const svgElement = svgRef.value;

  if (!svgElement) {
    return;
  }

  select(svgElement)
    .selectAll<SVGPathElement, PieArcDatum<PieDatum>>("path[data-role='slice']")
    .attr("data-active", (datum) =>
      datum.data.id === hoveredId.value ? "true" : "false",
    )
    .attr("data-selected", (datum) =>
      datum.data.series === props.selectedSeries ? "true" : "false",
    )
    .attr("aria-pressed", (datum) =>
      datum.data.series === props.selectedSeries ? "true" : "false",
    );
};

onMounted(() => {
  render();
  updateInteractive();
});

watch(
  [arcs, highlightedId, outerRadius, total, transitionDuration, () => props.onSelect],
  render,
);

watch([hoveredId, () => props.selectedSeries, arcs], updateInteractive);

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
    <ChartLegend
      v-if="showLegend"
      :items="legendItems"
      :selected-series="selectedSeries"
      :on-select="onSelect"
    />
    <p v-if="data.length === 0" :class="$style.empty">
      Sem dados para exibir.
    </p>
  </div>
</template>

<style module>
.frame {
  position: relative;
  width: 100%;
}

.chart {
  display: block;
  max-width: 100%;
}

.slice {
  stroke: var(--ds-surface);
  stroke-width: 2;
  cursor: pointer;
  transition: opacity var(--ds-duration-fast) var(--ds-ease-out);
}

.slice:focus-visible {
  outline: none;
  stroke: var(--ds-accent);
  stroke-width: 3;
}

.slice[data-active="true"],
.slice[data-selected="true"] {
  stroke: var(--ds-accent);
  stroke-width: 3;
}

.slice[data-selected="true"] {
  stroke-dasharray: 5 3;
}

.label {
  fill: var(--ds-surface);
  font-size: var(--ds-font-size-xs);
  font-weight: 600;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
}

.empty {
  color: var(--ds-foreground-muted);
  font-size: var(--ds-font-size-sm);
}
</style>
