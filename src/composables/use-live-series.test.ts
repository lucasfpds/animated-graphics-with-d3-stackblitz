import { effectScope, type EffectScope } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_INTERVAL_MS,
  MIN_INTERVAL_MS,
  useLiveSeries,
  type UseLiveSeriesOptions,
  type UseLiveSeriesResult,
} from "./use-live-series";

type Harness = {
  result: UseLiveSeriesResult;
  stop: () => void;
};

const runComposable = (options?: UseLiveSeriesOptions): Harness => {
  const scope: EffectScope = effectScope();
  let result!: UseLiveSeriesResult;

  scope.run(() => {
    result = useLiveSeries(options);
  });

  return { result, stop: () => scope.stop() };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useLiveSeries", () => {
  it("should start paused at tick zero when disabled", () => {
    const { result } = runComposable({ enabled: false });

    expect(result.isPlaying.value).toBe(false);
    expect(result.tick.value).toBe(0);
  });

  it("should start playing with the default configuration", () => {
    const { result } = runComposable();

    expect(result.isPlaying.value).toBe(true);
    expect(result.intervalMs.value).toBe(DEFAULT_INTERVAL_MS);
  });

  it("should advance the dataset when the interval elapses", () => {
    const { result } = runComposable({ intervalMs: 1000 });

    vi.advanceTimersByTime(1000);

    expect(result.tick.value).toBe(1);
  });

  it("should clear the timer on unmount", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const { stop } = runComposable({ intervalMs: 1000 });

    stop();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    clearIntervalSpy.mockRestore();
  });

  it("should stop advancing when paused and resume when played", () => {
    const { result } = runComposable({ intervalMs: 1000 });

    result.pause();
    vi.advanceTimersByTime(3000);
    expect(result.tick.value).toBe(0);

    result.play();
    vi.advanceTimersByTime(1000);

    expect(result.tick.value).toBe(1);
  });

  it("should advance on demand with step", () => {
    const { result } = runComposable({ enabled: false });

    result.step();

    expect(result.tick.value).toBe(1);
    expect(result.isPlaying.value).toBe(false);
  });

  it("should clamp the interval to the minimum", () => {
    const { result } = runComposable({ intervalMs: 10 });

    expect(result.intervalMs.value).toBe(MIN_INTERVAL_MS);

    result.setIntervalMs(100);

    expect(result.intervalMs.value).toBe(MIN_INTERVAL_MS);
  });

  it("should generate a new history when shuffled", () => {
    const { result } = runComposable({ enabled: false });
    const before = result.dataset.value.timelines.users[0].value;

    result.shuffle(999);

    expect(result.tick.value).toBe(0);
    expect(result.dataset.value.timelines.users[0].value).not.toBe(before);
  });

  it("should toggle the playing state", () => {
    const { result } = runComposable({ intervalMs: 1000 });

    result.toggle();

    expect(result.isPlaying.value).toBe(false);
  });
});
