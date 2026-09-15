-- monthly_planning: which outlets are planned to run each month (shared by all PIC + admin)
CREATE TABLE IF NOT EXISTS monthly_planning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,          -- 'YYYY-MM' e.g. '2026-09'
  outlet_id uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(month, outlet_id)
);

CREATE INDEX IF NOT EXISTS idx_planning_month ON monthly_planning(month);
