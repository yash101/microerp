import { z } from "zod";
import { expenseStatusEnum, taskStatusEnum } from "@/db/schema";

const requiredText = z.string().trim().min(1, "Required");
const markdown = z.string().max(20000).default("");
const score = z.coerce.number().int().min(1).max(5);
const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? new Date(value) : null))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), "Invalid date");

export const projectSchema = z.object({
  name: requiredText,
  description: markdown
});

export const authSchema = z.object({
  username: requiredText
    .min(3, "Username must be at least 3 characters")
    .max(120, "Username is too long")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(12, "Password must be at least 12 characters").max(200),
  signupCode: z.string().min(1, "Signup code is required").optional()
});

export const componentSchema = z.object({
  name: requiredText,
  descriptionMarkdown: markdown
});

export const expenseSchema = z.object({
  vendor: requiredText,
  recipient: requiredText,
  category: requiredText.default("General"),
  amount: z.coerce.number().positive().max(9999999999.99),
  spentAt: optionalDate.refine((value) => value !== null, "Required"),
  status: z.enum(expenseStatusEnum.enumValues),
  notes: markdown
});

export const taskSchema = z
  .object({
    name: requiredText,
    descriptionMarkdown: markdown,
    estimatedMinutes: z.coerce.number().int().min(0),
    startAt: optionalDate,
    endAt: optionalDate,
    complexity: score,
    risk: score,
    impact: score,
    differentiation: score,
    priorityOffset: z.coerce.number().min(-99).max(99),
    status: z.enum(taskStatusEnum.enumValues),
    componentIds: z.array(z.string().uuid()).default([])
  })
  .refine((data) => !data.startAt || !data.endAt || data.endAt >= data.startAt, {
    message: "End must be after start",
    path: ["endAt"]
  });

export function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function parseTaskForm(formData: FormData) {
  return taskSchema.parse({
    name: formString(formData, "name"),
    descriptionMarkdown: formString(formData, "descriptionMarkdown"),
    estimatedMinutes: formString(formData, "estimatedMinutes"),
    startAt: formString(formData, "startAt"),
    endAt: formString(formData, "endAt"),
    complexity: formString(formData, "complexity"),
    risk: formString(formData, "risk"),
    impact: formString(formData, "impact"),
    differentiation: formString(formData, "differentiation"),
    priorityOffset: formString(formData, "priorityOffset"),
    status: formString(formData, "status"),
    componentIds: formData.getAll("componentIds")
  });
}

export function parseExpenseForm(formData: FormData) {
  return expenseSchema.parse({
    vendor: formString(formData, "vendor"),
    recipient: formString(formData, "recipient"),
    category: formString(formData, "category") || "General",
    amount: formString(formData, "amount"),
    spentAt: formString(formData, "spentAt"),
    status: formString(formData, "status") || "draft",
    notes: formString(formData, "notes")
  });
}
