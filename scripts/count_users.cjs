const pg = require("pg");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const dbMatch = envFile.match(/DATABASE_URL=(.+)/);

const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  const totalRes = await client.query(`
    SELECT role, status, COUNT(*) as count 
    FROM users 
    WHERE role IN ('spg', 'tl') 
    GROUP BY role, status 
    ORDER BY role, status
  `);
  console.log("=== USER COUNT BREAKDOWN (SPG & TL) ===");
  console.table(totalRes.rows);

  const backupRes = await client.query(`
    SELECT id, full_name, nip, role, status, assigned_outlet_id
    FROM users 
    WHERE role IN ('spg', 'tl') AND (status = 'backup' OR full_name ILIKE '%backup%')
  `);
  console.log("\n=== BACKUP USERS ===");
  console.table(backupRes.rows);

  const allSpgTl = await client.query(`
    SELECT u.id, u.full_name, u.nip, u.role, u.status, o.name as outlet_name, sup.full_name as tl_name
    FROM users u
    LEFT JOIN outlets o ON u.assigned_outlet_id = o.id
    LEFT JOIN users sup ON u.supervisor_id = sup.id
    WHERE u.role IN ('spg', 'tl')
    ORDER BY u.role, u.full_name
  `);
  console.log(`\nTOTAL SPG & TL IN DB: ${allSpgTl.rows.length}`);

  await client.end();
})();
