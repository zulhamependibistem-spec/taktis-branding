const XLSX = require("xlsx");
const path = require("path");

const files = ["DATABASE M4 WOW GMM MT JSM.xlsx", "Report WOW GMM JSM W34 (21-23 Agustus).xlsx", "W34 ONLY MAPPING.xlsx"];

files.forEach((f) => {
  const filePath = path.join(__dirname, "../raw_data", f);
  const wb = XLSX.readFile(filePath);
  console.log(`\n=== SEARCHING BACKUP IN ${f} ===`);
  wb.SheetNames.forEach((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    rows.forEach((r, idx) => {
      const str = JSON.stringify(r);
      if (str.toLowerCase().includes("backup") || str.toLowerCase().includes("back up")) {
        console.log(`[${f} | ${sheetName} | Row ${idx + 2}]`);
        console.log(r);
      }
    });
  });
});
