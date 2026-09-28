import { onMounted, onScopeDispose, ref, type Ref } from "vue";

import type { ChartDimensions } from "@/types/charts";

export type UseChartDimensionsOptions = {
  /** Dimensões usadas antes da primeira medição. */
  fallback?: ChartDimensions;
};

export const DEFAULT_CHART_DIMENSIONS: ChartDimensions = {
  width: 720,
  height: 320,
};

export type UseChartDimensionsResult = {
  containerRef: Ref<HTMLElement | null>;
  dimensions: Ref<ChartDimensions>;
};

/**
 * Mede o container com `ResizeObserver`.
 *
 * Medições não positivas são ignoradas de propósito: o jsdom devolve `0` para
 * `clientWidth`/`clientHeight` e animações de layout no navegador podem
 * reportar caixas vazias — em ambos os casos o fallback é mais útil que um
 * gráfico de tamanho zero.
 */
export const useChartDimensions = (
  options: UseChartDimensionsOptions = {},
): UseChartDimensionsResult => {
  const { fallback = DEFAULT_CHART_DIMENSIONS } = options;
  const containerRef = ref<HTMLElement | null>(null);
  const dimensions = ref<ChartDimensions>(fallback);

  onMounted(() => {
    const element = containerRef.value;

    if (!element) {
      return;
    }

    const updateDimensions = (width: number, height: number): void => {
      if (width <= 0 || height <= 0) {
        return;
      }

      const current = dimensions.value;

      if (current.width === width && current.height === height) {
        return;
      }

      dimensions.value = { width, height };
    };

    updateDimensions(element.clientWidth, element.clientHeight);

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        updateDimensions(entry.contentRect.width, entry.contentRect.height);
      });
    });

    observer.observe(element);
    onScopeDispose(() => observer.disconnect());
  });

  return { containerRef, dimensions };
};
