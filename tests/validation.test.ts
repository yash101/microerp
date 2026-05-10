import { describe, expect, it } from "vitest";
import { expenseSchema, taskSchema } from "@/lib/validation";

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

  it("accepts complete as a task status", () => {
    expect(taskSchema.parse({ ...validTask, status: "complete" }).status).toBe("complete");
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

const validExpense = {
  vendor: "Acme Supplies",
  recipient: "Jamie Lee",
  category: "Supplies",
  amount: "42.50",
  spentAt: "2026-05-10",
  status: "draft",
  notes: ""
};

describe("expenseSchema", () => {
  it("requires a recipient", () => {
    expect(expenseSchema.parse(validExpense).recipient).toBe("Jamie Lee");
    expect(() => expenseSchema.parse({ ...validExpense, recipient: "" })).toThrow();
  });
});
