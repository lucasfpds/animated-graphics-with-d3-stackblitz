import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_INTERVAL_MS, MIN_INTERVAL_MS, useLiveSeries } from ".";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useLiveSeries", () => {
  it("should start paused at tick zero when disabled", () => {
    const { result } = renderHook(() => useLiveSeries({ enabled: false }));

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.tick).toBe(0);
  });

  it("should start playing with the default configuration", () => {
    const { result } = renderHook(() => useLiveSeries());

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.intervalMs).toBe(DEFAULT_INTERVAL_MS);
  });

  it("should advance the dataset when the interval elapses", () => {
    const { result } = renderHook(() => useLiveSeries({ intervalMs: 1000 }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.tick).toBe(1);
  });

  it("should clear the timer on unmount", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useLiveSeries({ intervalMs: 1000 }));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    clearIntervalSpy.mockRestore();
  });

  it("should stop advancing when paused and resume when played", () => {
    const { result } = renderHook(() => useLiveSeries({ intervalMs: 1000 }));

    act(() => {
      result.current.pause();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.tick).toBe(0);

    act(() => {
      result.current.play();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.tick).toBe(1);
  });

  it("should advance on demand with step", () => {
    const { result } = renderHook(() => useLiveSeries({ enabled: false }));

    act(() => {
      result.current.step();
    });

    expect(result.current.tick).toBe(1);
    expect(result.current.isPlaying).toBe(false);
  });

  it("should clamp the interval to the minimum", () => {
    const { result } = renderHook(() => useLiveSeries({ intervalMs: 10 }));

    expect(result.current.intervalMs).toBe(MIN_INTERVAL_MS);

    act(() => {
      result.current.setIntervalMs(100);
    });

    expect(result.current.intervalMs).toBe(MIN_INTERVAL_MS);
  });

  it("should generate a new history when shuffled", () => {
    const { result } = renderHook(() => useLiveSeries({ enabled: false }));
    const before = result.current.dataset.timelines.users[0].value;

    act(() => {
      result.current.shuffle(999);
    });

    expect(result.current.tick).toBe(0);
    expect(result.current.dataset.timelines.users[0].value).not.toBe(before);
  });

  it("should toggle the playing state", () => {
    const { result } = renderHook(() => useLiveSeries({ intervalMs: 1000 }));

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isPlaying).toBe(false);
  });
});
