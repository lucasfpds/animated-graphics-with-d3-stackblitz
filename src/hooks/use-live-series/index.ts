"use client";

import { useCallback, useEffect, useState } from "react";

import type { ChartDataset } from "@/types/charts";
import {
  DEFAULT_SEED,
  advanceDataset,
  buildDataset,
} from "@/utils/charts/generators";

/** Intervalo mínimo aceito — evita timers agressivos demais. */
export const MIN_INTERVAL_MS = 400;
export const DEFAULT_INTERVAL_MS = 2400;

export type UseLiveSeriesOptions = {
  /** Começa em execução? */
  enabled?: boolean;
  intervalMs?: number;
  seed?: number;
  size?: number;
};

export type UseLiveSeriesResult = {
  dataset: ChartDataset;
  isPlaying: boolean;
  intervalMs: number;
  tick: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Avança um ponto manualmente (com o feed pausado). */
  step: () => void;
  /** Troca a seed, gerando um histórico novo. */
  shuffle: (nextSeed?: number) => void;
  setIntervalMs: (value: number) => void;
};

/**
 * Feed de dados sintético: avança a janela a cada `intervalMs`, acumulando
 * ticks no dataset. Determinístico por seed — o mesmo tick sempre produz os
 * mesmos pontos, o que mantém os testes estáveis.
 */
export const useLiveSeries = (
  options: UseLiveSeriesOptions = {},
): UseLiveSeriesResult => {
  const {
    enabled = true,
    intervalMs: initialIntervalMs = DEFAULT_INTERVAL_MS,
    seed: initialSeed = DEFAULT_SEED,
    size,
  } = options;

  const [seed, setSeed] = useState(initialSeed);
  const [intervalMs, setIntervalMsState] = useState(
    Math.max(initialIntervalMs, MIN_INTERVAL_MS),
  );
  const [isPlaying, setIsPlaying] = useState(enabled);
  const [dataset, setDataset] = useState<ChartDataset>(() =>
    buildDataset({ seed: initialSeed, size }),
  );

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }

    const timerId = setInterval(() => {
      setDataset((current) => advanceDataset(current, { seed, size }));
    }, intervalMs);

    return () => {
      clearInterval(timerId);
    };
  }, [intervalMs, isPlaying, seed, size]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((current) => !current), []);
  const step = useCallback(
    () => setDataset((current) => advanceDataset(current, { seed, size })),
    [seed, size],
  );
  const shuffle = useCallback(
    (nextSeed?: number) => {
      const resolvedSeed = nextSeed ?? seed + 1;

      setSeed(resolvedSeed);
      setDataset(buildDataset({ seed: resolvedSeed, size }));
    },
    [seed, size],
  );
  const setIntervalMs = useCallback((value: number) => {
    setIntervalMsState(Math.max(value, MIN_INTERVAL_MS));
  }, []);

  return {
    dataset,
    isPlaying,
    intervalMs,
    tick: dataset.tick,
    play,
    pause,
    toggle,
    step,
    shuffle,
    setIntervalMs,
  };
};
