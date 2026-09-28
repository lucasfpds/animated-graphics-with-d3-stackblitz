"use client";

import { useEffect, useId, useMemo, useRef, useState, type FC } from "react";
import { select } from "d3-selection";
import "d3-transition";
import { pie, type PieArcDatum } from "d3-shape";

import { ChartLegend, type ChartLegendItem } from "@/components/ChartLegend";
import { ChartTooltip } from "@/components/ChartTooltip";
import { useChartDimensions } from "@/hooks/use-chart-dimensions";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { ChartTooltipState, PieDatum, SeriesKey } from "@/types/charts";
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
import styles from "./PieChart.module.css";

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

export type PieChartProps = {
  data: readonly PieDatum[];
  title: string;
  description: string;
  height?: number;
  duration?: number;
  selectedSeries?: SeriesKey | null;
  /** Chamado ao clicar numa fatia (filtra a série do gráfico de linhas). */
  onSelect?: (series: SeriesKey) => void;
  showLegend?: boolean;
};

/**
 * Distribuição por métrica (gráfico de pizza).
 *
 * O destaque (hover/clique) muda o raio externo, que faz parte da geometria
 * interpolada — por isso a expansão é animada junto com as mudanças de dados.
 */
export const PieChart: FC<PieChartProps> = ({
  data,
  title,
  description,
  height = 300,
  duration = DEFAULT_TRANSITION_DURATION,
  selectedSeries = null,
  onSelect,
  showLegend = true,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const previousGeometryRef = useRef<Map<string, ArcGeometry>>(new Map());
  const [tooltip, setTooltip] = useState<ChartTooltipState>(EMPTY_TOOLTIP);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { containerRef, dimensions } = useChartDimensions<HTMLDivElement>({
    fallback: { width: 360, height },
  });

  const transitionDuration = resolveTransitionDuration(
    duration,
    prefersReducedMotion,
  );
  const total = useMemo(
    () => data.reduce((accumulator, item) => accumulator + item.value, 0),
    [data],
  );
  const inner = useMemo(
    () => ({
      width: Math.max(dimensions.width - PIE_MARGIN.left - PIE_MARGIN.right, 0),
      height: Math.max(height - PIE_MARGIN.top - PIE_MARGIN.bottom, 0),
    }),
    [dimensions.width, height],
  );
  const outerRadius = Math.max(
    Math.min(inner.width, inner.height) / 2 - EXPANDED_OFFSET,
    1,
  );

  const arcs = useMemo(
    () => pie<PieDatum>().value((datum) => datum.value).sort(null)([...data]),
    [data],
  );

  const highlightedId = useMemo(() => {
    if (hoveredId) {
      return hoveredId;
    }

    return data.find((datum) => datum.series === selectedSeries)?.id ?? null;
  }, [data, hoveredId, selectedSeries]);

  const geometryFor = useMemo(
    () =>
      (datum: PieArcDatum<PieDatum>): ArcGeometry => ({
        startAngle: datum.startAngle,
        endAngle: datum.endAngle,
        padAngle: datum.padAngle,
        outerRadius:
          datum.data.id === highlightedId
            ? outerRadius + EXPANDED_OFFSET
            : outerRadius,
      }),
    [highlightedId, outerRadius],
  );

  const legendItems = useMemo<ChartLegendItem[]>(
    () =>
      data.map((datum) => ({
        id: datum.id,
        label: datum.label,
        className: SERIES_META[datum.series].className,
        value: formatShare(datum.value, total),
        series: datum.series,
      })),
    [data, total],
  );

  useEffect(() => {
    const svgElement = svgRef.current;

    if (!svgElement) {
      return undefined;
    }

    const svg = select(svgElement);
    svg.attr("viewBox", `0 0 ${dimensions.width} ${height}`);

    const centerX = PIE_MARGIN.left + inner.width / 2;
    const centerY = PIE_MARGIN.top + inner.height / 2;

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
            value: formatShare(datum.data.value, total),
          },
        ],
      };
    };

    const showTooltip = (datum: PieArcDatum<PieDatum>): void => {
      setHoveredId(datum.data.id);
      setTooltip(buildTooltip(datum));
    };

    const hideTooltip = (): void => {
      setHoveredId(null);
      setTooltip((current) => ({ ...current, visible: false }));
    };

    const slices = plot
      .selectAll<SVGPathElement, PieArcDatum<PieDatum>>(
        "path[data-role='slice']",
      )
      .data(arcs, (datum) => datum.data.id)
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
              previousGeometryRef.current.set(datum.data.id, {
                ...geometry,
                endAngle: geometry.startAngle,
              });
            }),
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr("class", (datum) =>
        [styles.slice, SERIES_META[datum.data.series].className].join(" "),
      )
      .attr(
        "aria-label",
        (datum) =>
          `${datum.data.label}: ${formatMetricValue(
            datum.data.value,
            SERIES_META[datum.data.series].unit,
          )} (${formatShare(datum.data.value, total)})`,
      )
      .on("mouseenter", (_event, datum) => showTooltip(datum))
      .on("mouseleave", hideTooltip)
      .on("focus", (_event, datum) => showTooltip(datum))
      .on("blur", hideTooltip)
      .on("click", (_event, datum) => onSelect?.(datum.data.series));

    if (transitionDuration > 0) {
      slices
        .transition()
        .duration(transitionDuration)
        .attrTween("d", (datum) => {
          const previousGeometry =
            previousGeometryRef.current.get(datum.data.id) ??
            geometryFor(datum);

          return createArcTween(previousGeometry, 0)(geometryFor(datum));
        });
    } else {
      slices.attr("d", (datum) =>
        createArcPathFromGeometry(geometryFor(datum), 0),
      );
    }

    const visibleArcs = arcs.filter(
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
            .attr("class", styles.label),
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr("x", (datum) => getArcCentroid(geometryFor(datum), 0)[0])
      .attr("y", (datum) => getArcCentroid(geometryFor(datum), 0)[1])
      .text((datum) => formatShare(datum.data.value, total));

    arcs.forEach((datum) => {
      previousGeometryRef.current.set(datum.data.id, geometryFor(datum));
    });

    return () => {
      select(svgElement).selectAll("*").interrupt();
    };
  }, [
    arcs,
    dimensions.width,
    geometryFor,
    height,
    inner.height,
    inner.width,
    onSelect,
    total,
    transitionDuration,
  ]);

  useEffect(() => {
    const svgElement = svgRef.current;

    if (!svgElement) {
      return undefined;
    }

    select(svgElement)
      .selectAll<SVGPathElement, PieArcDatum<PieDatum>>(
        "path[data-role='slice']",
      )
      .attr("data-active", (datum) =>
        datum.data.id === hoveredId ? "true" : "false",
      )
      .attr("data-selected", (datum) =>
        datum.data.series === selectedSeries ? "true" : "false",
      )
      .attr("aria-pressed", (datum) =>
        datum.data.series === selectedSeries ? "true" : "false",
      );

    return undefined;
  }, [arcs, dimensions.width, height, hoveredId, selectedSeries]);

  return (
    <div ref={containerRef} className={`w-full ${styles.frame}`}>
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
      {showLegend ? (
        <ChartLegend
          items={legendItems}
          selectedSeries={selectedSeries}
          onSelect={onSelect}
        />
      ) : null}
      {data.length === 0 ? (
        <p className={styles.empty}>Sem dados para exibir.</p>
      ) : null}
    </div>
  );
};
