import { describe, expect, it } from "vitest";

import type { DataPoint } from "@/types/charts";
import lineSeries from "../../../__fixtures__/charts/line-series.json";
import {
  applyZoomToDomain,
  clampDomain,
  createArcPathFromGeometry,
  createArcTween,
  createAreaPath,
  createLineGenerator,
  createLinePath,
  createPathTween,
  findNearestPoint,
  getArcCentroid,
  toPathPoints,
  type ArcGeometry,
  type PathPoint,
} from "./geometry";

const points = lineSeries as DataPoint[];

const targetPoints: PathPoint[] = [
  { x: 0, y: 100 },
  { x: 50, y: 40 },
  { x: 100, y: 20 },
];

const halfCircle: ArcGeometry = {
  startAngle: 0,
  endAngle: Math.PI,
  padAngle: 0,
  outerRadius: 100,
};

describe("toPathPoints", () => {
  it("should convert data points into screen coordinates", () => {
    const single: DataPoint[] = [
      { id: "a", label: "a", value: 50, comparison: 0, timestamp: 100 },
    ];

    const converted = toPathPoints(
      single,
      (timestamp) => timestamp / 2,
      (value) => value * 2,
    );

    expect(converted).toEqual([{ x: 50, y: 100 }]);
  });
});

describe("createLinePath", () => {
  it("should return an empty string when there are no points", () => {
    expect(createLinePath([])).toBe("");
  });

  it("should build a path that starts with a move command", () => {
    expect(createLinePath(targetPoints)).toMatch(/^M/);
  });
});

describe("createAreaPath", () => {
  it("should build a non-empty area path", () => {
    expect(createAreaPath(targetPoints)).toMatch(/^M.+/);
  });
});

describe("createPathTween", () => {
  it("should start at the previous path and end at the target path", () => {
    const previous: PathPoint[] = [
      { x: 0, y: 10 },
      { x: 50, y: 10 },
      { x: 100, y: 10 },
    ];
    const tween = createPathTween(
      previous,
      createLineGenerator(),
    )(targetPoints);

    expect(tween(0)).toBe(createLinePath(previous));
    expect(tween(1)).toBe(createLinePath(targetPoints));
  });

  it("should interpolate the geometry between both paths", () => {
    const previous: PathPoint[] = [
      { x: 0, y: 200 },
      { x: 50, y: 200 },
      { x: 100, y: 200 },
    ];
    const tween = createPathTween(
      previous,
      createLineGenerator(),
    )(targetPoints);
    const middle = tween(0.5);

    expect(middle).not.toBe(createLinePath(previous));
    expect(middle).not.toBe(createLinePath(targetPoints));
  });
});

describe("createArcPathFromGeometry", () => {
  it("should build a path for the informed geometry", () => {
    expect(createArcPathFromGeometry(halfCircle, 0)).toMatch(/^M/);
  });

  it("should use the radius carried by the geometry", () => {
    const small = createArcPathFromGeometry(
      { ...halfCircle, outerRadius: 40 },
      0,
    );
    const large = createArcPathFromGeometry(halfCircle, 0);

    expect(small).not.toBe(large);
    expect(large).toContain("100");
  });
});

describe("getArcCentroid", () => {
  it("should place the centroid at the middle radius", () => {
    const [x, y] = getArcCentroid(halfCircle, 0);

    expect(x).toBeCloseTo(50, 6);
    expect(y).toBeCloseTo(0, 6);
  });

  it("should compute the centroid of a quarter slice", () => {
    const [x, y] = getArcCentroid(
      { startAngle: 0, endAngle: Math.PI / 2, padAngle: 0, outerRadius: 100 },
      0,
    );

    expect(x).toBeCloseTo(50 * Math.cos(-Math.PI / 4), 6);
    expect(y).toBeCloseTo(50 * Math.sin(-Math.PI / 4), 6);
  });
});

describe("createArcTween", () => {
  it("should start at the previous geometry and end at the target geometry", () => {
    const previous: ArcGeometry = { ...halfCircle, outerRadius: 60 };
    const tween = createArcTween(previous, 0)(halfCircle);

    expect(tween(0)).toBe(createArcPathFromGeometry(previous, 0));
    expect(tween(1)).toBe(createArcPathFromGeometry(halfCircle, 0));
  });

  it("should interpolate the radius while the slice expands", () => {
    const expanded: ArcGeometry = { ...halfCircle, outerRadius: 120 };
    const tween = createArcTween(halfCircle, 0)(expanded);

    expect(tween(0.5)).toContain("110");
  });
});

describe("findNearestPoint", () => {
  it("should return undefined for an empty series", () => {
    expect(findNearestPoint([], 10)).toBeUndefined();
  });

  it("should return the closest point by timestamp", () => {
    const reference = points[2];
    const nearest = findNearestPoint(points, reference.timestamp + 60_000);

    expect(nearest?.id).toBe(reference.id);
  });

  it("should clamp to the first point when the timestamp is earlier", () => {
    expect(findNearestPoint(points, 0)?.id).toBe(points[0].id);
  });

  it("should clamp to the last point when the timestamp is later", () => {
    const last = points[points.length - 1];
    const nearest = findNearestPoint(points, last.timestamp + 10_000_000);

    expect(nearest?.id).toBe(last.id);
  });
});

describe("clampDomain", () => {
  it("should keep a domain that is already inside the limits", () => {
    expect(clampDomain([20, 40], [0, 100])).toEqual([20, 40]);
  });

  it("should push the domain back inside when it goes past the end", () => {
    expect(clampDomain([80, 120], [0, 100])).toEqual([60, 100]);
  });

  it("should return the full domain when the requested span is larger", () => {
    expect(clampDomain([-50, 150], [0, 100])).toEqual([0, 100]);
  });
});

describe("applyZoomToDomain", () => {
  it("should keep the domain untouched without zoom", () => {
    expect(applyZoomToDomain([0, 100], [0, 500], { k: 1, x: 0, y: 0 })).toEqual(
      [0, 100],
    );
  });

  it("should halve the visible span when zooming in twice", () => {
    expect(applyZoomToDomain([0, 100], [0, 500], { k: 2, x: 0, y: 0 })).toEqual(
      [0, 50],
    );
  });

  it("should shift the time window when the content is dragged", () => {
    expect(
      applyZoomToDomain([0, 100], [0, 500], { k: 2, x: -100, y: 0 }, "x"),
    ).toEqual([20, 70]);
  });

  it("should move the value window up when the content moves down", () => {
    const domain = applyZoomToDomain(
      [0, 1000],
      [200, 0],
      { k: 2, x: 0, y: 50 },
      "y",
    );

    expect(domain).toEqual([250, 750]);
  });

  it("should return the full domain for a non-positive scale factor", () => {
    expect(applyZoomToDomain([0, 100], [0, 500], { k: 0, x: 10, y: 0 })).toEqual(
      [0, 100],
    );
  });
});
