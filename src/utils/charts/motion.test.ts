import { describe, expect, it } from "vitest";

import {
  DEFAULT_TRANSITION_DURATION,
  resolveTransitionDuration,
} from "./motion";

describe("resolveTransitionDuration", () => {
  it("should keep the informed duration when motion is allowed", () => {
    expect(resolveTransitionDuration(DEFAULT_TRANSITION_DURATION, false)).toBe(
      DEFAULT_TRANSITION_DURATION,
    );
  });

  it("should return zero when the user prefers reduced motion", () => {
    expect(resolveTransitionDuration(DEFAULT_TRANSITION_DURATION, true)).toBe(0);
  });
});
