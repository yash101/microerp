import { describe, expect, it } from "vitest";
import {
  conversationMessageSchema,
  customerSchema,
  expenseSchema,
  parseConversationParticipantNames,
  taskSchema
} from "@/lib/validation";

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

describe("customerSchema", () => {
  it("requires a customer name", () => {
    expect(customerSchema.parse({ name: "Acme Co", descriptionMarkdown: "" }).name).toBe("Acme Co");
    expect(() => customerSchema.parse({ name: "", descriptionMarkdown: "" })).toThrow();
  });
});

describe("conversationMessageSchema", () => {
  const validMessage = {
    title: "Intro call",
    shortDescription: "Talked through onboarding.",
    bodyMarkdown: "## Notes",
    participantNames: ["Alex Carter"],
    attachmentLinks: [{ label: "Proposal", url: "https://example.com/proposal.pdf" }],
    keepAttachmentIds: []
  };

  it("accepts a valid conversation message", () => {
    expect(conversationMessageSchema.parse(validMessage).title).toBe("Intro call");
  });

  it("rejects invalid attachment URLs", () => {
    expect(() =>
      conversationMessageSchema.parse({
        ...validMessage,
        attachmentLinks: [{ label: "Broken", url: "not a url" }]
      })
    ).toThrow();
  });

  it("limits plaintext short descriptions", () => {
    expect(() =>
      conversationMessageSchema.parse({
        ...validMessage,
        shortDescription: "x".repeat(501)
      })
    ).toThrow();
  });

  it("trims and de-duplicates participant names", () => {
    expect(parseConversationParticipantNames(" Alex Carter, Priya Shah\nalex carter ")).toEqual([
      "Alex Carter",
      "Priya Shah"
    ]);
  });
});
