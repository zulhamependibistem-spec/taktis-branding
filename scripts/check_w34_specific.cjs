const XLSX = require("xlsx");
const path = require("path");

const file = path.join(__dirname, "../raw_data/Report WOW GMM JSM W34 (21-23 Agustus).xlsx");
const wb = XLSX.readFile(file);
const sheet = wb.Sheets["DAILY REPORT"];
const rows = XLSX.utils.sheet_to_json(sheet);

console.log("=== W34 SPECIFIC ROWS FOR HANNA OR GUNASALMA OR YOGYA CIAMIS ===");
rows.forEach((r, idx) => {
  const week = r["DAILY REPORT GMM WOW SPAGHETTI JSM"];
  const spg = String(r["__EMPTY_8"] ?? "");
  const toko = String(r["__EMPTY_7"] ?? "");
  if (week === 34 && (spg.toLowerCase().includes("hanna") || toko.toLowerCase().includes("gunasalma") || toko.toLowerCase().includes("ciamis"))) {
    console.log(`[Row ${idx + 2}] Week:${week} Date:${r["__EMPTY_1"]} Toko:${toko} SPG:${spg} Variant:${r["__EMPTY_9"]} Qty:${r["__EMPTY_11"]}`);
  }
});
