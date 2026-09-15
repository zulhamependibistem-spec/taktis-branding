const XLSX = require("xlsx");
const pg = require("pg");
const fs = require("fs");
const path = require("path");

const rawFile = path.join(__dirname, "../raw_data/Report WOW GMM JSM W34 (21-23 Agustus).xlsx");
const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const dbMatch = envFile.match(/DATABASE_URL=(.+)/);

if (!dbMatch) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const wb = XLSX.readFile(rawFile);
const sheet = wb.Sheets["DAILY REPORT"];
const rows = XLSX.utils.sheet_to_json(sheet);

// Map of SPG Name (normalized) -> { outletCode, outletName, tlName, latestWeek, latestDate }
const spgMap = new Map();

rows.forEach((r) => {
  const week = Number(r["DAILY REPORT GMM WOW SPAGHETTI JSM"]);
  const dateNum = Number(r["__EMPTY_1"]);
  const tlName = String(r["__EMPTY_3"] ?? "").trim();
  const outletCode = String(r["__EMPTY_6"] ?? "").trim();
  const outletName = String(r["__EMPTY_7"] ?? "").trim();
  const spgName = String(r["__EMPTY_8"] ?? "").trim();

  if (!spgName || !outletCode) return;

  // We prioritize the latest week (W34 > W33 > W32)
  const existing = spgMap.get(spgName);
  if (!existing || week > existing.week || (week === existing.week && dateNum > existing.dateNum)) {
    spgMap.set(spgName, {
      spgName,
      outletCode,
      outletName,
      tlName,
      week,
      dateNum,
    });
  }
});

console.log(`Extracted ${spgMap.size} unique SPGs from Report W34 file.`);

const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  const usersRes = await client.query(`
    SELECT u.id, u.full_name, u.nip, u.assigned_outlet_id, u.supervisor_id, o.name as current_outlet_name, o.code_outlet as current_code_outlet
    FROM users u
    LEFT JOIN outlets o ON u.assigned_outlet_id = o.id
    WHERE u.role = 'spg'
  `);

  const dbSpgs = usersRes.rows;

  const outletsRes = await client.query(`SELECT id, name, code_outlet FROM outlets`);
  const outletByCode = new Map();
  outletsRes.rows.forEach((o) => {
    if (o.code_outlet) outletByCode.set(String(o.code_outlet).trim(), o);
  });

  const tlsRes = await client.query(`SELECT id, full_name FROM users WHERE role = 'tl'`);
  const tlByName = new Map();
  tlsRes.rows.forEach((t) => {
    tlByName.set(t.full_name.trim().toLowerCase(), t);
  });

  let updateCount = 0;
  let skippedCount = 0;
  const changes = [];

  for (const [wSpgName, wData] of spgMap.entries()) {
    // Match DB user
    const wNorm = wSpgName.toLowerCase();
    let matchedUser = dbSpgs.find((u) => u.full_name.trim().toLowerCase() === wNorm);

    // Alias / partial matching
    if (!matchedUser) {
      if (wNorm === "hana") {
        matchedUser = dbSpgs.find((u) => u.full_name.includes("HANNA AFTINA LISTYANI"));
      } else {
        matchedUser = dbSpgs.find(
          (u) =>
            u.full_name.toLowerCase().includes(wNorm) ||
            wNorm.includes(u.full_name.toLowerCase())
        );
      }
    }

    if (!matchedUser) {
      console.log(`[NOT FOUND IN DB] SPG in W34: "${wSpgName}" (Outlet: ${wData.outletName})`);
      skippedCount++;
      continue;
    }

    // Match outlet
    const matchedOutlet = outletByCode.get(wData.outletCode);
    if (!matchedOutlet) {
      console.log(`[OUTLET NOT FOUND] Code ${wData.outletCode} (${wData.outletName}) for ${matchedUser.full_name}`);
      continue;
    }

    // Match TL
    let matchedTl = null;
    if (wData.tlName) {
      const tlNorm = wData.tlName.toLowerCase();
      matchedTl = Array.from(tlByName.values()).find((t) =>
        t.full_name.toLowerCase().includes(tlNorm) || tlNorm.includes(t.full_name.toLowerCase())
      );
    }

    // Check if outlet changed
    const outletChanged = matchedUser.assigned_outlet_id !== matchedOutlet.id;
    const tlChanged = matchedTl && matchedUser.supervisor_id !== matchedTl.id;

    if (outletChanged || tlChanged) {
      updateCount++;
      changes.push({
        id: matchedUser.id,
        name: matchedUser.full_name,
        oldOutlet: matchedUser.current_outlet_name || "—",
        newOutlet: matchedOutlet.name,
        outletId: matchedOutlet.id,
        tlId: matchedTl ? matchedTl.id : matchedUser.supervisor_id,
        week: wData.week,
      });

      await client.query(
        `UPDATE users SET assigned_outlet_id = $1, supervisor_id = COALESCE($2, supervisor_id) WHERE id = $3`,
        [matchedOutlet.id, matchedTl ? matchedTl.id : null, matchedUser.id]
      );
    }
  }

  console.log(`\n=== REMAPPING SUMMARY ===`);
  console.log(`Total Updates Executed: ${updateCount}`);
  console.log(`Total Skipped / Unchanged: ${skippedCount}`);
  console.log(`\n--- DETAILS OF UPDATED SPGS ---`);
  changes.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} (W${c.week})`);
    console.log(`   Old Outlet: ${c.oldOutlet}`);
    console.log(`   New Outlet: ${c.newOutlet}\n`);
  });

  await client.end();
})();
