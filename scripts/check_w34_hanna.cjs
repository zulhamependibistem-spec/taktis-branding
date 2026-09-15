const XLSX = require("xlsx");
const path = require("path");

const rawDir = path.join(__dirname, "../raw_data");

console.log("=== 1. DATABASE M4 WOW GMM MT JSM.xlsx (MASTER DATABASE) ===");
const dbWb = XLSX.readFile(path.join(rawDir, "DATABASE M4 WOW GMM MT JSM.xlsx"));
dbWb.SheetNames.forEach((sheetName) => {
  const sheet = dbWb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);
  rows.forEach((r, idx) => {
    const str = JSON.stringify(r);
    if (str.toLowerCase().includes("hanna")) {
      console.log(`[MASTER DB | Sheet: ${sheetName} | Row ${idx + 2}]`);
      console.log(r);
    }
  });
});

console.log("\n=== 2. Report WOW GMM JSM W34 (21-23 Agustus).xlsx (REPORT W34) ===");
const rWb = XLSX.readFile(path.join(rawDir, "Report WOW GMM JSM W34 (21-23 Agustus).xlsx"));
rWb.SheetNames.forEach((sheetName) => {
  const sheet = rWb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);
  rows.forEach((r, idx) => {
    const str = JSON.stringify(r);
    if (str.toLowerCase().includes("hanna")) {
      console.log(`[REPORT W34 | Sheet: ${sheetName} | Row ${idx + 2}]`);
      console.log(r);
    }
  });
});
