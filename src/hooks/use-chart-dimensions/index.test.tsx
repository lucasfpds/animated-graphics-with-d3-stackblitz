import { act, render, screen } from "@testing-library/react";
import { type FC } from "react";
import { afterEach, describe, expect, it } from "vitest";

import {
  installResizeObserverMock,
  type ResizeObserverMock,
} from "../../../__mocks__/resize-observer";
import { useChartDimensions } from ".";

const FALLBACK = { width: 400, height: 200 };

let resizeObserver: ResizeObserverMock | undefined;

const Harness: FC = () => {
  const { containerRef, dimensions } = useChartDimensions<HTMLDivElement>({
    fallback: FALLBACK,
  });

  return (
    <div
      ref={containerRef}
      data-testid="container"
      data-width={dimensions.width}
      data-height={dimensions.height}
    />
  );
};

const readDimensions = (): { width: number; height: number } => {
  const container = screen.getByTestId("container");

  return {
    width: Number(container.dataset.width),
    height: Number(container.dataset.height),
  };
};

afterEach(() => {
  resizeObserver?.restore();
  resizeObserver = undefined;
});

describe("useChartDimensions", () => {
  it("should fall back to the provided dimensions before measuring", () => {
    resizeObserver = installResizeObserverMock();

    render(<Harness />);

    expect(readDimensions()).toEqual(FALLBACK);
  });

  it("should observe the container element", () => {
    resizeObserver = installResizeObserverMock();

    render(<Harness />);

    expect(resizeObserver.observedCount()).toBe(1);
  });

  it("should update the dimensions when the container is resized", () => {
    resizeObserver = installResizeObserverMock();
    render(<Harness />);

    act(() => {
      resizeObserver?.trigger({ width: 640, height: 320 });
    });

    expect(readDimensions()).toEqual({ width: 640, height: 320 });
  });

  it("should ignore non-positive measurements", () => {
    resizeObserver = installResizeObserverMock();
    render(<Harness />);

    act(() => {
      resizeObserver?.trigger({ width: 0, height: 0 });
    });

    expect(readDimensions()).toEqual(FALLBACK);
  });
});
