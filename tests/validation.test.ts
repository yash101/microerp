import { describe, expect, it } from "vitest";
import { taskSchema } from "@/lib/validation";

const validTask = {
  name: "Ship dashboard",
  descriptionMarkdown: "Useful planning UI",
  estimatedMinutes: 120,
  startAt: "",
  endAt: "",
  complexity: 3,
  risk: 2,
  impact: 5,
  differentiation: 4,
  priorityOffset: 0,
  status: "candidate",
  componentIds: []
};

describe("taskSchema", () => {
  it("accepts a valid task payload", () => {
    expect(taskSchema.parse(validTask).name).toBe("Ship dashboard");
  });

  it("rejects score values outside 1-5", () => {
    expect(() => taskSchema.parse({ ...validTask, impact: 6 })).toThrow();
    expect(() => taskSchema.parse({ ...validTask, risk: 0 })).toThrow();
  });

  it("rejects an end date before a start date", () => {
    expect(() =>
      taskSchema.parse({
        ...validTask,
        startAt: "2026-05-02T10:00",
        endAt: "2026-05-01T10:00"
      })
    ).toThrow();
  });
});
