const XLSX = require("xlsx");
const pg = require("pg");
const fs = require("fs");
const path = require("path");

const rawDir = path.join(__dirname, "../raw_data");
const files = fs.readdirSync(rawDir).filter((f) => f.endsWith(".xlsx"));

console.log("=== SEARCHING RAW EXCEL FILES FOR HANNA ===");
files.forEach((f) => {
  const filePath = path.join(rawDir, f);
  const wb = XLSX.readFile(filePath);
  wb.SheetNames.forEach((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    data.forEach((row, idx) => {
      const rowStr = JSON.stringify(row);
      if (rowStr.toLowerCase().includes("hanna")) {
        console.log(`[FILE: ${f} | SHEET: ${sheetName} | ROW: ${idx + 2}]`);
        console.log(JSON.stringify(row, null, 2));
      }
    });
  });
});

console.log("\n=== SEARCHING DATABASE FOR HANNA ===");
const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const dbMatch = envFile.match(/DATABASE_URL=(.+)/);
if (dbMatch) {
  const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });
  (async () => {
    await client.connect();
    const uRes = await client.query(`
      SELECT u.id, u.full_name, u.nip, u.assigned_outlet_id, u.supervisor_id, o.name as outlet_name, o.code_outlet, sup.full_name as supervisor_name
      FROM users u
      LEFT JOIN outlets o ON u.assigned_outlet_id = o.id
      LEFT JOIN users sup ON u.supervisor_id = sup.id
      WHERE u.full_name ILIKE '%hanna%'
    `);
    console.log("USERS DB MATCH:", uRes.rows);

    if (uRes.rows.length > 0) {
      const hannaId = uRes.rows[0].id;
      const salesRes = await client.query(`
        SELECT s.report_date, s.qty_sold, s.sampling_qty, o.name as outlet_name, o.code_outlet
        FROM daily_sales_reports s
        JOIN outlets o ON s.outlet_id = o.id
        WHERE s.user_id = $1
        ORDER BY s.report_date DESC
      `, [hannaId]).catch(() => ({ rows: [] }));
      console.log("SALES HISTORY:", salesRes.rows);
    }
    await client.end();
  })();
}
