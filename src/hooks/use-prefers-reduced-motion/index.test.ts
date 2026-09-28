import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  mockMatchMedia,
  type MatchMediaMock,
} from "../../../__mocks__/match-media";
import { REDUCED_MOTION_QUERY, usePrefersReducedMotion } from ".";

let matchMedia: MatchMediaMock | undefined;

afterEach(() => {
  matchMedia?.restore();
  matchMedia = undefined;
});

describe("usePrefersReducedMotion", () => {
  it("should query the reduced motion media query", () => {
    matchMedia = mockMatchMedia({ matches: false });

    renderHook(() => usePrefersReducedMotion());

    expect(window.matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);
  });

  it("should return true when the user prefers reduced motion", () => {
    matchMedia = mockMatchMedia({ matches: true });

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
  });

  it("should react to changes in the media query", () => {
    matchMedia = mockMatchMedia({ matches: false });

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      matchMedia?.setMatches(true);
    });

    expect(result.current).toBe(true);
  });

  it("should unsubscribe from the media query on unmount", () => {
    matchMedia = mockMatchMedia({ matches: false });

    const { unmount } = renderHook(() => usePrefersReducedMotion());
    expect(matchMedia.listenerCount()).toBe(1);

    unmount();

    expect(matchMedia.listenerCount()).toBe(0);
  });
});
