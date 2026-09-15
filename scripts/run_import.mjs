import { readFileSync } from "fs";
import pg from "pg";

const { Client } = pg;
const env = readFileSync("D:/TAKTIS/.env.local", "utf8");
const get = (k) => { const m = env.match(new RegExp("^" + k + "=(.*)$", "m")); return m ? m[1].trim() : ""; };
const databaseUrl = get("DATABASE_URL");
if (!databaseUrl) { console.error("DATABASE_URL tidak ada di .env.local"); process.exit(1); }

const files = ["D:/TAKTIS/database/migration_v3.sql", "D:/TAKTIS/database/import_real.sql"];

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  for (const f of files) {
    const sql = readFileSync(f, "utf8");
    console.log("=== Jalankan:", f.split("/").pop(), "(" + sql.split("\n").length + " baris) ===");
    const t0 = Date.now();
    try {
      await client.query(sql);
      console.log("   OK dalam " + ((Date.now() - t0) / 1000).toFixed(1) + "s");
    } catch (e) {
      console.error("   GAGAL:", e.message);
      process.exitCode = 1;
      break;
    }
  }
  if (!process.exitCode) await verify(client);
  await client.end();
}

async function verify(client) {
  console.log("\n=== VERIFIKASI ===");
  for (const t of ["outlets", "users", "user_outlets"]) {
    const { rows } = await client.query("SELECT count(*)::int AS c FROM " + t);
    console.log("  " + t + ": " + rows[0].c);
  }
  const { rows: role } = await client.query("SELECT role, count(*)::int AS c FROM users GROUP BY role ORDER BY role");
  console.log("  Users per role: " + role.map(r => r.role + "=" + r.c).join(", "));
  const { rows: nullnip } = await client.query("SELECT count(*)::int AS c FROM users WHERE nip IS NULL");
  console.log("  Users dgn nip NULL (SPG/B): " + nullnip[0].c);
  const { rows: dup } = await client.query("SELECT nip, count(*)::int AS c FROM users GROUP BY nip HAVING count(*)>1");
  console.log("  Duplikat nip: " + (dup.length === 0 ? "tidak ada" : JSON.stringify(dup)));
  const { rows: noval } = await client.query("SELECT count(*)::int AS c FROM users WHERE role='spg' AND assigned_outlet_id IS NULL");
  console.log("  SPG tanpa assigned outlet: " + noval[0].c);
}

run().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
