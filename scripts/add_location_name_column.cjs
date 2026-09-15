const pg = require("pg");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const dbMatch = envFile.match(/DATABASE_URL=(.+)/);

const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  console.log("=== ADDING LOCATION_NAME COLUMN TO ATTENDANCE TABLE ===");
  await client.query(`
    ALTER TABLE attendance
    ADD COLUMN IF NOT EXISTS location_name TEXT;
  `);

  console.log("✓ Column 'location_name' successfully verified/added to attendance table.");

  await client.end();
})();
