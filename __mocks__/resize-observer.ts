import { vi } from "vitest";

export type ResizeObserverMock = {
  /** Dispara o callback do observer com o tamanho informado. */
  trigger: (rect: { width: number; height: number }) => void;
  /** Quantos elementos estão sendo observados. */
  observedCount: () => number;
  restore: () => void;
};

/**
 * Substitui o `ResizeObserver` global (ausente no jsdom) por uma versão que o
 * teste controla — assim é possível simular a medição do container.
 */
export const installResizeObserverMock = (): ResizeObserverMock => {
  let callback: ResizeObserverCallback | null = null;
  let observed = 0;

  class MockResizeObserver implements ResizeObserver {
    constructor(observerCallback: ResizeObserverCallback) {
      callback = observerCallback;
    }

    observe(): void {
      observed += 1;
    }

    unobserve(): void {}

    disconnect(): void {
      observed = Math.max(observed - 1, 0);
    }
  }

  vi.stubGlobal("ResizeObserver", MockResizeObserver);

  return {
    trigger: (rect) => {
      callback?.(
        [{ contentRect: rect } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    },
    observedCount: () => observed,
    restore: () => {
      vi.unstubAllGlobals();
    },
  };
};
