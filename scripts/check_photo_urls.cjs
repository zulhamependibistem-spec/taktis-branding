const pg = require("pg");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const dbMatch = envFile.match(/DATABASE_URL=(.+)/);

const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  const res = await client.query(`
    SELECT id, user_id, check_in_photo_url, check_out_photo_url, report_date
    FROM attendance
    WHERE check_in_photo_url IS NOT NULL OR check_out_photo_url IS NOT NULL
    ORDER BY report_date DESC
    LIMIT 20
  `);

  console.log("=== ATTENDANCE PHOTO ROWS IN DB ===");
  console.log(res.rows);

  await client.end();
})();
