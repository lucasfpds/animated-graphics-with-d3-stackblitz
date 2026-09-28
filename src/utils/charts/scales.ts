/**
 * Escalas e medidas compartilhadas pelos gráficos. Concentra a matemática de
 * domínio/intervalo para que os componentes só montem os elementos SVG.
 */

import { extent, max } from "d3-array";
import {
  scaleBand,
  scaleLinear,
  scaleTime,
  type ScaleBand,
  type ScaleLinear,
  type ScaleTime,
} from "d3-scale";

import type { DataPoint, NumericDomain } from "@/types/charts";

export type ChartMargin = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const DEFAULT_MARGIN: ChartMargin = {
  top: 20,
  right: 24,
  bottom: 40,
  left: 60,
};

export type ChartLayout = {
  width: number;
  height: number;
  margin: ChartMargin;
};

export type InnerSize = {
  width: number;
  height: number;
};

/** Área útil do gráfico (desconta as margens dos eixos). */
export const getInnerSize = ({
  width,
  height,
  margin,
}: ChartLayout): InnerSize => ({
  width: Math.max(width - margin.left - margin.right, 0),
  height: Math.max(height - margin.top - margin.bottom, 0),
});

/** Escala de categorias (gráfico de barras). */
export const createBandScale = (
  labels: readonly string[],
  range: NumericDomain,
): ScaleBand<string> =>
  scaleBand<string>()
    .domain([...labels])
    .range(range)
    .paddingInner(0.28)
    .paddingOuter(0.14);

/** Escala de valores com domínio iniciado em zero e topo arredondado. */
export const createValueScale = (
  values: readonly number[],
  range: NumericDomain,
  paddingRatio = 0.1,
): ScaleLinear<number, number> => {
  const highest = max(values) ?? 1;
  const top = highest <= 0 ? 1 : Math.ceil(highest * (1 + paddingRatio) * 100) / 100;

  return scaleLinear<number, number>().domain([0, top]).range(range);
};

/** Escala temporal (gráfico de linhas). */
export const createTimeScale = (
  points: readonly DataPoint[],
  range: NumericDomain,
): ScaleTime<number, number> => {
  const [first, last] = extent(points, (point) => point.timestamp);
  const domain: NumericDomain =
    first === undefined || last === undefined || first === last
      ? [
          points[0]?.timestamp ?? 0,
          (points[0]?.timestamp ?? 0) + 24 * 60 * 60 * 1000,
        ]
      : [first, last];

  return scaleTime<number, number>().domain(domain).range(range);
};

/** Domínio de valores de uma lista de pontos. */
export const getValueDomain = (
  points: readonly DataPoint[],
): NumericDomain => {
  const [first = 0, last = 1] = extent(points, (point) => point.value);

  return first === last ? [0, Math.max(first, 1)] : [first, last];
};

/** Domínio completo do eixo temporal (usado para limitar o zoom). */
export const getTimeDomain = (
  points: readonly DataPoint[],
): NumericDomain => {
  const [first = 0, last = 1] = extent(points, (point) => point.timestamp);

  return [first, last];
};

/**
 * Escala temporal a partir de um domínio já calculado (o zoom informa o
 * domínio; a escala apenas o materializa).
 */
export const createTimeScaleFromDomain = (
  domain: NumericDomain,
  range: NumericDomain,
): ScaleTime<number, number> =>
  scaleTime<number, number>().domain(domain).range(range);

/** Escala linear a partir de um domínio já calculado. */
export const createLinearScaleFromDomain = (
  domain: NumericDomain,
  range: NumericDomain,
): ScaleLinear<number, number> =>
  scaleLinear<number, number>().domain(domain).range(range);

/**
 * Domínio de valores ancorado em zero, considerando também a série de
 * comparação — gráficos de linha não devem truncar a base.
 */
export const getZeroBasedValueDomain = (
  points: readonly DataPoint[],
): NumericDomain => {
  const highest =
    max(points, (point) => Math.max(point.value, point.comparison)) ?? 0;

  return [0, highest <= 0 ? 1 : highest];
};
