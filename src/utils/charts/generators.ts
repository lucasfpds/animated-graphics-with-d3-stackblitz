/**
 * Geradores determinísticos dos dados do dashboard.
 *
 * Toda série nasce de uma seed fixa: a mesma seed + o mesmo tick produzem
 * exatamente os mesmos pontos, o que mantém SSR, cliente e testes alinhados.
 */

import { sum } from "d3-array";

import type { ChartDataset, DataPoint, PieDatum, SeriesKey } from "@/types/charts";
import { formatShortDate } from "./format";
import { mulberry32, randomBetween, type RandomSource } from "./random";
import { SERIES_KEYS, getSeriesMeta } from "./series";

export const DEFAULT_SEED = 20260927;
/** Quantidade de pontos mantidos na janela deslizante do gráfico de linhas. */
export const WINDOW_SIZE = 14;
export const DEFAULT_START_TIMESTAMP = Date.UTC(2026, 0, 1, 8, 0, 0);
/** Cada tick do feed representa 6 horas. */
export const STEP_MS = 6 * 60 * 60 * 1000;

/** Etapas do funil exibidas no gráfico de barras. */
export const STAGE_LABELS = [
  "Visitantes",
  "Cadastros",
  "Qualificados",
  "Propostas",
  "Negociação",
  "Fechamento",
] as const;

export type StageLabel = (typeof STAGE_LABELS)[number];

type SeriesConfig = {
  min: number;
  max: number;
  amplitude: number;
  trend: number;
  seedOffset: number;
};

const SERIES_CONFIG: Record<SeriesKey, SeriesConfig> = {
  revenue: { min: 18000, max: 96000, amplitude: 4200, trend: 0.34, seedOffset: 11 },
  users: { min: 900, max: 6400, amplitude: 260, trend: 0.22, seedOffset: 29 },
  conversions: { min: 120, max: 1180, amplitude: 62, trend: 0.18, seedOffset: 47 },
};

export type BuildDatasetOptions = {
  seed?: number;
  /** Tick do feed (0 = carga inicial). */
  tick?: number;
  /** Tamanho da janela do gráfico de linhas. */
  size?: number;
  startTimestamp?: number;
  stepMs?: number;
};

type ResolvedOptions = Required<BuildDatasetOptions>;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const createRandom = (
  seed: number,
  tick: number,
  offset: number,
): RandomSource => mulberry32(seed + tick * 137 + offset);

const resolveOptions = (options: BuildDatasetOptions): ResolvedOptions => ({
  seed: options.seed ?? DEFAULT_SEED,
  tick: options.tick ?? 0,
  size: options.size ?? WINDOW_SIZE,
  startTimestamp: options.startTimestamp ?? DEFAULT_START_TIMESTAMP,
  stepMs: options.stepMs ?? STEP_MS,
});

const buildTimeline = (
  series: SeriesKey,
  options: ResolvedOptions,
): DataPoint[] => {
  const config = SERIES_CONFIG[series];
  const random = createRandom(options.seed, options.tick, config.seedOffset);
  const startTimestamp =
    options.startTimestamp + options.tick * options.stepMs;
  const points: DataPoint[] = [];
  let previous = randomBetween(random, config.min, config.max * 0.6);

  for (let index = 0; index < options.size; index += 1) {
    const timestamp = startTimestamp + index * options.stepMs;
    const progress = options.size > 1 ? index / (options.size - 1) : 0;
    const drift = config.trend * progress * (config.max - config.min) * 0.35;
    const value = clamp(
      previous +
        randomBetween(random, -config.amplitude, config.amplitude) +
        drift,
      config.min,
      config.max,
    );
    const comparison = clamp(
      value * (1 + randomBetween(random, -0.16, 0.08)),
      config.min,
      config.max,
    );

    previous = value;
    points.push({
      id: `${series}-${timestamp}`,
      label: formatShortDate(timestamp),
      value: Math.round(value),
      comparison: Math.round(comparison),
      timestamp,
    });
  }

  return points;
};

const buildStages = (
  series: SeriesKey,
  options: ResolvedOptions,
): DataPoint[] => {
  const config = SERIES_CONFIG[series];
  const random = createRandom(
    options.seed,
    options.tick,
    config.seedOffset + 100,
  );
  const stageBase = (config.min + config.max) / 2;
  const timestamp = options.startTimestamp + options.tick * options.stepMs;

  return STAGE_LABELS.map((label, index) => {
    const weight = 1 - index * 0.13;
    const value = Math.round(
      stageBase * weight * randomBetween(random, 0.82, 1.18),
    );
    const comparison = Math.round(value * randomBetween(random, 0.86, 1.12));

    return {
      id: `${series}-${label}`,
      label,
      value,
      comparison,
      timestamp,
    };
  });
};

const buildDistribution = (
  timelines: Record<SeriesKey, DataPoint[]>,
): PieDatum[] =>
  SERIES_KEYS.map((key) => ({
    id: `share-${key}`,
    label: getSeriesMeta(key).label,
    value: Math.round(getSeriesTotal(timelines[key])),
    series: key,
  }));

export const getSeriesTotal = (points: readonly DataPoint[]): number =>
  sum(points, (point) => point.value);

export const getSeriesAverage = (points: readonly DataPoint[]): number =>
  points.length === 0 ? 0 : getSeriesTotal(points) / points.length;

export const getSeriesLatest = (
  points: readonly DataPoint[],
): DataPoint | undefined => points[points.length - 1];

/** Variação relativa entre o último e o primeiro ponto da janela. */
export const getSeriesTrend = (points: readonly DataPoint[]): number => {
  const first = points[0];
  const last = getSeriesLatest(points);

  if (!first || !last || first.value === 0) {
    return 0;
  }

  return (last.value - first.value) / Math.abs(first.value);
};

/** Constrói o dataset completo para um tick qualquer do feed. */
export const buildDataset = (options: BuildDatasetOptions = {}): ChartDataset => {
  const resolved = resolveOptions(options);

  const timelines = SERIES_KEYS.reduce(
    (accumulator, key) => {
      accumulator[key] = buildTimeline(key, resolved);
      return accumulator;
    },
    {} as Record<SeriesKey, DataPoint[]>,
  );

  const stages = SERIES_KEYS.reduce(
    (accumulator, key) => {
      accumulator[key] = buildStages(key, resolved);
      return accumulator;
    },
    {} as Record<SeriesKey, DataPoint[]>,
  );

  return {
    tick: resolved.tick,
    generatedAt: resolved.startTimestamp + resolved.tick * resolved.stepMs,
    timelines,
    stages,
    distribution: buildDistribution(timelines),
  };
};

/** Avança o feed um passo, preservando o restante da configuração. */
export const advanceDataset = (
  dataset: ChartDataset,
  options: BuildDatasetOptions = {},
): ChartDataset => buildDataset({ ...options, tick: dataset.tick + 1 });
