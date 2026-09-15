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

// Map of SPG Name -> { outletName, tlName }
const spgMap = new Map();

rows.forEach((r) => {
  const spgName = String(r["ISI MANUAL_1"] ?? "").trim();
  const outletName = String(r["Pilihan"] ?? "").trim();
  const tlName = String(r["RUMUS_2"] ?? "").trim();

  if (!spgName || spgName === "ISI MANUAL_1" || spgName === "NAMA SPG") return;

  if (!spgMap.has(spgName.toUpperCase())) {
    spgMap.set(spgName.toUpperCase(), { spgName, outletName, tlName });
  }
});

// Also manually add known spelling variations
spgMap.set("SELY SRI WULANDARI", spgMap.get("SELLY SRI WULANDARI"));
spgMap.set("HANA", spgMap.get("HANNA AFTINA LISTYANI") || { spgName: "HANA", outletName: "GUNASALMA 1 KAWALI", tlName: "FAHMI LUKMANUL HAKIM" });

const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  const usersRes = await client.query(`SELECT id, full_name, nip, assigned_outlet_id, supervisor_id FROM users WHERE role = 'spg'`);
  const dbUsers = usersRes.rows;

  const outletsRes = await client.query(`SELECT id, name FROM outlets`);
  const outlets = outletsRes.rows;

  const tlsRes = await client.query(`SELECT id, full_name FROM users WHERE role = 'tl'`);
  const tls = tlsRes.rows;

  console.log("=== UPDATING ALL DB USERS (INCLUDING DUPLICATES & VARIATIONS) BASED ON W34 ===");
  let updatedCount = 0;

  for (const u of dbUsers) {
    const uNameUpper = u.full_name.trim().toUpperCase();

    // Find mapping in W34 map
    let mapEntry = spgMap.get(uNameUpper);

    // Fallback fuzzy search if exact match fails
    if (!mapEntry) {
      for (const [wKey, val] of spgMap.entries()) {
        if (val && (wKey.includes(uNameUpper) || uNameUpper.includes(wKey))) {
          mapEntry = val;
          break;
        }
      }
    }

    if (!mapEntry) {
      console.log(`[NO W34 ENTRY]: User ${u.full_name} (NIP ${u.nip})`);
      continue;
    }

    // Find Outlet
    let outlet = outlets.find((o) => o.name.trim().toUpperCase() === mapEntry.outletName.toUpperCase());
    if (!outlet) {
      outlet = outlets.find(
        (o) =>
          o.name.toUpperCase().includes(mapEntry.outletName.toUpperCase()) ||
          mapEntry.outletName.toUpperCase().includes(o.name.toUpperCase())
      );
    }

    if (!outlet) {
      console.log(`[OUTLET NOT FOUND]: "${mapEntry.outletName}" for user ${u.full_name}`);
      continue;
    }

    // Find TL
    let tlId = null;
    if (mapEntry.tlName) {
      const matchedTl = tls.find(
        (t) =>
          t.full_name.toUpperCase().includes(mapEntry.tlName.toUpperCase()) ||
          mapEntry.tlName.toUpperCase().includes(t.full_name.toUpperCase())
      );
      if (matchedTl) tlId = matchedTl.id;
    }

    // Update DB user
    await client.query(
      `UPDATE users SET assigned_outlet_id = $1, supervisor_id = COALESCE($2, supervisor_id) WHERE id = $3`,
      [outlet.id, tlId, u.id]
    );

    console.log(`✓ UPDATED: ${u.full_name} (NIP ${u.nip}) ➔ Outlet: ${outlet.name} (TL: ${mapEntry.tlName})`);
    updatedCount++;
  }

  console.log(`\nCOMPLETED FULL USER UPDATE: Total ${updatedCount} user records updated.`);
  await client.end();
})();
