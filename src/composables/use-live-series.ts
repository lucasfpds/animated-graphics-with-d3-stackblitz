import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from "vue";

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
  dataset: Ref<ChartDataset>;
  isPlaying: Ref<boolean>;
  intervalMs: Ref<number>;
  tick: ComputedRef<number>;
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

  const seed = ref(initialSeed);
  const intervalMs = ref(Math.max(initialIntervalMs, MIN_INTERVAL_MS));
  const isPlaying = ref(enabled);
  const dataset = ref<ChartDataset>(buildDataset({ seed: initialSeed, size }));

  let timerId: ReturnType<typeof setInterval> | null = null;

  const stop = (): void => {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  };

  const start = (): void => {
    stop();

    if (!isPlaying.value) {
      return;
    }

    timerId = setInterval(() => {
      dataset.value = advanceDataset(dataset.value, { seed: seed.value, size });
    }, intervalMs.value);
  };

  watch([isPlaying, intervalMs, seed], start, { immediate: true, flush: "sync" });
  onScopeDispose(stop);

  const play = (): void => {
    isPlaying.value = true;
  };
  const pause = (): void => {
    isPlaying.value = false;
  };
  const toggle = (): void => {
    isPlaying.value = !isPlaying.value;
  };
  const step = (): void => {
    dataset.value = advanceDataset(dataset.value, { seed: seed.value, size });
  };
  const shuffle = (nextSeed?: number): void => {
    const resolvedSeed = nextSeed ?? seed.value + 1;

    seed.value = resolvedSeed;
    dataset.value = buildDataset({ seed: resolvedSeed, size });
  };
  const setIntervalMs = (value: number): void => {
    intervalMs.value = Math.max(value, MIN_INTERVAL_MS);
  };

  return {
    dataset,
    isPlaying,
    intervalMs,
    tick: computed(() => dataset.value.tick),
    play,
    pause,
    toggle,
    step,
    shuffle,
    setIntervalMs,
  };
};
