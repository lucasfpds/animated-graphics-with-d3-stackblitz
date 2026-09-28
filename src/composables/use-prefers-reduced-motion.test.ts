import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";

import {
  mockMatchMedia,
  type MatchMediaMock,
} from "../../__mocks__/match-media";
import {
  REDUCED_MOTION_QUERY,
  usePrefersReducedMotion,
} from "./use-prefers-reduced-motion";

let matchMedia: MatchMediaMock | undefined;

const mountHarness = (): VueWrapper =>
  mount({
    setup() {
      return { prefersReducedMotion: usePrefersReducedMotion() };
    },
    template: `<div :data-reduced="prefersReducedMotion" />`,
  });

const readReduced = (wrapper: VueWrapper): boolean =>
  wrapper.get("div").attributes("data-reduced") === "true";

afterEach(() => {
  matchMedia?.restore();
  matchMedia = undefined;
});

describe("usePrefersReducedMotion", () => {
  it("should query the reduced motion media query", () => {
    matchMedia = mockMatchMedia({ matches: false });

    mountHarness();

    expect(window.matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);
  });

  it("should return true when the user prefers reduced motion", async () => {
    matchMedia = mockMatchMedia({ matches: true });

    const wrapper = mountHarness();
    await nextTick();

    expect(readReduced(wrapper)).toBe(true);
  });

  it("should react to changes in the media query", async () => {
    matchMedia = mockMatchMedia({ matches: false });

    const wrapper = mountHarness();
    expect(readReduced(wrapper)).toBe(false);

    matchMedia.setMatches(true);
    await nextTick();

    expect(readReduced(wrapper)).toBe(true);
  });

  it("should unsubscribe from the media query on unmount", () => {
    matchMedia = mockMatchMedia({ matches: false });

    const wrapper = mountHarness();
    expect(matchMedia.listenerCount()).toBe(1);

    wrapper.unmount();

    expect(matchMedia.listenerCount()).toBe(0);
  });
});
