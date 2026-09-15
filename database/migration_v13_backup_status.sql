-- Migration v13: tambah 'backup' ke status users
-- update: status sebelumnya cuma ('active', 'inactive')
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'inactive', 'backup'));
