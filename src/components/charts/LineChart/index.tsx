"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FC,
} from "react";
import { axisBottom, axisLeft } from "d3-axis";
import { select, type Selection } from "d3-selection";
import "d3-transition";
import {
  zoom,
  zoomIdentity,
  type D3ZoomEvent,
  type ZoomBehavior,
} from "d3-zoom";

import { ChartTooltip } from "@/components/ChartTooltip";
import { useChartDimensions } from "@/hooks/use-chart-dimensions";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type {
  ChartTooltipState,
  DataPoint,
  SeriesKey,
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
import styles from "./LineChart.module.css";

const EMPTY_TOOLTIP: ChartTooltipState = {
  visible: false,
  x: 0,
  y: 0,
  title: "",
  rows: [],
};

export type LineChartProps = {
  points: readonly DataPoint[];
  metric: SeriesKey;
  title: string;
  description: string;
  height?: number;
  duration?: number;
  /** Limite de ampliação do zoom. */
  maxZoom?: number;
};

/**
 * Série temporal com zoom/pan.
 *
 * O `d3-zoom` é inicializado uma única vez (o `zoom(selection)` do d3-zoom
 * reinicia `__zoom`, então reinicializá-lo a cada tick perderia a
 * transformação corrente). O handler apenas guarda a transformação em estado
 * do React; o domínio do zoom é derivado por `applyZoomToDomain`, que é pura
 * e testável.
 */
export const LineChart: FC<LineChartProps> = ({
  points,
  metric,
  title,
  description,
  height = 340,
  duration = DEFAULT_TRANSITION_DURATION,
  maxZoom = 8,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const gradientId = `line-area${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const clipId = `line-clip${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGRectElement, unknown> | null>(
    null,
  );
  const previousPathRef = useRef<PathPoint[]>([]);
  const previousAreaRef = useRef<PathPoint[]>([]);
  const zoomDrivenRef = useRef(false);

  const [tooltip, setTooltip] = useState<ChartTooltipState>(EMPTY_TOOLTIP);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [zoomState, setZoomState] = useState<ZoomTransformState>({
    k: zoomIdentity.k,
    x: zoomIdentity.x,
    y: zoomIdentity.y,
  });

  const prefersReducedMotion = usePrefersReducedMotion();
  const baseDuration = resolveTransitionDuration(duration, prefersReducedMotion);
  const seriesClass = SERIES_META[metric].className;
  const unit = SERIES_META[metric].unit;

  const { containerRef, dimensions } = useChartDimensions<HTMLDivElement>({
    fallback: { width: 720, height },
  });

  const layout = useMemo(
    () => ({ width: dimensions.width, height, margin: DEFAULT_MARGIN }),
    [dimensions.width, height],
  );
  const inner = useMemo(() => getInnerSize(layout), [layout]);

  const scales = useMemo(() => {
    const timeDomain = getTimeDomain(points);
    const valueDomain = getZeroBasedValueDomain(points);
    const x = createTimeScaleFromDomain(
      applyZoomToDomain(timeDomain, [0, inner.width], zoomState, "x"),
      [0, inner.width],
    );
    const y = createLinearScaleFromDomain(
      applyZoomToDomain(valueDomain, [inner.height, 0], zoomState, "y"),
      [inner.height, 0],
    );

    return { x, y, timeDomain, valueDomain };
  }, [inner.height, inner.width, points, zoomState]);

  const activePoint = useMemo(() => {
    if (!hoveredPoint) {
      return null;
    }

    return points.some((point) => point.id === hoveredPoint.id)
      ? hoveredPoint
      : null;
  }, [hoveredPoint, points]);

  const applyZoomAction = useCallback(
    (
      action: (
        selection: Selection<SVGRectElement, unknown, null, undefined>,
      ) => void,
    ) => {
      const svgElement = svgRef.current;
      const behavior = zoomBehaviorRef.current;

      if (!svgElement || !behavior) {
        return;
      }

      const overlay = select(svgElement).select<SVGRectElement>(
        "rect[data-role='overlay']",
      );

      if (overlay.empty()) {
        return;
      }

      zoomDrivenRef.current = true;
      action(overlay);
    },
    [],
  );

  const handleZoomIn = useCallback(() => {
    applyZoomAction((overlay) => {
      const behavior = zoomBehaviorRef.current;

      if (behavior) {
        overlay.call(behavior.scaleBy, 1.5);
      }
    });
  }, [applyZoomAction]);

  const handleZoomOut = useCallback(() => {
    applyZoomAction((overlay) => {
      const behavior = zoomBehaviorRef.current;

      if (behavior) {
        overlay.call(behavior.scaleBy, 1 / 1.5);
      }
    });
  }, [applyZoomAction]);

  const handleZoomReset = useCallback(() => {
    applyZoomAction((overlay) => {
      const behavior = zoomBehaviorRef.current;

      if (behavior) {
        overlay.call(behavior.transform, zoomIdentity);
      }
    });
  }, [applyZoomAction]);

  useEffect(() => {
    const svgElement = svgRef.current;

    if (!svgElement) {
      return undefined;
    }

    const svg = select(svgElement);
    svg.attr("class", `${styles.chart} ${seriesClass}`);
    svg.attr("viewBox", `0 0 ${layout.width} ${layout.height}`);

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
      .attr("width", inner.width)
      .attr("height", inner.height);

    const plot = svg
      .selectAll<SVGGElement, null>("g[data-role='plot']")
      .data([null])
      .join("g")
      .attr("data-role", "plot")
      .attr(
        "transform",
        `translate(${layout.margin.left},${layout.margin.top})`,
      );

    plot
      .selectAll<SVGGElement, null>("g[data-role='axis-x']")
      .data([null])
      .join("g")
      .attr("data-role", "axis-x")
      .attr("class", styles.axis)
      .attr("transform", `translate(0,${inner.height})`)
      .call(axisBottom(scales.x).ticks(6).tickSizeOuter(0));

    plot
      .selectAll<SVGGElement, null>("g[data-role='axis-y']")
      .data([null])
      .join("g")
      .attr("data-role", "axis-y")
      .attr("class", styles.axis)
      .call(
        axisLeft(scales.y)
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
      points,
      (timestamp) => scales.x(timestamp),
      (value) => scales.y(value),
    );
    const comparisonPoints = toPathPoints(
      points.map((point) => ({ ...point, value: point.comparison })),
      (timestamp) => scales.x(timestamp),
      (value) => scales.y(value),
    );

    const areaPath = clipped
      .selectAll<SVGPathElement, null>("path[data-role='area']")
      .data([null])
      .join("path")
      .attr("data-role", "area")
      .attr("class", styles.area)
      .attr("fill", `url(#${gradientId})`);

    const linePath = clipped
      .selectAll<SVGPathElement, null>("path[data-role='line']")
      .data([null])
      .join("path")
      .attr("data-role", "line")
      .attr("class", styles.line);

    clipped
      .selectAll<SVGPathElement, null>("path[data-role='comparison']")
      .data([null])
      .join("path")
      .attr("data-role", "comparison")
      .attr("class", styles.comparison)
      .attr("d", createLinePath(comparisonPoints, lineGenerator));

    clipped
      .selectAll<SVGLineElement, null>("line[data-role='guide']")
      .data([null])
      .join("line")
      .attr("data-role", "guide")
      .attr("class", styles.guide)
      .attr("data-visible", "false")
      .attr("y1", 0)
      .attr("y2", inner.height);

    clipped
      .selectAll<SVGCircleElement, null>("circle[data-role='point-marker']")
      .data([null])
      .join("circle")
      .attr("data-role", "point-marker")
      .attr("class", styles.marker)
      .attr("data-visible", "false")
      .attr("r", 5);

    const transitionDuration = zoomDrivenRef.current ? 0 : baseDuration;

    if (transitionDuration > 0 && previousPathRef.current.length > 0) {
      linePath
        .transition()
        .duration(transitionDuration)
        .attrTween("d", () =>
          createPathTween(previousPathRef.current, lineGenerator)(targetPoints),
        );
      areaPath
        .transition()
        .duration(transitionDuration)
        .attrTween("d", () =>
          createPathTween(previousAreaRef.current, areaGenerator)(targetPoints),
        );
    } else {
      linePath.attr("d", createLinePath(targetPoints, lineGenerator));
      areaPath.attr("d", createAreaPath(targetPoints, areaGenerator));
    }

    previousPathRef.current = targetPoints;
    previousAreaRef.current = targetPoints;

    const overlay = plot
      .selectAll<SVGRectElement, unknown>("rect[data-role='overlay']")
      .data<unknown>([null])
      .join("rect")
      .attr("data-role", "overlay")
      .attr("class", styles.overlay)
      .attr("width", inner.width)
      .attr("height", inner.height);

    const behavior = zoom<SVGRectElement, unknown>()
      .scaleExtent([1, maxZoom])
      .extent([
        [0, 0],
        [inner.width, inner.height],
      ])
      .translateExtent([
        [0, 0],
        [inner.width, inner.height],
      ])
      .on("zoom", (event: D3ZoomEvent<SVGRectElement, unknown>) => {
        zoomDrivenRef.current = true;
        setHoveredPoint(null);
        setTooltip((current) => ({ ...current, visible: false }));
        setZoomState({
          k: event.transform.k,
          x: event.transform.x,
          y: event.transform.y,
        });
      });

    zoomBehaviorRef.current = behavior;
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
          points,
          Number(scales.x.invert(pointerX)),
        );

        if (!nearest) {
          return;
        }

        setHoveredPoint(nearest);
        setTooltip({
          visible: true,
          x: layout.margin.left + scales.x(nearest.timestamp),
          y: layout.margin.top + scales.y(nearest.value),
          title: formatShortDate(nearest.timestamp),
          rows: [
            {
              label: SERIES_META[metric].label,
              value: formatMetricValue(nearest.value, unit),
            },
            {
              label: "Referência",
              value: formatMetricValue(nearest.comparison, unit),
            },
            {
              label: "Variação",
              value: formatVariation(nearest.value, nearest.comparison),
            },
          ],
        });
      })
      .on("mouseleave", () => {
        setHoveredPoint(null);
        setTooltip((current) => ({ ...current, visible: false }));
      });

    zoomDrivenRef.current = false;

    return () => {
      // Os listeners do zoom morrem junto com o SVG; aqui só as transições
      // pendentes precisam ser interrompidas.
      select(svgElement).selectAll("*").interrupt();
    };
  }, [
    baseDuration,
    clipId,
    gradientId,
    inner.height,
    inner.width,
    layout,
    maxZoom,
    metric,
    points,
    scales,
    seriesClass,
    unit,
  ]);

  useEffect(() => {
    const svgElement = svgRef.current;

    if (!svgElement) {
      return undefined;
    }

    const plot = select(svgElement).select<SVGGElement>("g[data-role='plot']");
    const marker = plot.select<SVGCircleElement>(
      "circle[data-role='point-marker']",
    );
    const guide = plot.select<SVGLineElement>("line[data-role='guide']");

    if (!activePoint) {
      marker.attr("data-visible", "false");
      guide.attr("data-visible", "false");

      return undefined;
    }

    const markerX = scales.x(activePoint.timestamp);
    const markerY = scales.y(activePoint.value);

    marker
      .attr("cx", markerX)
      .attr("cy", markerY)
      .attr("data-visible", "true");
    guide
      .attr("x1", markerX)
      .attr("x2", markerX)
      .attr("y1", 0)
      .attr("y2", inner.height)
      .attr("data-visible", "true");

    return undefined;
  }, [activePoint, inner.height, inner.width, points, scales]);

  return (
    <div ref={containerRef} className={`w-full ${styles.frame}`}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={height}
        role="group"
        aria-labelledby={`${titleId} ${descriptionId}`}
        data-zoom-k={zoomState.k.toFixed(2)}
        data-hovered-id={activePoint?.id ?? ""}
      >
        <title id={titleId}>{title}</title>
        <desc id={descriptionId}>{description}</desc>
      </svg>
      <div
        className={styles.toolbar}
        role="group"
        aria-label="Controles de zoom"
      >
        <button
          type="button"
          className={styles["zoom-button"]}
          onClick={handleZoomIn}
          aria-label="Ampliar"
        >
          +
        </button>
        <button
          type="button"
          className={styles["zoom-button"]}
          onClick={handleZoomOut}
          aria-label="Reduzir"
        >
          −
        </button>
        <button
          type="button"
          className={`${styles["zoom-button"]} ${styles["zoom-reset"]}`}
          onClick={handleZoomReset}
          aria-label="Restaurar zoom"
        >
          Restaurar
        </button>
      </div>
      <ChartTooltip state={tooltip} />
      {points.length === 0 ? (
        <p className={styles.empty}>Sem dados para exibir.</p>
      ) : null}
    </div>
  );
};
