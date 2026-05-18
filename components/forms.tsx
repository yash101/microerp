import type {
  Component,
  Attachment,
  ConversationAttachment,
  ConversationMessage,
  ConversationPerson,
  Customer,
  Expense,
  ExpenseArtifact,
  ExpenseStatus,
  Project,
  Task,
  TaskStatus,
  TaxTreatment
} from "@/db/schema";
import {
  createComponentAction,
  createConversationMessageAction,
  createCustomerAction,
  createExpenseAction,
  createProjectAction,
  createTaskAction,
  updateConversationMessageAction,
  updateCustomerAction,
  updateExpenseAction,
  updateComponentAction,
  updateProjectAction,
  updateTaskAction
} from "@/lib/actions";
import {
  compactTextareaClass,
  Field,
  inputClass,
  markdownTextareaClass,
  SubmitButton,
  textareaClass
} from "@/components/ui";

const statuses: TaskStatus[] = ["candidate", "included", "complete", "cut", "later"];
const expenseStatuses: ExpenseStatus[] = ["draft", "submitted", "approved", "reimbursed", "rejected"];
const expenseCategories = ["General", "Travel", "Meals", "Software", "Supplies", "Services", "Equipment"];
const taxTreatments: { value: TaxTreatment; label: string }[] = [
  { value: "ordinary_expense", label: "Ordinary expense" },
  { value: "startup_cost", label: "Startup cost" },
  { value: "organizational_cost", label: "Organizational cost" },
  { value: "capital_asset", label: "Capital asset" },
  { value: "section_179", label: "Section 179" },
  { value: "bonus_depreciation", label: "Bonus depreciation" },
  { value: "home_office_allocation", label: "Home office allocation" },
  { value: "mixed_use", label: "Mixed use" },
  { value: "nondeductible", label: "Nondeductible" },
  { value: "review_needed", label: "Review needed" },
  { value: "other", label: "Other" }
];

function datetimeValue(value: Date | null) {
  if (!value) return "";
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function dateValue(value: Date | null) {
  if (!value) return "";
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function formatBytes(value: number | null) {
  if (value === null) return "unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function ProjectForm({ project }: { project?: Project }) {
  const action = project ? updateProjectAction.bind(null, project.id) : createProjectAction;
  return (
    <form action={action} className="grid gap-4">
      <Field label="Name">
        <input className={inputClass} name="name" required defaultValue={project?.name} />
      </Field>
      <Field label="Description">
        <textarea className={textareaClass} name="description" defaultValue={project?.description} />
      </Field>
      <SubmitButton>{project ? "Save project" : "Create project"}</SubmitButton>
    </form>
  );
}

export function ComponentForm({
  projectId,
  component
}: {
  projectId: string;
  component?: Component;
}) {
  const action = component
    ? updateComponentAction.bind(null, projectId, component.id)
    : createComponentAction.bind(null, projectId);
  return (
    <form action={action} className="grid gap-4">
      <Field label="Name">
        <input className={inputClass} name="name" required defaultValue={component?.name} />
      </Field>
      <Field label="Description markdown">
        <textarea
          className={textareaClass}
          name="descriptionMarkdown"
          defaultValue={component?.descriptionMarkdown}
        />
      </Field>
      <SubmitButton>{component ? "Save component" : "Add component"}</SubmitButton>
    </form>
  );
}

export function CustomerForm({ projectId, customer }: { projectId: string; customer?: Customer }) {
  const action = customer ? updateCustomerAction.bind(null, projectId, customer.id) : createCustomerAction.bind(null, projectId);
  return (
    <form action={action} className="grid gap-4">
      <Field label="Name">
        <input className={inputClass} name="name" required defaultValue={customer?.name} />
      </Field>
      <Field label="Description markdown">
        <textarea
          className={compactTextareaClass}
          name="descriptionMarkdown"
          defaultValue={customer?.descriptionMarkdown}
        />
      </Field>
      <SubmitButton>{customer ? "Save customer" : "Create customer"}</SubmitButton>
    </form>
  );
}

export function ConversationMessageForm({
  projectId,
  customerId,
  message
}: {
  projectId: string;
  customerId: string;
  message?: ConversationMessage & {
    people?: Pick<ConversationPerson, "id" | "name">[];
    attachments?: Array<
      Pick<ConversationAttachment, "id"> &
        Pick<Attachment, "kind" | "label" | "url" | "fileName" | "byteSize" | "contentType">
    >;
  };
}) {
  const action = message
    ? updateConversationMessageAction.bind(null, projectId, customerId, message.id)
    : createConversationMessageAction.bind(null, projectId, customerId);
  const linkAttachments = message?.attachments?.filter((attachment) => attachment.kind === "link") ?? [];

  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Title">
          <input className={inputClass} name="title" required defaultValue={message?.title} />
        </Field>
        <Field label="Who was present" hint="Separate names with commas or new lines. Existing names are reused.">
          <input
            className={inputClass}
            name="participantNames"
            defaultValue={message?.people?.map((person) => person.name).join(", ")}
            placeholder="Alex Carter, Priya Shah"
          />
        </Field>
      </div>

      <Field label="Short description">
        <textarea
          className={compactTextareaClass}
          name="shortDescription"
          maxLength={500}
          defaultValue={message?.shortDescription}
        />
      </Field>

      <Field label="Markdown body">
        <textarea className={markdownTextareaClass} name="bodyMarkdown" defaultValue={message?.bodyMarkdown} />
      </Field>

      {message?.attachments?.length ? (
        <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
          <legend className="px-1 text-sm font-semibold">Existing attachments</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {message.attachments.map((attachment) => (
              <label key={attachment.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="keepAttachmentIds" value={attachment.id} defaultChecked />
                <span>
                  Keep {attachment.label}
                  {attachment.kind === "upload" && attachment.byteSize ? ` (${formatBytes(attachment.byteSize)})` : ""}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Upload attachments" hint="Attach PDF, image, or document files up to 5 MB each.">
          <input className={inputClass} name="attachments" type="file" multiple />
        </Field>
        <div className="grid gap-4">
          <Field label="External attachment labels" hint="One label per line, matching the URL lines.">
            <textarea
              className={compactTextareaClass}
              name="attachmentLinkLabels"
              defaultValue={linkAttachments.map((attachment) => attachment.label).join("\n")}
            />
          </Field>
          <Field label="External attachment URLs" hint="One URL per line.">
            <textarea
              className={compactTextareaClass}
              name="attachmentLinkUrls"
              defaultValue={linkAttachments.map((attachment) => attachment.url ?? "").join("\n")}
            />
          </Field>
        </div>
      </div>

      <SubmitButton>{message ? "Save message" : "Add message"}</SubmitButton>
    </form>
  );
}

export function ExpenseForm({
  projectId,
  expense
}: {
  projectId: string;
  expense?: Expense & { artifacts?: Array<Pick<ExpenseArtifact, "id"> & Pick<Attachment, "fileName" | "byteSize">> };
}) {
  const action = expense
    ? updateExpenseAction.bind(null, projectId, expense.id)
    : createExpenseAction.bind(null, projectId);

  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Field label="Vendor">
          <input className={inputClass} name="vendor" required placeholder="Acme Supplies" defaultValue={expense?.vendor} />
        </Field>
        <Field label="Recipient">
          <input className={inputClass} name="recipient" required placeholder="Jamie Lee" defaultValue={expense?.recipient} />
        </Field>
        <Field label="Amount">
          <input
            className={inputClass}
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={expense?.amount}
          />
        </Field>
        <Field label="Business use %">
          <input
            className={inputClass}
            name="businessUsePercentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            required
            defaultValue={expense?.businessUsePercentage ?? "100"}
          />
        </Field>
        <Field label="Sales tax paid">
          <input
            className={inputClass}
            name="salesTaxPaid"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={expense?.salesTaxPaid ?? "0"}
          />
        </Field>
        <Field label="Spent date">
          <input className={inputClass} name="spentAt" type="date" required defaultValue={dateValue(expense?.spentAt ?? null)} />
        </Field>
        <Field label="Status">
          <select className={inputClass} name="status" defaultValue={expense?.status ?? "draft"} disabled={Boolean(expense)}>
            {expenseStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          {expense ? <input type="hidden" name="status" value={expense.status} /> : null}
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Category">
          <select className={inputClass} name="category" defaultValue={expense?.category ?? "General"}>
            {expenseCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Receipts" hint="Attach PDF, image, or document files up to 5 MB each.">
          <input className={inputClass} name="artifacts" type="file" multiple />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Tax treatment">
          <select className={inputClass} name="taxTreatment" defaultValue={expense?.taxTreatment ?? "review_needed"}>
            {taxTreatments.map((treatment) => (
              <option key={treatment.value} value={treatment.value}>
                {treatment.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tax Notes" hint="Required only when Tax treatment is Other. No tax math happens here.">
          <input
            className={inputClass}
            name="taxTreatmentOther"
            defaultValue={expense?.taxTreatmentOther}
            placeholder="Notes for custom or review-needed treatment"
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea className={textareaClass} name="notes" defaultValue={expense?.notes} />
      </Field>

      <SubmitButton>{expense ? "Save expense" : "Add expense"}</SubmitButton>
    </form>
  );
}

export function TaskForm({
  projectId,
  task,
  components,
  selectedComponentIds = []
}: {
  projectId: string;
  task?: Task;
  components: Component[];
  selectedComponentIds?: string[];
}) {
  const action = task
    ? updateTaskAction.bind(null, projectId, task.id)
    : createTaskAction.bind(null, projectId);

  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} name="name" required defaultValue={task?.name} />
        </Field>
        <Field label="Status">
          <select className={inputClass} name="status" defaultValue={task?.status ?? "candidate"}>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Description markdown">
        <textarea
          className={textareaClass}
          name="descriptionMarkdown"
          defaultValue={task?.descriptionMarkdown}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Estimated minutes">
          <input
            className={inputClass}
            name="estimatedMinutes"
            type="number"
            min="0"
            required
            defaultValue={task?.estimatedMinutes ?? 0}
          />
        </Field>
        <Field label="Priority offset">
          <input
            className={inputClass}
            name="priorityOffset"
            type="number"
            step="0.1"
            defaultValue={task?.priorityOffset ?? "0"}
          />
        </Field>
        <Field label="Start">
          <input className={inputClass} name="startAt" type="datetime-local" defaultValue={datetimeValue(task?.startAt ?? null)} />
        </Field>
        <Field label="End">
          <input className={inputClass} name="endAt" type="datetime-local" defaultValue={datetimeValue(task?.endAt ?? null)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["impact", "differentiation", "complexity", "risk"] as const).map((key) => (
          <Field key={key} label={key[0].toUpperCase() + key.slice(1)}>
            <input
              className={inputClass}
              name={key}
              type="number"
              min="1"
              max="5"
              required
              defaultValue={task?.[key] ?? 3}
            />
          </Field>
        ))}
      </div>

      <fieldset className="rounded-lg border border-ink/15 bg-white p-4">
        <legend className="px-1 text-sm font-semibold">Components</legend>
        {components.length === 0 ? (
          <p className="text-sm text-ink/60">Add components to tag the parts of the project this task touches.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {components.map((component) => (
              <label key={component.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="componentIds"
                  value={component.id}
                  defaultChecked={selectedComponentIds.includes(component.id)}
                />
                {component.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <SubmitButton>{task ? "Save task" : "Create task"}</SubmitButton>
    </form>
  );
}
