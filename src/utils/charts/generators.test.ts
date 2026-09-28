import { describe, expect, it } from "vitest";

import type { DataPoint } from "@/types/charts";
import lineSeries from "../../../__fixtures__/charts/line-series.json";
import {
  DEFAULT_SEED,
  DEFAULT_START_TIMESTAMP,
  STAGE_LABELS,
  STEP_MS,
  WINDOW_SIZE,
  advanceDataset,
  buildDataset,
  getSeriesAverage,
  getSeriesLatest,
  getSeriesTotal,
  getSeriesTrend,
} from "./generators";

const fixture = lineSeries as DataPoint[];

describe("buildDataset", () => {
  it("should build the same dataset for the same seed and tick", () => {
    expect(buildDataset({ seed: 1, tick: 3 })).toEqual(
      buildDataset({ seed: 1, tick: 3 }),
    );
  });

  it("should build different timelines for different ticks", () => {
    const first = buildDataset({ seed: 1, tick: 0 });
    const second = buildDataset({ seed: 1, tick: 1 });

    expect(first.timelines.revenue).not.toEqual(second.timelines.revenue);
  });

  it("should keep the sliding window size on every metric", () => {
    const dataset = buildDataset({ seed: DEFAULT_SEED });

    Object.values(dataset.timelines).forEach((timeline) => {
      expect(timeline).toHaveLength(WINDOW_SIZE);
    });
  });

  it("should produce only positive finite values", () => {
    const dataset = buildDataset({ size: 8 });

    Object.values(dataset.timelines).forEach((timeline) => {
      timeline.forEach((point) => {
        expect(Number.isFinite(point.value)).toBe(true);
        expect(Number.isFinite(point.comparison)).toBe(true);
        expect(point.value).toBeGreaterThan(0);
      });
    });
  });

  it("should build one stage per funnel step for every metric", () => {
    const dataset = buildDataset({});

    Object.values(dataset.stages).forEach((stages) => {
      expect(stages.map((stage) => stage.label)).toEqual([...STAGE_LABELS]);
    });
  });

  it("should step the timestamps by the configured interval", () => {
    const timeline = buildDataset({ size: 2 }).timelines.users;
    const [first, second] = timeline;

    expect(first.timestamp).toBe(DEFAULT_START_TIMESTAMP);
    expect(second.timestamp - first.timestamp).toBe(STEP_MS);
  });

  it("should aggregate the pie distribution from the timelines", () => {
    const dataset = buildDataset({ seed: DEFAULT_SEED });

    expect(dataset.distribution).toHaveLength(3);
    dataset.distribution.forEach((slice) => {
      expect(slice.value).toBe(
        Math.round(getSeriesTotal(dataset.timelines[slice.series])),
      );
    });
  });
});

describe("advanceDataset", () => {
  it("should increment the tick", () => {
    const dataset = buildDataset({ seed: 5 });

    expect(advanceDataset(dataset).tick).toBe(dataset.tick + 1);
  });

  it("should slide the window, dropping the oldest point", () => {
    const dataset = buildDataset({ seed: 5, tick: 0 });
    const advanced = advanceDataset(dataset);

    expect(advanced.timelines.users).toHaveLength(
      dataset.timelines.users.length,
    );
    expect(advanced.timelines.users[0].timestamp).toBe(
      dataset.timelines.users[1].timestamp,
    );
  });
});

describe("getSeriesTotal", () => {
  it("should sum every value", () => {
    expect(getSeriesTotal(fixture)).toBe(7045);
  });

  it("should return zero for an empty series", () => {
    expect(getSeriesTotal([])).toBe(0);
  });
});

describe("getSeriesAverage", () => {
  it("should average the values", () => {
    expect(getSeriesAverage(fixture)).toBeCloseTo(7045 / 6, 6);
  });

  it("should return zero for an empty series", () => {
    expect(getSeriesAverage([])).toBe(0);
  });
});

describe("getSeriesLatest", () => {
  it("should return the last point of the window", () => {
    expect(getSeriesLatest(fixture)?.value).toBe(1680);
  });

  it("should return undefined for an empty series", () => {
    expect(getSeriesLatest([])).toBeUndefined();
  });
});

describe("getSeriesTrend", () => {
  it("should compare the last value with the first one", () => {
    expect(getSeriesTrend(fixture)).toBeCloseTo((1680 - 820) / 820, 6);
  });

  it("should return zero when the first value is zero", () => {
    const points: DataPoint[] = [
      { id: "a", label: "a", value: 0, comparison: 0, timestamp: 1 },
      { id: "b", label: "b", value: 10, comparison: 10, timestamp: 2 },
    ];

    expect(getSeriesTrend(points)).toBe(0);
  });
});
