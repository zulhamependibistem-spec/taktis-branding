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

// Map of SPG Name -> { outletCode, outletName, grsm, tlName }
const spgMap = new Map();

rows.forEach((r) => {
  const spgName = String(r["ISI MANUAL_1"] ?? "").trim();
  const outletCode = String(r["RUMUS_5"] ?? "").trim();
  const outletName = String(r["Pilihan"] ?? "").trim();
  const grsm = String(r["RUMUS_1"] ?? "").trim();
  const tlName = String(r["RUMUS_2"] ?? "").trim();

  if (!spgName || spgName === "ISI MANUAL_1" || spgName === "NAMA SPG") return;

  if (!spgMap.has(spgName)) {
    spgMap.set(spgName, {
      spgName,
      outletCode,
      outletName,
      grsm,
      tlName,
    });
  }
});

console.log(`=== UNIQUE SPGS FOUND IN W34 ONLY FILE (${spgMap.size} SPGs) ===`);
spgMap.forEach((v) => {
  console.log(`SPG: "${v.spgName}" | Outlet Code: "${v.outletCode}" | Toko: "${v.outletName}" | TL: "${v.tlName}"`);
});

const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  // 1. Fetch DB SPGs
  const usersRes = await client.query(`SELECT id, full_name, assigned_outlet_id, supervisor_id FROM users WHERE role = 'spg'`);
  const dbSpgs = usersRes.rows;

  // 2. Fetch Outlets
  const outletsRes = await client.query(`SELECT id, name, code_outlet FROM outlets`);
  const outletByCode = new Map();
  const outletByName = new Map();
  outletsRes.rows.forEach((o) => {
    if (o.code_outlet) outletByCode.set(String(o.code_outlet).trim(), o);
    outletByName.set(o.name.trim().toLowerCase(), o);
  });

  // 3. Fetch TLs
  const tlsRes = await client.query(`SELECT id, full_name FROM users WHERE role = 'tl'`);
  const tlByName = new Map();
  tlsRes.rows.forEach((t) => tlByName.set(t.full_name.trim().toLowerCase(), t));

  let synced = 0;
  let notFound = 0;

  for (const [wName, wData] of spgMap.entries()) {
    // Normalize SPG name
    const norm = wName.toLowerCase();

    // Match DB user
    let user = dbSpgs.find((u) => u.full_name.trim().toLowerCase() === norm);
    if (!user) {
      if (norm === "hana") {
        user = dbSpgs.find((u) => u.full_name.includes("HANNA AFTINA LISTYANI"));
      } else {
        user = dbSpgs.find(
          (u) =>
            u.full_name.toLowerCase().includes(norm) ||
            norm.includes(u.full_name.toLowerCase())
        );
      }
    }

    if (!user) {
      console.log(`\n[SPG NOT FOUND IN DB]: "${wName}" (${wData.outletName})`);
      notFound++;
      continue;
    }

    // Match Outlet (By Code first, then By Name)
    let outlet = outletByCode.get(wData.outletCode);
    if (!outlet && wData.outletName) {
      outlet = outletByName.get(wData.outletName.toLowerCase());
    }

    if (!outlet) {
      console.log(`\n[OUTLET NOT FOUND IN DB]: Code ${wData.outletCode} / Name "${wData.outletName}" for SPG ${user.full_name}`);
      continue;
    }

    // Match TL
    let tlId = null;
    if (wData.tlName) {
      const tlNorm = wData.tlName.toLowerCase();
      const matchedTl = Array.from(tlByName.values()).find((t) =>
        t.full_name.toLowerCase().includes(tlNorm) || tlNorm.includes(t.full_name.toLowerCase())
      );
      if (matchedTl) tlId = matchedTl.id;
    }

    // Update User in DB
    await client.query(
      `UPDATE users SET assigned_outlet_id = $1, supervisor_id = COALESCE($2, supervisor_id) WHERE id = $3`,
      [outlet.id, tlId, user.id]
    );

    console.log(`✓ SYNCED: ${user.full_name} -> Outlet: ${outlet.name} (Code: ${outlet.code_outlet}) | TL: ${wData.tlName}`);
    synced++;
  }

  console.log(`\n================ FINAL SYNC RESULT ================`);
  console.log(`Successfully Synced: ${synced} SPGs`);
  console.log(`Not Found / Excluded: ${notFound}`);

  await client.end();
})();
