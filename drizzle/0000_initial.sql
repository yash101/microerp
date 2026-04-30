CREATE TYPE task_status AS ENUM ('candidate', 'included', 'cut', 'later');

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description_markdown text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description_markdown text NOT NULL DEFAULT '',
  estimated_minutes integer NOT NULL DEFAULT 0,
  start_at timestamp with time zone,
  end_at timestamp with time zone,
  complexity integer NOT NULL,
  risk integer NOT NULL,
  impact integer NOT NULL,
  differentiation integer NOT NULL,
  priority_offset numeric(8, 2) NOT NULL DEFAULT 0,
  status task_status NOT NULL DEFAULT 'candidate',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tasks_complexity_range CHECK (complexity BETWEEN 1 AND 5),
  CONSTRAINT tasks_risk_range CHECK (risk BETWEEN 1 AND 5),
  CONSTRAINT tasks_impact_range CHECK (impact BETWEEN 1 AND 5),
  CONSTRAINT tasks_differentiation_range CHECK (differentiation BETWEEN 1 AND 5),
  CONSTRAINT tasks_estimated_minutes_nonnegative CHECK (estimated_minutes >= 0)
);

CREATE TABLE task_components (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, component_id)
);

CREATE INDEX components_project_id_idx ON components(project_id);
CREATE INDEX tasks_project_id_idx ON tasks(project_id);
CREATE INDEX tasks_status_idx ON tasks(status);
CREATE INDEX task_components_component_id_idx ON task_components(component_id);
