const pg = require("pg");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const dbMatch = envFile.match(/DATABASE_URL=(.+)/);

const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();
  const res = await client.query(`
    SELECT u.id, u.full_name, u.nip, u.assigned_outlet_id, o.name as outlet_name, o.code_outlet
    FROM users u
    LEFT JOIN outlets o ON u.assigned_outlet_id = o.id
    WHERE u.full_name ILIKE '%sely%' OR u.full_name ILIKE '%selly%' OR u.full_name ILIKE '%wulandari%'
  `);
  console.log("USERS MATCHING SELY/SELLY/WULANDARI:", res.rows);
  await client.end();
})();
