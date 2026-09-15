const XLSX = require("xlsx");
const path = require("path");

const file = path.join(__dirname, "../raw_data/Report WOW GMM JSM W34 (21-23 Agustus).xlsx");
const wb = XLSX.readFile(file);
const sheet = wb.Sheets["DAILY REPORT"];
const rows = XLSX.utils.sheet_to_json(sheet);

console.log("=== W34 REPORT SEARCH FOR HANNA / CIAMIS / GUNASALMA ===");
rows.forEach((r, idx) => {
  const str = JSON.stringify(r);
  if (str.toLowerCase().includes("hanna") || str.toLowerCase().includes("ciamis") || str.toLowerCase().includes("1602020")) {
    console.log(`[Row ${idx + 2}] Week:${r["DAILY REPORT GMM WOW SPAGHETTI JSM"]} Date:${r["__EMPTY_1"]} GRSM:${r["__EMPTY_2"]} TL:${r["__EMPTY_3"]} Toko:${r["__EMPTY_7"]} SPG:${r["__EMPTY_8"]} Variant:${r["__EMPTY_9"]} Qty:${r["__EMPTY_11"]}`);
  }
});
