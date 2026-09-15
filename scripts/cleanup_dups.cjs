const XLSX = require("xlsx");
const pg = require("pg");
const fs = require("fs");
const path = require("path");

const rawDir = path.join(__dirname, "../raw_data");
const files = fs.readdirSync(rawDir).filter((f) => f.endsWith(".xlsx"));

console.log("=== SEARCHING ALL SHEETS IN ALL EXCEL FILES FOR HANA / NIP 21100 ===");

files.forEach((file) => {
  const filePath = path.join(rawDir, file);
  const wb = XLSX.readFile(filePath);
  wb.SheetNames.forEach((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    rows.forEach((r, idx) => {
      const str = JSON.stringify(r);
      if (str.toLowerCase().includes("21100") || str.toLowerCase().includes("hana") || str.toLowerCase().includes("backup") || str.toLowerCase().includes("back up")) {
        if (str.toLowerCase().includes("hana") || str.includes("21100")) {
          console.log(`[FILE: ${file} | SHEET: ${sheetName} | ROW: ${idx + 2}]`);
          console.log(r);
        }
      }
    });
  });
});

const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const dbMatch = envFile.match(/DATABASE_URL=(.+)/);

const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  console.log("\n=== DATABASE CLEANUP ===");

  // 1. Delete duplicate SELLY SRI WULANDARI (NIP 21101)
  const delSelly = await client.query(`DELETE FROM users WHERE full_name = 'SELLY SRI WULANDARI' AND nip = '21101' RETURNING *`);
  if (delSelly.rows.length > 0) {
    console.log(`✓ DELETED DUPLICATE USER: SELLY SRI WULANDARI (NIP 21101)`);
  }

  // Ensure SELY SRI WULANDARI (NIP 20221) is active and assigned to BASA BANJARAN
  const selyRes = await client.query(`
    SELECT u.id, u.full_name, u.nip, o.name as outlet_name
    FROM users u
    LEFT JOIN outlets o ON u.assigned_outlet_id = o.id
    WHERE u.full_name = 'SELY SRI WULANDARI'
  `);
  console.log("REMAINING SELY USER IN DB:", selyRes.rows);

  // Check HANA (NIP 21100) in DB
  const hana21100 = await client.query(`
    SELECT u.id, u.full_name, u.nip, u.assigned_outlet_id, u.status, u.role, o.name as outlet_name
    FROM users u
    LEFT JOIN outlets o ON u.assigned_outlet_id = o.id
    WHERE u.nip = '21100' OR u.full_name ILIKE '%hana%'
  `);
  console.log("HANA USERS IN DB:", hana21100.rows);

  await client.end();
})();
