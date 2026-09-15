const pg = require("pg");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const dbMatch = envFile.match(/DATABASE_URL=(.+)/);

const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  const tlRes = await client.query(`SELECT id FROM users WHERE role = 'tl' AND full_name ILIKE '%supriyati%' LIMIT 1`);
  const supriyatiId = tlRes.rows[0]?.id;

  const outletRes = await client.query(`SELECT id FROM outlets WHERE name ILIKE '%bravo%' LIMIT 1`);
  const bravoId = outletRes.rows[0]?.id;

  await client.query(
    `UPDATE users SET status = 'active', supervisor_id = $1, assigned_outlet_id = $2 WHERE nip = '21050' OR full_name ILIKE '%hanna refa%'`,
    [supriyatiId, bravoId]
  );

  console.log("✓ Updated HANNA REFA AMALIA (NIP 21050) -> BRAVO SWALAYAN JATENG (TL: SUPRIYATI)");

  await client.end();
})();
