import { describe, expect, it } from "vitest";
import { calculateTaskPriority } from "@/lib/priority";

describe("calculateTaskPriority", () => {
  it("calculates value, cost, and priority with offset", () => {
    expect(
      calculateTaskPriority({
        impact: 5,
        differentiation: 4,
        complexity: 3,
        risk: 2,
        priorityOffset: "0.5"
      })
    ).toEqual({
      value: 18,
      cost: 5,
      priority: 4.1
    });
  });

  it("rounds priority to two decimals", () => {
    expect(
      calculateTaskPriority({
        impact: 5,
        differentiation: 5,
        complexity: 4,
        risk: 3,
        priorityOffset: "0"
      }).priority
    ).toBe(2.86);
  });
});
