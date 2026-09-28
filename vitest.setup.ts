import { afterEach, vi } from "vitest";
import { enableAutoUnmount } from "@vue/test-utils";

/**
 * jsdom não implementa ResizeObserver, matchMedia nem
 * requestAnimationFrame de forma completa — os gráficos dependem dos três,
 * então os stubs ficam no setup global para todos os testes.
 */
class ResizeObserverStub implements ResizeObserver {
  observe(): void { }
  unobserve(): void { }
  disconnect(): void { }
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => { },
        removeEventListener: () => { },
        addListener: () => { },
        removeListener: () => { },
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}

if (typeof window !== "undefined" && !window.requestAnimationFrame) {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  );
  vi.stubGlobal("cancelAnimationFrame", (handle: number) =>
    clearTimeout(handle),
  );
}

// Desmonta automaticamente os wrappers do Vue Test Utils após cada teste.
enableAutoUnmount(afterEach);

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});
