import type { Task } from "@/db/schema";

export type PriorityInput = Pick<
  Task,
  "impact" | "differentiation" | "complexity" | "risk" | "priorityOffset"
>;

export function calculateTaskPriority(input: PriorityInput) {
  const value = input.impact * 2 + input.differentiation * 2;
  const cost = input.complexity + input.risk;
  const offset =
    typeof input.priorityOffset === "number"
      ? input.priorityOffset
      : Number.parseFloat(input.priorityOffset ?? "0");
  const priority = value / cost + offset;

  return {
    value,
    cost,
    priority: Number(priority.toFixed(2))
  };
}
