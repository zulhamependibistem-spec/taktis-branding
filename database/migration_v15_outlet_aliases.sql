-- Migration v15: alias nama toko -> outlet untuk disambiguasi saat import user
-- Nama disimpan normalisasi (huruf besar, tanpa spasi/tanda baca) sebagai PK.
CREATE TABLE IF NOT EXISTS outlet_aliases (
  name text PRIMARY KEY,
  outlet_id uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_outlet_aliases_outlet ON outlet_aliases(outlet_id);