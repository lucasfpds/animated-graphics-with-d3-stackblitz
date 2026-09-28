<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useCssModule, useId, watch } from "vue";
import { axisBottom, axisLeft } from "d3-axis";
import { select, type Selection } from "d3-selection";
import "d3-transition";
import {
  zoom,
  zoomIdentity,
  type D3ZoomEvent,
  type ZoomBehavior,
} from "d3-zoom";

import ChartTooltip from "@/components/ChartTooltip.vue";
import { useChartDimensions } from "@/composables/use-chart-dimensions";
import { usePrefersReducedMotion } from "@/composables/use-prefers-reduced-motion";
import type {
  ChartTooltipState,
  DataPoint,
  LineChartProps,
  ZoomTransformState,
} from "@/types/charts";
import {
  DEFAULT_MARGIN,
  DEFAULT_TRANSITION_DURATION,
  SERIES_META,
  applyZoomToDomain,
  createAreaGenerator,
  createAreaPath,
  createLineGenerator,
  createLinePath,
  createLinearScaleFromDomain,
  createPathTween,
  createTimeScaleFromDomain,
  findNearestPoint,
  formatCompactNumber,
  formatMetricValue,
  formatShortDate,
  formatVariation,
  getInnerSize,
  getTimeDomain,
  getZeroBasedValueDomain,
  resolveTransitionDuration,
  toPathPoints,
  type PathPoint,
} from "@/utils/charts";

const $style = useCssModule();

const EMPTY_TOOLTIP: ChartTooltipState = {
  visible: false,
  x: 0,
  y: 0,
  title: "",
  rows: [],
};

const props = withDefaults(defineProps<LineChartProps>(), {
  height: 340,
  duration: DEFAULT_TRANSITION_DURATION,
  maxZoom: 8,
});

const uid = useId();
const titleId = `${uid}-title`;
const descriptionId = `${uid}-desc`;
const gradientId = `${uid}-gradient`;
const clipId = `${uid}-clip`;

const svgRef = ref<SVGSVGElement | null>(null);
const zoomBehaviorRef = ref<ZoomBehavior<SVGRectElement, unknown> | null>(null);
let previousPathRef: PathPoint[] = [];
let previousAreaRef: PathPoint[] = [];
let zoomDriven = false;

const tooltip = ref<ChartTooltipState>(EMPTY_TOOLTIP);
const hoveredPoint = ref<DataPoint | null>(null);
const zoomState = ref<ZoomTransformState>({
  k: zoomIdentity.k,
  x: zoomIdentity.x,
  y: zoomIdentity.y,
});

const prefersReducedMotion = usePrefersReducedMotion();
const baseDuration = computed(() =>
  resolveTransitionDuration(props.duration, prefersReducedMotion.value),
);
const seriesClass = computed(() => SERIES_META[props.metric].className);
const unit = computed(() => SERIES_META[props.metric].unit);

const { containerRef, dimensions } = useChartDimensions({
  fallback: { width: 720, height: props.height },
});

const layout = computed(() => ({
  width: dimensions.value.width,
  height: props.height,
  margin: DEFAULT_MARGIN,
}));
const inner = computed(() => getInnerSize(layout.value));

const scales = computed(() => {
  const timeDomain = getTimeDomain(props.points);
  const valueDomain = getZeroBasedValueDomain(props.points);
  const x = createTimeScaleFromDomain(
    applyZoomToDomain(timeDomain, [0, inner.value.width], zoomState.value, "x"),
    [0, inner.value.width],
  );
  const y = createLinearScaleFromDomain(
    applyZoomToDomain(valueDomain, [inner.value.height, 0], zoomState.value, "y"),
    [inner.value.height, 0],
  );

  return { x, y, timeDomain, valueDomain };
});

const activePoint = computed(() => {
  if (!hoveredPoint.value) {
    return null;
  }

  return props.points.some((point) => point.id === hoveredPoint.value!.id)
    ? hoveredPoint.value
    : null;
});

const applyZoomAction = (
  action: (
    selection: Selection<SVGRectElement, unknown, null, undefined>,
  ) => void,
): void => {
  const svgElement = svgRef.value;
  const behavior = zoomBehaviorRef.value;

  if (!svgElement || !behavior) {
    return;
  }

  const overlay = select(svgElement).select<SVGRectElement>(
    "rect[data-role='overlay']",
  );

  if (overlay.empty()) {
    return;
  }

  zoomDriven = true;
  action(overlay);
};

const handleZoomIn = (): void => {
  applyZoomAction((overlay) => {
    const behavior = zoomBehaviorRef.value;

    if (behavior) {
      overlay.call(behavior.scaleBy, 1.5);
    }
  });
};

const handleZoomOut = (): void => {
  applyZoomAction((overlay) => {
    const behavior = zoomBehaviorRef.value;

    if (behavior) {
      overlay.call(behavior.scaleBy, 1 / 1.5);
    }
  });
};

const handleZoomReset = (): void => {
  applyZoomAction((overlay) => {
    const behavior = zoomBehaviorRef.value;

    if (behavior) {
      overlay.call(behavior.transform, zoomIdentity);
    }
  });
};

const render = (): void => {
  const svgElement = svgRef.value;

  if (!svgElement) {
    return;
  }

  const svg = select(svgElement);
  svg.attr("class", `${$style.chart} ${seriesClass.value}`);
  svg.attr("viewBox", `0 0 ${layout.value.width} ${layout.value.height}`);

  const defs = svg
    .selectAll<SVGDefsElement, null>("defs")
    .data([null])
    .join("defs");

  defs
    .selectAll<SVGLinearGradientElement, null>(`#${gradientId}`)
    .data([null])
    .join("linearGradient")
    .attr("id", gradientId)
    .attr("x1", "0%")
    .attr("x2", "0%")
    .attr("y1", "0%")
    .attr("y2", "100%")
    .selectAll<SVGStopElement, { offset: string; opacity: number }>("stop")
    .data([
      { offset: "0%", opacity: 0.34 },
      { offset: "100%", opacity: 0 },
    ])
    .join("stop")
    .attr("offset", (stop) => stop.offset)
    .attr("stop-opacity", (stop) => stop.opacity);

  defs
    .selectAll<SVGClipPathElement, null>(`#${clipId}`)
    .data([null])
    .join("clipPath")
    .attr("id", clipId)
    .selectAll<SVGRectElement, null>("rect")
    .data([null])
    .join("rect")
    .attr("width", inner.value.width)
    .attr("height", inner.value.height);

  const plot = svg
    .selectAll<SVGGElement, null>("g[data-role='plot']")
    .data([null])
    .join("g")
    .attr("data-role", "plot")
    .attr(
      "transform",
      `translate(${layout.value.margin.left},${layout.value.margin.top})`,
    );

  plot
    .selectAll<SVGGElement, null>("g[data-role='axis-x']")
    .data([null])
    .join("g")
    .attr("data-role", "axis-x")
    .attr("class", $style.axis)
    .attr("transform", `translate(0,${inner.value.height})`)
    .call(axisBottom(scales.value.x).ticks(6).tickSizeOuter(0));

  plot
    .selectAll<SVGGElement, null>("g[data-role='axis-y']")
    .data([null])
    .join("g")
    .attr("data-role", "axis-y")
    .attr("class", $style.axis)
    .call(
      axisLeft(scales.value.y)
        .ticks(5)
        .tickFormat((value) => formatCompactNumber(Number(value))),
    )
    .call((layer) => layer.select(".domain").remove());

  const clipped = plot
    .selectAll<SVGGElement, null>("g[data-role='clipped']")
    .data([null])
    .join("g")
    .attr("data-role", "clipped")
    .attr("clip-path", `url(#${clipId})`);

  const lineGenerator = createLineGenerator();
  const areaGenerator = createAreaGenerator();
  const targetPoints = toPathPoints(
    props.points,
    (timestamp) => scales.value.x(timestamp),
    (value) => scales.value.y(value),
  );
  const comparisonPoints = toPathPoints(
    props.points.map((point) => ({ ...point, value: point.comparison })),
    (timestamp) => scales.value.x(timestamp),
    (value) => scales.value.y(value),
  );

  const areaPath = clipped
    .selectAll<SVGPathElement, null>("path[data-role='area']")
    .data([null])
    .join("path")
    .attr("data-role", "area")
    .attr("class", $style.area)
    .attr("fill", `url(#${gradientId})`);

  const linePath = clipped
    .selectAll<SVGPathElement, null>("path[data-role='line']")
    .data([null])
    .join("path")
    .attr("data-role", "line")
    .attr("class", $style.line);

  clipped
    .selectAll<SVGPathElement, null>("path[data-role='comparison']")
    .data([null])
    .join("path")
    .attr("data-role", "comparison")
    .attr("class", $style.comparison)
    .attr("d", createLinePath(comparisonPoints, lineGenerator));

  clipped
    .selectAll<SVGLineElement, null>("line[data-role='guide']")
    .data([null])
    .join("line")
    .attr("data-role", "guide")
    .attr("class", $style.guide)
    .attr("data-visible", "false")
    .attr("y1", 0)
    .attr("y2", inner.value.height);

  clipped
    .selectAll<SVGCircleElement, null>("circle[data-role='point-marker']")
    .data([null])
    .join("circle")
    .attr("data-role", "point-marker")
    .attr("class", $style.marker)
    .attr("data-visible", "false")
    .attr("r", 5);

  const transitionDuration = zoomDriven ? 0 : baseDuration.value;

  if (transitionDuration > 0 && previousPathRef.length > 0) {
    linePath
      .transition()
      .duration(transitionDuration)
      .attrTween("d", () =>
        createPathTween(previousPathRef, lineGenerator)(targetPoints),
      );
    areaPath
      .transition()
      .duration(transitionDuration)
      .attrTween("d", () =>
        createPathTween(previousAreaRef, areaGenerator)(targetPoints),
      );
  } else {
    linePath.attr("d", createLinePath(targetPoints, lineGenerator));
    areaPath.attr("d", createAreaPath(targetPoints, areaGenerator));
  }

  previousPathRef = targetPoints;
  previousAreaRef = targetPoints;

  const overlay = plot
    .selectAll<SVGRectElement, unknown>("rect[data-role='overlay']")
    .data<unknown>([null])
    .join("rect")
    .attr("data-role", "overlay")
    .attr("class", $style.overlay)
    .attr("width", inner.value.width)
    .attr("height", inner.value.height);

  const behavior = zoom<SVGRectElement, unknown>()
    .scaleExtent([1, props.maxZoom])
    .extent([
      [0, 0],
      [inner.value.width, inner.value.height],
    ])
    .translateExtent([
      [0, 0],
      [inner.value.width, inner.value.height],
    ])
    .on("zoom", (event: D3ZoomEvent<SVGRectElement, unknown>) => {
      zoomDriven = true;
      hoveredPoint.value = null;
      tooltip.value = { ...tooltip.value, visible: false };
      zoomState.value = {
        k: event.transform.k,
        x: event.transform.x,
        y: event.transform.y,
      };
    });

  zoomBehaviorRef.value = behavior;
  overlay.call(behavior);

  overlay
    .on("mousemove", (event: MouseEvent) => {
      const target = event.currentTarget as SVGRectElement | null;

      if (!target) {
        return;
      }

      const bounds = target.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const nearest = findNearestPoint(
        props.points,
        Number(scales.value.x.invert(pointerX)),
      );

      if (!nearest) {
        return;
      }

      hoveredPoint.value = nearest;
      tooltip.value = {
        visible: true,
        x: layout.value.margin.left + scales.value.x(nearest.timestamp),
        y: layout.value.margin.top + scales.value.y(nearest.value),
        title: formatShortDate(nearest.timestamp),
        rows: [
          {
            label: SERIES_META[props.metric].label,
            value: formatMetricValue(nearest.value, unit.value),
          },
          {
            label: "Referência",
            value: formatMetricValue(nearest.comparison, unit.value),
          },
          {
            label: "Variação",
            value: formatVariation(nearest.value, nearest.comparison),
          },
        ],
      };
    })
    .on("mouseleave", () => {
      hoveredPoint.value = null;
      tooltip.value = { ...tooltip.value, visible: false };
    });

  zoomDriven = false;
};

const updateInteractive = (): void => {
  const svgElement = svgRef.value;

  if (!svgElement) {
    return;
  }

  const plot = select(svgElement).select<SVGGElement>("g[data-role='plot']");
  const marker = plot.select<SVGCircleElement>("circle[data-role='point-marker']");
  const guide = plot.select<SVGLineElement>("line[data-role='guide']");

  if (!activePoint.value) {
    marker.attr("data-visible", "false");
    guide.attr("data-visible", "false");

    return;
  }

  const markerX = scales.value.x(activePoint.value.timestamp);
  const markerY = scales.value.y(activePoint.value.value);

  marker.attr("cx", markerX).attr("cy", markerY).attr("data-visible", "true");
  guide
    .attr("x1", markerX)
    .attr("x2", markerX)
    .attr("y1", 0)
    .attr("y2", inner.value.height)
    .attr("data-visible", "true");
};

onMounted(() => {
  render();
  updateInteractive();
});

watch(
  [scales, layout, baseDuration, seriesClass, unit, () => props.maxZoom],
  render,
);

watch([activePoint, inner, scales], updateInteractive);

onBeforeUnmount(() => {
  select(svgRef.value).selectAll("*").interrupt();
});
</script>

<template>
  <div ref="containerRef" :class="$style.frame">
    <svg
      ref="svgRef"
      :width="dimensions.width"
      :height="height"
      role="group"
      :aria-labelledby="`${titleId} ${descriptionId}`"
      :data-zoom-k="zoomState.k.toFixed(2)"
      :data-hovered-id="activePoint?.id ?? ''"
    >
      <title :id="titleId">{{ title }}</title>
      <desc :id="descriptionId">{{ description }}</desc>
    </svg>
    <div :class="$style.toolbar" role="group" aria-label="Controles de zoom">
      <button
        type="button"
        :class="$style['zoom-button']"
        @click="handleZoomIn"
        aria-label="Ampliar"
      >
        +
      </button>
      <button
        type="button"
        :class="$style['zoom-button']"
        @click="handleZoomOut"
        aria-label="Reduzir"
      >
        −
      </button>
      <button
        type="button"
        :class="[$style['zoom-button'], $style['zoom-reset']]"
        @click="handleZoomReset"
        aria-label="Restaurar zoom"
      >
        Restaurar
      </button>
    </div>
    <ChartTooltip :state="tooltip" />
    <p v-if="points.length === 0" :class="$style.empty">
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

/* Os stops do gradiente herdam a cor da série publicada na raiz do SVG. */
.chart :global(stop) {
  stop-color: var(--ds-series-color, var(--ds-accent));
}

.axis :global(.domain),
.axis :global(.tick line) {
  stroke: var(--ds-grid);
}

.axis :global(.tick text) {
  fill: var(--ds-foreground-muted);
  font-size: var(--ds-font-size-xs);
}

.area {
  opacity: 0.9;
}

.line {
  fill: none;
  stroke: var(--ds-series-color, var(--ds-accent));
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.comparison {
  fill: none;
  stroke: var(--ds-foreground-muted);
  stroke-dasharray: 5 4;
  stroke-width: 1.5;
  opacity: 0.8;
}

.guide {
  stroke: var(--ds-foreground-muted);
  stroke-dasharray: 3 3;
  stroke-width: 1;
  opacity: 0;
  pointer-events: none;
}

.guide[data-visible="true"] {
  opacity: 0.75;
}

.marker {
  fill: var(--ds-series-color, var(--ds-accent));
  stroke: var(--ds-surface);
  stroke-width: 2;
  opacity: 0;
  pointer-events: none;
}

.marker[data-visible="true"] {
  opacity: 1;
}

.overlay {
  fill: transparent;
  cursor: grab;
}

.overlay:active {
  cursor: grabbing;
}

.toolbar {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 6px;
}

.zoom-button {
  width: 30px;
  height: 30px;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-surface);
  color: var(--ds-foreground);
  font: inherit;
  font-size: var(--ds-font-size-md);
  line-height: 1;
  cursor: pointer;
  transition:
    border-color var(--ds-duration-fast) var(--ds-ease-out),
    color var(--ds-duration-fast) var(--ds-ease-out);
}

.zoom-button:hover {
  border-color: var(--ds-accent);
  color: var(--ds-accent);
}

.zoom-reset {
  width: auto;
  padding: 0 10px;
  font-size: var(--ds-font-size-xs);
}

.empty {
  color: var(--ds-foreground-muted);
  font-size: var(--ds-font-size-sm);
}
</style>
