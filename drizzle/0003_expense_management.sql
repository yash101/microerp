CREATE TYPE expense_status AS ENUM ('draft', 'submitted', 'approved', 'reimbursed', 'rejected');

CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vendor text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  amount numeric(12, 2) NOT NULL,
  spent_at timestamp with time zone NOT NULL,
  status expense_status NOT NULL DEFAULT 'draft',
  notes text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE expense_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  content_type text NOT NULL,
  byte_size integer NOT NULL,
  data_base64 text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX expenses_project_id_idx ON expenses(project_id);
CREATE INDEX expenses_status_idx ON expenses(status);
CREATE INDEX expenses_spent_at_idx ON expenses(spent_at);
CREATE INDEX expense_artifacts_expense_id_idx ON expense_artifacts(expense_id);
