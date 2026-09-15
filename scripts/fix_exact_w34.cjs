const pg = require("pg");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const dbMatch = envFile.match(/DATABASE_URL=(.+)/);

if (!dbMatch) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const w34Mappings = [
  { spg: "SRI PUJIYATI", toko: "TRIO PLAZA", tl: "SUPRIYATI" },
  { spg: "FENNI ROSANTI", toko: "TRIO PLAZA", tl: "SUPRIYATI" },
  { spg: "LUTFI OKITA RIZQI", toko: "EKA SURYA PLAZA", tl: "SUPRIYATI" },
  { spg: "FELIA INES SAPUTRI", toko: "EKA SURYA PLAZA", tl: "SUPRIYATI" },
  { spg: "ADELIA MEILYNA PUTRI", toko: "LUWES PURWODADI", tl: "SUPRIYATI" },
  { spg: "NADIA SILVIANA DEWI", toko: "LUWES PURWODADI", tl: "SUPRIYATI" },
  { spg: "AYUDIA NOVA ARSILLA MAHARDANI", toko: "ADIJAYA TELUK", tl: "SUPRIYATI" },
  { spg: "MAIA ANDIEN AGUSTINA", toko: "ADIJAYA TELUK", tl: "SUPRIYATI" },
  { spg: "AINUN NAJIKHA", toko: "MUTIARA CAHAYA MEJASEM", tl: "SUPRIYATI" },
  { spg: "SHEILLA NAVISYA", toko: "MUTIARA CAHAYA MEJASEM", tl: "SUPRIYATI" },
  { spg: "FHARADILLA APRIZIAH WARDANI", toko: "BASA BANJARAN", tl: "SUPRIYATI" },
  { spg: "SELLY SRI WULANDARI", toko: "BASA BANJARAN", tl: "SUPRIYATI" },
  { spg: "HAULA LUTFIA MANSYAH", toko: "SAMI LARIS CILACAP", tl: "SUPRIYATI" },
  { spg: "LINDA JULIANTI", toko: "SAMI LARIS CILACAP", tl: "SUPRIYATI" },
  { spg: "EVI VADILLA NUR CAHYANTI", toko: "BRAVO SWALAYAN JATENG", tl: "SUPRIYATI" },
  { spg: "LILIN INDAH SARI", toko: "BRAVO SWALAYAN JATENG", tl: "SUPRIYATI" },
  { spg: "DIANA TRISNA SARI", toko: "TRIO JAYA WONOSOBO", tl: "SUPRIYATI" },
  { spg: "ELA KOMALASARI", toko: "TRIO JAYA WONOSOBO", tl: "SUPRIYATI" },
  { spg: "SUGIARTI", toko: "BASA BANJARAN", tl: "SUPRIYATI" },
  { spg: "LIANI ISMIATI", toko: "MG CIANJUR", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "ALDA AGUSTINA", toko: "MG CIANJUR", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "NURLAELA SITI SALEHA", toko: "ASIA TOSERBA CIHIDENG", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "HANNA AFTINA LISTYANI", toko: "GUNASALMA 1 KAWALI", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "GITA DEWI MEIYANI", toko: "GUNASALMA 1 KAWALI", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "RISKA APRILIANI", toko: "ASIA TOSERBA CIHIDENG", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "MEGA FITRIA", toko: "MITRA BUANA PASAR WETAN", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "MEISYA AYU ANDREANI", toko: "LANGGAN MAJALAYA", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "SINTA NURLAELA", toko: "LANGGAN MAJALAYA", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "YUNIATI", toko: "GUNASALMA 3", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "SHOFA DWINA", toko: "GUNASALMA 3", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "TUTI NURHASANAH", toko: "YOGYA GRAND SUBANG", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "TITIN NURJANAH", toko: "YOGYA GRAND SUBANG", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "NENG NURJANAH", toko: "PRATAMA PUTRA CIHUNI", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "ELSA TIAS NURPADILAH", toko: "PRATAMA PUTRA CIHUNI", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "DITA NINDIA", toko: "MITRA BUANA PASAR WETAN", tl: "FAHMI LUKMANUL HAKIM" },
  { spg: "ADE NOVILIANTI", toko: "YOVA GUNUNG MALANG", tl: "INDRI" },
  { spg: "DAHLYA RUSDIANTI", toko: "YOVA GUNUNG MALANG", tl: "INDRI" },
  { spg: "AHDA MARDIYAH", toko: "MAXI REGENCY", tl: "INDRI" },
  { spg: "RENI SETIANA", toko: "MAXI REGENCY", tl: "INDRI" },
  { spg: "GADIS", toko: "PLANET SWALAYAN.MM", tl: "INDRI" },
  { spg: "SUCITRAMADHANI MUKTHI", toko: "PLANET SWALAYAN.MM", tl: "INDRI" },
  { spg: "SALSHABILLA PUTERI HARIANTO", toko: "#.PINUS MM BANJARBARU", tl: "INDRI" },
  { spg: "ISNAWATI", toko: "#.PINUS MM BANJARBARU", tl: "INDRI" },
  { spg: "INDRIANING PUJI ASTUTI", toko: "#.PINUS MM BANJARBARU", tl: "INDRI" },
  { spg: "JENNITA PUSPITA SARI", toko: "TOP SWALAYAN", tl: "MARTIKA MINTOROWATI" },
  { spg: "SUSMIATI", toko: "BRAVO SUPERMARKET TULUNGAGUNG", tl: "MARTIKA MINTOROWATI" },
  { spg: "RATNA DYAH OKTAVIANA", toko: "BRAVO SUPERMARKET TULUNGAGUNG", tl: "MARTIKA MINTOROWATI" },
  { spg: "SITI KUSNUL KHOTIMAH", toko: "PRIMA SWALAYAN", tl: "MARTIKA MINTOROWATI" },
  { spg: "NANIK PRIYANTINI", toko: "LUWES GROUP", tl: "MARTIKA MINTOROWATI" },
  { spg: "LINA YUNIVA", toko: "LUWES GROUP", tl: "MARTIKA MINTOROWATI" },
  { spg: "YUNNYTA VINA LISTIA", toko: "ISTANA TOSERBA", tl: "MARTIKA MINTOROWATI" },
  { spg: "VIKA AMANDA WULANDARI", toko: "ISTANA TOSERBA", tl: "MARTIKA MINTOROWATI" },
  { spg: "SUSI SUSANTI", toko: "CV TOP", tl: "MARTIKA MINTOROWATI" },
  { spg: "AYU FITRI WULANDARI", toko: "TOP SWALAYAN", tl: "MARTIKA MINTOROWATI" },
  { spg: "ELY NURAINI", toko: "PRIMA SWALAYAN", tl: "MARTIKA MINTOROWATI" },
  { spg: "IKA PUSPITA YULIANI", toko: "CV TOP", tl: "MARTIKA MINTOROWATI" },
];

const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  console.log("=== FIXING W34 EXACT MAPPINGS IN DB ===");
  let fixedCount = 0;

  for (const item of w34Mappings) {
    // 1. Find User
    const userRes = await client.query(
      `SELECT id, full_name, assigned_outlet_id FROM users WHERE full_name ILIKE $1 OR full_name ILIKE $2`,
      [item.spg, `%${item.spg}%`]
    );

    if (userRes.rows.length === 0) {
      console.log(`[USER NOT FOUND]: ${item.spg}`);
      continue;
    }

    const user = userRes.rows[0];

    // 2. Find Outlet
    const outletRes = await client.query(
      `SELECT id, name FROM outlets WHERE name ILIKE $1 OR name ILIKE $2 ORDER BY char_length(name) ASC LIMIT 1`,
      [item.toko, `%${item.toko}%`]
    );

    if (outletRes.rows.length === 0) {
      console.log(`[OUTLET NOT FOUND]: ${item.toko} for SPG ${user.full_name}`);
      continue;
    }

    const outlet = outletRes.rows[0];

    // 3. Find TL
    const tlRes = await client.query(
      `SELECT id, full_name FROM users WHERE role = 'tl' AND (full_name ILIKE $1 OR full_name ILIKE $2) LIMIT 1`,
      [item.tl, `%${item.tl}%`]
    );

    const tlId = tlRes.rows.length > 0 ? tlRes.rows[0].id : null;

    // 4. Update User
    await client.query(
      `UPDATE users SET assigned_outlet_id = $1, supervisor_id = COALESCE($2, supervisor_id) WHERE id = $3`,
      [outlet.id, tlId, user.id]
    );

    console.log(`✓ UPDATED: ${user.full_name} -> Outlet: ${outlet.name} (TL: ${tlRes.rows[0]?.full_name ?? item.tl})`);
    fixedCount++;
  }

  console.log(`\nFINISHED. Successfully updated ${fixedCount} SPGs based strictly on W34 report!`);
  await client.end();
})();
