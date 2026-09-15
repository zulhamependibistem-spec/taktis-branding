-- Migration v14: user boleh dihapus walau pernah bikin monthly_planning
-- created_by sebelumnya RESTRICT (tanpa ON DELETE) -> blokir delete user.
ALTER TABLE monthly_planning DROP CONSTRAINT IF EXISTS monthly_planning_created_by_fkey;
ALTER TABLE monthly_planning
  ADD CONSTRAINT monthly_planning_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;