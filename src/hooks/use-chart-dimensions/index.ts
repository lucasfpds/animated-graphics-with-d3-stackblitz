"use client";

import { useEffect, useRef, useState } from "react";

import type { ChartDimensions } from "@/types/charts";

export type UseChartDimensionsOptions = {
  /** Dimensões usadas antes da primeira medição (protege a hidratação). */
  fallback?: ChartDimensions;
};

export const DEFAULT_CHART_DIMENSIONS: ChartDimensions = {
  width: 720,
  height: 320,
};

export type UseChartDimensionsResult<TElement extends HTMLElement> = {
  containerRef: React.RefObject<TElement | null>;
  dimensions: ChartDimensions;
};

/**
 * Mede o container com `ResizeObserver`.
 *
 * Medições não positivas são ignoradas de propósito: o jsdom devolve `0` para
 * `clientWidth`/`clientHeight` e animações de layout no navegador podem
 * reportar caixas vazias — em ambos os casos o fallback é mais útil que um
 * gráfico de tamanho zero.
 */
export const useChartDimensions = <TElement extends HTMLElement>(
  options: UseChartDimensionsOptions = {},
): UseChartDimensionsResult<TElement> => {
  const { fallback = DEFAULT_CHART_DIMENSIONS } = options;
  const containerRef = useRef<TElement | null>(null);
  const [dimensions, setDimensions] = useState<ChartDimensions>(fallback);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return undefined;
    }

    const updateDimensions = (width: number, height: number): void => {
      if (width <= 0 || height <= 0) {
        return;
      }

      setDimensions((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };

    updateDimensions(element.clientWidth, element.clientHeight);

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        updateDimensions(entry.contentRect.width, entry.contentRect.height);
      });
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { containerRef, dimensions };
};
