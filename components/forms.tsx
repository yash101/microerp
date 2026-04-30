import type { Component, Project, Task, TaskStatus } from "@/db/schema";
import {
  createComponentAction,
  createProjectAction,
  createTaskAction,
  updateComponentAction,
  updateProjectAction,
  updateTaskAction
} from "@/lib/actions";
import { Field, inputClass, SubmitButton, textareaClass } from "@/components/ui";

const statuses: TaskStatus[] = ["candidate", "included", "cut", "later"];

function datetimeValue(value: Date | null) {
  if (!value) return "";
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
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
