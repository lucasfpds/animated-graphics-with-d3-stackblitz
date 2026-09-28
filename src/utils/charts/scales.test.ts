import { describe, expect, it } from "vitest";

import type { DataPoint } from "@/types/charts";
import lineSeries from "../../../__fixtures__/charts/line-series.json";
import {
  DEFAULT_MARGIN,
  createBandScale,
  createLinearScaleFromDomain,
  createTimeScale,
  createTimeScaleFromDomain,
  createValueScale,
  getInnerSize,
  getTimeDomain,
  getValueDomain,
  getZeroBasedValueDomain,
} from "./scales";

const points = lineSeries as DataPoint[];

describe("getInnerSize", () => {
  it("should discount the margins", () => {
    const size = getInnerSize({
      width: 720,
      height: 320,
      margin: { top: 10, right: 20, bottom: 30, left: 40 },
    });

    expect(size).toEqual({ width: 660, height: 280 });
  });

  it("should never return negative sizes", () => {
    const size = getInnerSize({ width: 10, height: 10, margin: DEFAULT_MARGIN });

    expect(size).toEqual({ width: 0, height: 0 });
  });
});

describe("createBandScale", () => {
  it("should place every label inside the range", () => {
    const scale = createBandScale(["a", "b", "c"], [0, 300]);

    ["a", "b", "c"].forEach((label) => {
      const position = scale(label) ?? -1;

      expect(position).toBeGreaterThanOrEqual(0);
      expect(position + scale.bandwidth()).toBeLessThanOrEqual(300);
    });
  });

  it("should spread the labels in distinct positions", () => {
    const scale = createBandScale(["a", "b", "c"], [0, 300]);

    expect(scale("a")).toBeLessThan(scale("b") ?? 0);
    expect(scale("b")).toBeLessThan(scale("c") ?? 0);
  });
});

describe("createValueScale", () => {
  it("should always start at zero and round the top up", () => {
    const scale = createValueScale([100, 420], [200, 0]);

    expect(scale.domain()[0]).toBe(0);
    expect(scale.domain()[1]).toBeGreaterThan(420);
  });

  it("should map zero to the bottom of the range", () => {
    const scale = createValueScale([10, 90], [200, 0]);

    expect(scale(0)).toBe(200);
  });
});

describe("getValueDomain", () => {
  it("should return the extent of the values", () => {
    expect(getValueDomain(points)).toEqual([820, 1680]);
  });

  it("should fall back to a valid domain for a single value", () => {
    const single: DataPoint[] = [
      { id: "a", label: "a", value: 5, comparison: 4, timestamp: 1 },
    ];

    expect(getValueDomain(single)).toEqual([0, 5]);
  });
});

describe("getTimeDomain", () => {
  it("should return the extent of the timestamps", () => {
    expect(getTimeDomain(points)).toEqual([1767225600000, 1767333600000]);
  });
});

describe("getZeroBasedValueDomain", () => {
  it("should always start at zero", () => {
    expect(getZeroBasedValueDomain(points)).toEqual([0, 1680]);
  });

  it("should consider the comparison values as well", () => {
    const values: DataPoint[] = [
      { id: "a", label: "a", value: 10, comparison: 40, timestamp: 1 },
    ];

    expect(getZeroBasedValueDomain(values)).toEqual([0, 40]);
  });
});

describe("createTimeScale", () => {
  it("should map the extremes of the domain to the extremes of the range", () => {
    const scale = createTimeScale(points, [0, 600]);

    expect(scale(1767225600000)).toBe(0);
    expect(scale(1767333600000)).toBe(600);
  });

  it("should fall back to a one-day window for a single point", () => {
    const single: DataPoint[] = [
      { id: "a", label: "a", value: 1, comparison: 1, timestamp: 1000 },
    ];

    const scale = createTimeScale(single, [0, 100]);
    // O d3-scale devolve `Date` em tempo de execução; `new Date(valor)`
    // normaliza tanto `Date` quanto número.
    const domain = scale.domain().map((value) => new Date(value).getTime());

    expect(domain).toEqual([1000, 1000 + 24 * 60 * 60 * 1000]);
  });

  it("should fall back to a valid window when there is no point at all", () => {
    const scale = createTimeScale([], [0, 100]);
    const [first, last] = scale.domain();

    expect(new Date(last).getTime()).toBeGreaterThan(new Date(first).getTime());
  });
});

describe("createTimeScaleFromDomain", () => {
  it("should respect an explicitly informed domain", () => {
    const scale = createTimeScaleFromDomain([0, 10], [0, 100]);

    expect(scale(5)).toBe(50);
  });
});

describe("createLinearScaleFromDomain", () => {
  it("should build a linear scale from the domain", () => {
    const scale = createLinearScaleFromDomain([0, 100], [300, 0]);

    expect(scale(50)).toBe(150);
  });
});
