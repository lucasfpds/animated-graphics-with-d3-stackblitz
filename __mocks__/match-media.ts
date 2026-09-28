import { vi } from "vitest";

export type MatchMediaMock = {
  /** Troca o resultado da media query e notifica os inscritos. */
  setMatches: (matches: boolean) => void;
  listenerCount: () => number;
  restore: () => void;
};

type ChangeListener = (event: MediaQueryListEvent) => void;

/**
 * Substitui `window.matchMedia` por uma implementação controlável, com
 * `addEventListener` funcional (o jsdom não garante esse método).
 */
export const mockMatchMedia = (
  options: { matches?: boolean } = {},
): MatchMediaMock => {
  let matches = options.matches ?? false;
  const listeners = new Set<ChangeListener>();
  const originalMatchMedia = window.matchMedia;

  const implementation = (query: string): MediaQueryList =>
    ({
      get matches() {
        return matches;
      },
      media: query,
      onchange: null,
      addEventListener: (type: string, listener: ChangeListener): void => {
        if (type === "change") {
          listeners.add(listener);
        }
      },
      removeEventListener: (type: string, listener: ChangeListener): void => {
        if (type === "change") {
          listeners.delete(listener);
        }
      },
      addListener: (listener: ChangeListener): void => {
        listeners.add(listener);
      },
      removeListener: (listener: ChangeListener): void => {
        listeners.delete(listener);
      },
      dispatchEvent: (): boolean => false,
    }) as unknown as MediaQueryList;

  window.matchMedia = vi.fn(implementation);

  return {
    setMatches: (nextMatches) => {
      matches = nextMatches;
      listeners.forEach((listener) => {
        listener({ matches: nextMatches } as MediaQueryListEvent);
      });
    },
    listenerCount: () => listeners.size,
    restore: () => {
      window.matchMedia = originalMatchMedia;
    },
  };
};
