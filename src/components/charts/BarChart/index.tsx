"use client";

import { useEffect, useId, useMemo, useRef, useState, type FC } from "react";
import { axisBottom, axisLeft } from "d3-axis";
import { select } from "d3-selection";
// Efeito colateral necessário: publica `selection.transition()` no protótipo.
import "d3-transition";

import { ChartTooltip } from "@/components/ChartTooltip";
import { useChartDimensions } from "@/hooks/use-chart-dimensions";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { ChartTooltipState, DataPoint, SeriesKey } from "@/types/charts";
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
import styles from "./BarChart.module.css";

const BAR_ROLE = "bar";
const REFERENCE_ROLE = "bar-reference";
const EMPTY_TOOLTIP: ChartTooltipState = {
  visible: false,
  x: 0,
  y: 0,
  title: "",
  rows: [],
};

export type BarChartProps = {
  points: readonly DataPoint[];
  /** Métrica exibida — define cor, unidade e rótulo. */
  metric: SeriesKey;
  title: string;
  description: string;
  height?: number;
  duration?: number;
  selectedId?: string | null;
  onSelect?: (point: DataPoint) => void;
};

/**
 * Gráfico de barras das etapas do funil.
 *
 * O React cuida do estado (tooltip, seleção) e o D3 desenha o SVG dentro de um
 * efeito: join por `id` + transição de `y`/`height` para animar entrada e
 * atualização. Nenhuma posição depende de medição do DOM, o que mantém o
 * comportamento previsível no jsdom.
 */
export const BarChart: FC<BarChartProps> = ({
  points,
  metric,
  title,
  description,
  height = 320,
  duration = DEFAULT_TRANSITION_DURATION,
  selectedId = null,
  onSelect,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tooltip, setTooltip] = useState<ChartTooltipState>(EMPTY_TOOLTIP);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { containerRef, dimensions } = useChartDimensions<HTMLDivElement>({
    fallback: { width: 720, height },
  });

  const transitionDuration = resolveTransitionDuration(
    duration,
    prefersReducedMotion,
  );
  const seriesClass = SERIES_META[metric].className;
  const unit = SERIES_META[metric].unit;
  const total = useMemo(() => getSeriesTotal(points), [points]);

  const layout = useMemo(
    () => ({ width: dimensions.width, height, margin: DEFAULT_MARGIN }),
    [dimensions.width, height],
  );
  const inner = useMemo(() => getInnerSize(layout), [layout]);

  const scales = useMemo(() => {
    const band = createBandScale(
      points.map((point) => point.label),
      [0, inner.width],
    );
    const value = createValueScale(
      points.flatMap((point) => [point.value, point.comparison]),
      [inner.height, 0],
    );

    return { band, value };
  }, [points, inner.width, inner.height]);

  useEffect(() => {
    const svgElement = svgRef.current;

    if (!svgElement) {
      return undefined;
    }

    const svg = select(svgElement);
    svg.attr("viewBox", `0 0 ${layout.width} ${layout.height}`);

    const plot = svg
      .selectAll<SVGGElement, null>("g[data-role='plot']")
      .data([null])
      .join("g")
      .attr("data-role", "plot")
      .attr(
        "transform",
        `translate(${layout.margin.left},${layout.margin.top})`,
      );

    const bandStart = (datum: DataPoint): number =>
      scales.band(datum.label) ?? 0;
    const bandWidth = Math.max(scales.band.bandwidth(), 1);

    const buildTooltip = (datum: DataPoint): ChartTooltipState => ({
      visible: true,
      x: layout.margin.left + bandStart(datum) + bandWidth / 2,
      y: layout.margin.top + scales.value(datum.value),
      title: datum.label,
      rows: [
        { label: "Valor", value: formatMetricValue(datum.value, unit) },
        { label: "Participação", value: formatShare(datum.value, total) },
        {
          label: "vs. referência",
          value: formatVariation(datum.value, datum.comparison),
        },
      ],
    });

    const hideTooltip = (): void => {
      setHoveredId(null);
      setTooltip((current) => ({ ...current, visible: false }));
    };

    const showTooltip = (datum: DataPoint): void => {
      setHoveredId(datum.id);
      setTooltip(buildTooltip(datum));
    };

    plot
      .selectAll<SVGGElement, null>("g[data-role='axis-x']")
      .data([null])
      .join("g")
      .attr("data-role", "axis-x")
      .attr("class", styles.axis)
      .attr("transform", `translate(0,${inner.height})`)
      .call(axisBottom(scales.band).tickSizeOuter(0));

    plot
      .selectAll<SVGGElement, null>("g[data-role='axis-y']")
      .data([null])
      .join("g")
      .attr("data-role", "axis-y")
      .attr("class", styles.axis)
      .call(
        axisLeft(scales.value)
          .ticks(5)
          .tickFormat((value) => formatCompactNumber(Number(value))),
      )
      .call((layer) => layer.select(".domain").remove());

    const barY = (datum: DataPoint): number => scales.value(datum.value);
    const barHeight = (datum: DataPoint): number =>
      Math.max(inner.height - scales.value(datum.value), 0);

    const bars = plot
      .selectAll<SVGRectElement, DataPoint>("rect[data-role='bar']")
      .data(points, (datum) => datum.id)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("data-role", BAR_ROLE)
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr("y", inner.height)
            .attr("height", 0),
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr("class", `${styles.bar} ${seriesClass}`)
      .attr("x", bandStart)
      .attr("width", bandWidth)
      .attr("data-clickable", onSelect ? "true" : "false")
      .attr(
        "aria-label",
        (datum) => `${datum.label}: ${formatMetricValue(datum.value, unit)}`,
      )
      .on("mouseenter", (_event, datum) => showTooltip(datum))
      .on("mouseleave", hideTooltip)
      .on("focus", (_event, datum) => showTooltip(datum))
      .on("blur", hideTooltip)
      .on("click", (_event, datum) => onSelect?.(datum));

    const references = plot
      .selectAll<SVGLineElement, DataPoint>(
        "line[data-role='bar-reference']",
      )
      .data(points, (datum) => datum.id)
      .join(
        (enter) =>
          enter
            .append("line")
            .attr("data-role", REFERENCE_ROLE)
            .attr("y1", inner.height)
            .attr("y2", inner.height),
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr("class", styles["bar-reference"])
      .attr("x1", bandStart)
      .attr("x2", (datum) => bandStart(datum) + bandWidth);

    if (transitionDuration > 0) {
      bars
        .transition()
        .duration(transitionDuration)
        .attr("y", barY)
        .attr("height", barHeight);
      references
        .transition()
        .duration(transitionDuration)
        .attr("y1", (datum) => scales.value(datum.comparison))
        .attr("y2", (datum) => scales.value(datum.comparison));
    } else {
      bars.attr("y", barY).attr("height", barHeight);
      references
        .attr("y1", (datum) => scales.value(datum.comparison))
        .attr("y2", (datum) => scales.value(datum.comparison));
    }

    return () => {
      // Interrompe animações pendentes quando o efeito é desmontado/refeito.
      select(svgElement).selectAll("*").interrupt();
    };
  }, [
    inner.height,
    inner.width,
    layout,
    onSelect,
    points,
    scales,
    seriesClass,
    total,
    transitionDuration,
    unit,
  ]);

  useEffect(() => {
    const svgElement = svgRef.current;

    if (!svgElement) {
      return undefined;
    }

    select(svgElement)
      .selectAll<SVGRectElement, DataPoint>("rect[data-role='bar']")
      .attr("data-active", (datum) =>
        datum.id === hoveredId ? "true" : "false",
      )
      .attr("data-selected", (datum) =>
        datum.id === selectedId ? "true" : "false",
      );

    return undefined;
  }, [hoveredId, inner.height, inner.width, points, selectedId]);

  return (
    <div ref={containerRef} className="w-full">
      <svg
        ref={svgRef}
        className={styles.chart}
        width={dimensions.width}
        height={height}
        role="group"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>{title}</title>
        <desc id={descriptionId}>{description}</desc>
      </svg>
      <ChartTooltip state={tooltip} />
      {points.length === 0 ? (
        <p className={styles.empty}>Sem dados para exibir.</p>
      ) : null}
    </div>
  );
};
