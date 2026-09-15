const XLSX = require("xlsx");
const pg = require("pg");
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "../raw_data/W34 ONLY MAPPING.xlsx");
const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const dbMatch = envFile.match(/DATABASE_URL=(.+)/);

if (!dbMatch) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const wb = XLSX.readFile(file);
const sheet = wb.Sheets["Sheet1"];
const rows = XLSX.utils.sheet_to_json(sheet);

const spgMap = new Map();

rows.forEach((r) => {
  const spgName = String(r["ISI MANUAL_1"] ?? "").trim();
  const outletName = String(r["Pilihan"] ?? "").trim();
  const tlName = String(r["RUMUS_2"] ?? "").trim();

  if (!spgName || spgName === "ISI MANUAL_1" || spgName === "NAMA SPG") return;

  if (!spgMap.has(spgName)) {
    spgMap.set(spgName, { spgName, outletName, tlName });
  }
});

const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  const usersRes = await client.query(`SELECT id, full_name, assigned_outlet_id, supervisor_id FROM users WHERE role = 'spg'`);
  const dbSpgs = usersRes.rows;

  const outletsRes = await client.query(`SELECT id, name FROM outlets`);
  const outlets = outletsRes.rows;

  const tlsRes = await client.query(`SELECT id, full_name FROM users WHERE role = 'tl'`);
  const tls = tlsRes.rows;

  console.log("=== STRICT NAME-BASED SYNC FROM W34 ONLY FILE ===");
  let count = 0;

  for (const [spgName, data] of spgMap.entries()) {
    // 1. Find User
    let user = dbSpgs.find((u) => u.full_name.trim().toLowerCase() === spgName.toLowerCase());
    if (!user) {
      if (spgName.toLowerCase() === "hana") {
        user = dbSpgs.find((u) => u.full_name.includes("HANNA AFTINA LISTYANI"));
      } else {
        user = dbSpgs.find(
          (u) =>
            u.full_name.toLowerCase().includes(spgName.toLowerCase()) ||
            spgName.toLowerCase().includes(u.full_name.toLowerCase())
        );
      }
    }

    if (!user) {
      console.log(`[USER NOT FOUND]: "${spgName}"`);
      continue;
    }

    // 2. Find Outlet by Name (Pilihan)
    let targetOutletName = data.outletName;
    let outlet = outlets.find((o) => o.name.trim().toLowerCase() === targetOutletName.toLowerCase());

    if (!outlet) {
      // Partial match fallback
      outlet = outlets.find(
        (o) =>
          o.name.toLowerCase().includes(targetOutletName.toLowerCase()) ||
          targetOutletName.toLowerCase().includes(o.name.toLowerCase())
      );
    }

    if (!outlet) {
      console.log(`[OUTLET NOT FOUND]: "${data.outletName}" for SPG ${user.full_name}`);
      continue;
    }

    // 3. Find TL
    let tlId = null;
    if (data.tlName) {
      const matchedTl = tls.find(
        (t) =>
          t.full_name.toLowerCase().includes(data.tlName.toLowerCase()) ||
          data.tlName.toLowerCase().includes(t.full_name.toLowerCase())
      );
      if (matchedTl) tlId = matchedTl.id;
    }

    // Update DB
    await client.query(
      `UPDATE users SET assigned_outlet_id = $1, supervisor_id = COALESCE($2, supervisor_id) WHERE id = $3`,
      [outlet.id, tlId, user.id]
    );

    console.log(`✓ SYNCED: ${user.full_name} ➔ Toko: ${outlet.name} (TL: ${data.tlName})`);
    count++;
  }

  console.log(`\nCOMPLETED STRICT NAME SYNC: Updated ${count} SPGs.`);
  await client.end();
})();
