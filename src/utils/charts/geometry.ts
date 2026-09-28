/**
 * Geometria dos gráficos: geração de caminhos (`path`), arcos e matemática de
 * zoom. Tudo aqui é função pura — nada depende do DOM — para que a parte mais
 * arriscada (interpolação e zoom) seja testável no jsdom.
 */

import { bisector } from "d3-array";
import { interpolateArray, interpolateObject } from "d3-interpolate";
import {
  arc,
  area,
  curveMonotoneX,
  line,
  type Arc,
  type Area,
  type Line,
} from "d3-shape";

import type { DataPoint, NumericDomain, ZoomTransformState } from "@/types/charts";

/** Ponto já convertido para coordenadas de tela. */
export type PathPoint = {
  x: number;
  y: number;
};

/** Ângulos de uma fatia do gráfico de pizza. */
export type ArcAngles = {
  startAngle: number;
  endAngle: number;
  padAngle?: number;
};

/**
 * Geometria completa de uma fatia, incluindo o raio externo — que varia no
 * destaque (hover/seleção) e por isso participa da interpolação.
 */
export type ArcGeometry = {
  startAngle: number;
  endAngle: number;
  padAngle: number;
  outerRadius: number;
};

export const createLineGenerator = (): Line<PathPoint> =>
  line<PathPoint>()
    .x((point) => point.x)
    .y((point) => point.y)
    .curve(curveMonotoneX);

export const createAreaGenerator = (): Area<PathPoint> =>
  area<PathPoint>()
    .x((point) => point.x)
    .y0(0)
    .y1((point) => point.y)
    .curve(curveMonotoneX);

/** Converte pontos de dados em coordenadas de tela. */
export const toPathPoints = (
  points: readonly DataPoint[],
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): PathPoint[] =>
  points.map((point) => ({
    x: xScale(point.timestamp),
    y: yScale(point.value),
  }));

/** Caminho da série (retorna `""` quando não há pontos). */
export const createLinePath = (
  points: readonly PathPoint[],
  generator: Line<PathPoint> = createLineGenerator(),
): string => generator([...points]) ?? "";

/** Caminho da área sob a série. */
export const createAreaPath = (
  points: readonly PathPoint[],
  generator: Area<PathPoint> = createAreaGenerator(),
): string => generator([...points]) ?? "";

/**
 * Tween do atributo `d` interpolando os pontos anteriores rumo aos novos.
 * Devolve o valor de `d` para um progresso arbitrário — testável sem DOM.
 */
export const createPathTween =
  (previousPoints: readonly PathPoint[], generator?: Line<PathPoint>) =>
  (targetPoints: readonly PathPoint[]): ((progress: number) => string) => {
    const interpolate = interpolateArray(
      [...previousPoints],
      [...targetPoints],
    );

    return (progress: number): string =>
      createLinePath(interpolate(progress), generator);
  };

export const createArcGenerator = (
  innerRadius: number,
): Arc<unknown, ArcGeometry> =>
  arc<ArcGeometry>()
    .innerRadius(innerRadius)
    .outerRadius((datum) => datum.outerRadius)
    .padAngle((datum) => datum.padAngle)
    .cornerRadius(2);

/** Caminho SVG da fatia a partir da geometria informada. */
export const createArcPathFromGeometry = (
  geometry: ArcGeometry,
  innerRadius: number,
): string => createArcGenerator(innerRadius)(geometry) ?? "";

/**
 * Tween de fatia: interpola a geometria completa — inclusive o raio externo —
 * o que produz a expansão suave ao destacar uma fatia.
 */
export const createArcTween =
  (previousGeometry: ArcGeometry, innerRadius: number) =>
  (targetGeometry: ArcGeometry): ((progress: number) => string) => {
    const interpolate = interpolateObject(previousGeometry, targetGeometry);

    return (progress: number): string =>
      createArcPathFromGeometry(interpolate(progress), innerRadius);
  };

/** Centroide da fatia: ponto médio entre o raio interno e o externo. */
export const getArcCentroid = (
  geometry: ArcGeometry,
  innerRadius: number,
): [number, number] => {
  const angle = (geometry.startAngle + geometry.endAngle) / 2 - Math.PI / 2;
  const radius = (innerRadius + geometry.outerRadius) / 2;

  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
};

const bisectTimestamp = bisector<DataPoint, number>(
  (point) => point.timestamp,
).center;

/** Ponto temporalmente mais próximo do instante informado. */
export const findNearestPoint = (
  points: readonly DataPoint[],
  timestamp: number,
): DataPoint | undefined => {
  const first = points[0];
  const last = points[points.length - 1];

  if (!first || !last) {
    return undefined;
  }

  const index = bisectTimestamp(points, timestamp);

  if (index <= 0) {
    return first;
  }

  if (index >= points.length) {
    return last;
  }

  const before = points[index - 1] ?? first;
  const after = points[index] ?? last;

  return timestamp - before.timestamp <= after.timestamp - timestamp
    ? before
    : after;
};

/** Mantém um domínio dentro dos limites do domínio completo. */
export const clampDomain = (
  domain: NumericDomain,
  fullDomain: NumericDomain,
): NumericDomain => {
  const span = domain[1] - domain[0];
  const fullSpan = fullDomain[1] - fullDomain[0];

  if (fullSpan <= 0 || span >= fullSpan || span <= 0) {
    return [...fullDomain];
  }

  const start = Math.min(
    Math.max(domain[0], fullDomain[0]),
    fullDomain[1] - span,
  );

  return [start, start + span];
};

/**
 * Converte uma transformação de zoom do `d3-zoom` no novo domínio do eixo.
 *
 * Equivalente ao `transform.rescaleX(scale)`, porém sem precisar da escala
 * real — o que permite testar a matemática isoladamente no jsdom.
 */
export const applyZoomToDomain = (
  fullDomain: NumericDomain,
  range: NumericDomain,
  transform: ZoomTransformState,
  axis: "x" | "y" = "x",
): NumericDomain => {
  const offset = axis === "x" ? transform.x : transform.y;
  const rangeSpan = range[1] - range[0];
  const fullSpan = fullDomain[1] - fullDomain[0];

  if (rangeSpan === 0 || fullSpan <= 0 || transform.k <= 0) {
    return [...fullDomain];
  }

  const span = fullSpan / transform.k;
  const start = fullDomain[0] - (offset / rangeSpan) * fullSpan;

  return clampDomain([start, start + span], fullDomain);
};