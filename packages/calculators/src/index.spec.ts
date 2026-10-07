import { describe, expect, it } from "vitest";
import { percentageOf } from "./index";

describe("percentageOf", () => {
  it("keeps integer money exact and rounds down by default", () => {
    expect(percentageOf(101n, 1500)).toBe(15n);
  });

  it("supports explicit ceiling and half-up rounding", () => {
    expect(percentageOf(101n, 1500, "up")).toBe(16n);
    expect(percentageOf(103n, 5000, "half-up")).toBe(52n);
  });

  it("rejects invalid amounts and rates", () => {
    expect(() => percentageOf(-1n, 1)).toThrow(RangeError);
    expect(() => percentageOf(10n, -1)).toThrow(RangeError);
  });
});
