const pg = require("pg");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const dbMatch = envFile.match(/DATABASE_URL=(.+)/);

const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  // Find Supriyati TL ID
  const tlRes = await client.query(`SELECT id FROM users WHERE role = 'tl' AND full_name ILIKE '%supriyati%' LIMIT 1`);
  const supriyatiId = tlRes.rows[0]?.id;

  // Find Bravo Swalayan Jateng Outlet ID
  const outletRes = await client.query(`SELECT id FROM outlets WHERE name ILIKE '%bravo%' LIMIT 1`);
  const bravoId = outletRes.rows[0]?.id;

  // Update HANA (NIP 21100) to Jateng (TL: Supriyati, Status: active)
  await client.query(
    `UPDATE users SET status = 'active', supervisor_id = $1, assigned_outlet_id = $2 WHERE nip = '21100' OR (full_name = 'HANA' AND nip != '19966')`,
    [supriyatiId, bravoId]
  );
  console.log("✓ Updated HANA (NIP 21100) as SPG under Supriyati at Bravo Swalayan Jateng.");

  // Ensure HANNA AFTINA LISTYANI (NIP 19966) is active at GUNASALMA 1 KAWALI
  const fahmiRes = await client.query(`SELECT id FROM users WHERE role = 'tl' AND full_name ILIKE '%fahmi%' LIMIT 1`);
  const kawaliRes = await client.query(`SELECT id FROM outlets WHERE name ILIKE '%kawali%' LIMIT 1`);

  await client.query(
    `UPDATE users SET status = 'active', supervisor_id = $1, assigned_outlet_id = $2 WHERE full_name ILIKE '%hanna aftina%'`,
    [fahmiRes.rows[0]?.id, kawaliRes.rows[0]?.id]
  );
  console.log("✓ Updated HANNA AFTINA LISTYANI (NIP 19966) as Active SPG under Fahmi at Gunasalma 1 Kawali.");

  await client.end();
})();
