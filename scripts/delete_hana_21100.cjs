const pg = require("pg");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const dbMatch = envFile.match(/DATABASE_URL=(.+)/);

const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  // Delete user HANA (NIP 21100)
  const delRes = await client.query(`DELETE FROM users WHERE nip = '21100' OR full_name = 'HANA' RETURNING *`);
  if (delRes.rows.length > 0) {
    console.log(`✓ DELETED USER: HANA (NIP 21100)`);
  } else {
    console.log("No user HANA NIP 21100 found to delete.");
  }

  // Inspect HANNA REFA AMALIA
  const refaRes = await client.query(`
    SELECT u.id, u.full_name, u.nip, u.assigned_outlet_id, u.supervisor_id, o.name as outlet_name, sup.full_name as supervisor_name
    FROM users u
    LEFT JOIN outlets o ON u.assigned_outlet_id = o.id
    LEFT JOIN users sup ON u.supervisor_id = sup.id
    WHERE u.full_name ILIKE '%hanna refa%'
  `);
  console.log("CURRENT HANNA REFA AMALIA RECORD:", refaRes.rows);

  await client.end();
})();
