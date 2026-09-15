const XLSX = require("xlsx");
const path = require("path");

const rawFile = path.join(__dirname, "../raw_data/Report WOW GMM JSM W34 (21-23 Agustus).xlsx");
const wb = XLSX.readFile(rawFile);

wb.SheetNames.forEach((sheetName) => {
  console.log(`\n=================== SHEET: ${sheetName} ===================`);
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);
  
  // Find all rows where WEEK is 34
  const w34Rows = rows.filter((r) => {
    const val = r["DAILY REPORT GMM WOW SPAGHETTI JSM"] || r["MONITORING STOK WOW SPAGHETTI JSM"] || r["WEEK"];
    return val === 34 || val === "34";
  });

  console.log(`Sheet "${sheetName}" total rows: ${rows.length}, W34 rows: ${w34Rows.length}`);
  
  // Unique SPG -> Toko in W34
  const spgTokoMap = new Map();
  w34Rows.forEach((r) => {
    const spg = (r["__EMPTY_8"] || r["__EMPTY_7"] || "").toString().trim();
    const toko = (r["__EMPTY_7"] || r["__EMPTY_6"] || "").toString().trim();
    const tl = (r["__EMPTY_3"] || "").toString().trim();
    if (spg && toko) {
      spgTokoMap.set(spg, { toko, tl });
    }
  });

  console.log(`\n--- Unique SPG & Toko in W34 (Sheet: ${sheetName}) ---`);
  spgTokoMap.forEach((val, spg) => {
    console.log(`SPG: "${spg}"  | Toko: "${val.toko}"  | TL: "${val.tl}"`);
  });
});
