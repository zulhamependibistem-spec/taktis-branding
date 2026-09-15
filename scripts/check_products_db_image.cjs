const pg = require("pg");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const dbMatch = envFile.match(/DATABASE_URL=(.+)/);

const client = new pg.Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();

  const res = await client.query(`SELECT id, name, variant, image_url FROM products ORDER BY name, variant`);
  console.log("=== PRODUCTS IN DB ===");
  console.table(res.rows);

  // Ensure image_url points to /products/goreng.jpg for Goreng variant
  await client.query(`UPDATE products SET image_url = '/products/goreng.jpg' WHERE variant ILIKE '%goreng%' OR name ILIKE '%goreng%'`);
  await client.query(`UPDATE products SET image_url = '/products/bolognese.jpg' WHERE variant ILIKE '%bolognese%' OR name ILIKE '%bolognese%'`);
  await client.query(`UPDATE products SET image_url = '/products/carbonara.jpg' WHERE variant ILIKE '%carbonara%' OR name ILIKE '%carbonara%'`);
  await client.query(`UPDATE products SET image_url = '/products/aglio-olio.jpg' WHERE variant ILIKE '%aglio%' OR name ILIKE '%aglio%'`);

  console.log("✓ Synchronized all product image_url paths in database.");

  await client.end();
})();
