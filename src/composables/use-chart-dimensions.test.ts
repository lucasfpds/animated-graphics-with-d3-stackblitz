import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";

import {
  installResizeObserverMock,
  type ResizeObserverMock,
} from "../../__mocks__/resize-observer";
import { useChartDimensions } from "./use-chart-dimensions";

const FALLBACK = { width: 400, height: 200 };

let resizeObserver: ResizeObserverMock | undefined;

const mountHarness = (): VueWrapper => {
  return mount({
    setup() {
      return {
        ...useChartDimensions({ fallback: FALLBACK }),
      };
    },
    template: `<div
      ref="containerRef"
      data-testid="container"
      :data-width="dimensions.width"
      :data-height="dimensions.height"
    />`,
  });
};

const readDimensions = (
  wrapper: VueWrapper,
): { width: number; height: number } => {
  const container = wrapper.get('[data-testid="container"]');

  return {
    width: Number(container.attributes("data-width")),
    height: Number(container.attributes("data-height")),
  };
};

afterEach(() => {
  resizeObserver?.restore();
  resizeObserver = undefined;
});

describe("useChartDimensions", () => {
  it("should fall back to the provided dimensions before measuring", () => {
    resizeObserver = installResizeObserverMock();

    const wrapper = mountHarness();

    expect(readDimensions(wrapper)).toEqual(FALLBACK);
  });

  it("should observe the container element", () => {
    resizeObserver = installResizeObserverMock();

    mountHarness();

    expect(resizeObserver.observedCount()).toBe(1);
  });

  it("should update the dimensions when the container is resized", async () => {
    resizeObserver = installResizeObserverMock();
    const wrapper = mountHarness();

    resizeObserver.trigger({ width: 640, height: 320 });
    await nextTick();

    expect(readDimensions(wrapper)).toEqual({ width: 640, height: 320 });
  });

  it("should ignore non-positive measurements", async () => {
    resizeObserver = installResizeObserverMock();
    const wrapper = mountHarness();

    resizeObserver.trigger({ width: 0, height: 0 });
    await nextTick();

    expect(readDimensions(wrapper)).toEqual(FALLBACK);
  });
});
