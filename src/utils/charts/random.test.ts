import { describe, expect, it } from "vitest";

import {
  mulberry32,
  pickOne,
  randomBetween,
  randomIntBetween,
} from "./random";

describe("mulberry32", () => {
  it("should return the same sequence for the same seed", () => {
    const first = mulberry32(42);
    const second = mulberry32(42);

    const firstSequence = [first(), first(), first(), first()];
    const secondSequence = [second(), second(), second(), second()];

    expect(firstSequence).toEqual(secondSequence);
  });

  it("should return different values for different seeds", () => {
    const first = mulberry32(1);
    const second = mulberry32(2);

    expect(first()).not.toBe(second());
  });

  it("should keep every value within [0, 1)", () => {
    const random = mulberry32(7);

    for (let index = 0; index < 200; index += 1) {
      const value = random();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("randomBetween", () => {
  it("should keep the value inside the informed interval", () => {
    const random = mulberry32(99);

    for (let index = 0; index < 100; index += 1) {
      const value = randomBetween(random, -5, 5);

      expect(value).toBeGreaterThanOrEqual(-5);
      expect(value).toBeLessThan(5);
    }
  });
});

describe("randomIntBetween", () => {
  it("should include both bounds", () => {
    const random = mulberry32(7);
    const values = Array.from({ length: 60 }, () =>
      randomIntBetween(random, 1, 3),
    );

    expect(Math.min(...values)).toBe(1);
    expect(Math.max(...values)).toBe(3);
  });
});

describe("pickOne", () => {
  it("should throw when the list is empty", () => {
    expect(() => pickOne(mulberry32(1), [] as readonly string[])).toThrow(
      /ao menos um item/,
    );
  });

  it("should return an item from the list", () => {
    const items = ["a", "b", "c"] as const;
    const random = mulberry32(3);

    for (let index = 0; index < 20; index += 1) {
      expect(items).toContain(pickOne(random, items));
    }
  });
});
