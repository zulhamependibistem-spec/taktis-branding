const XLSX = require("xlsx");
const path = require("path");

const filePath = path.join(__dirname, "../raw_data/DATABASE M4 WOW GMM MT JSM.xlsx");
const wb = XLSX.readFile(filePath);

console.log("=== SHEETS IN DATABASE M4 WOW GMM MT JSM.xlsx ===");
console.log(wb.SheetNames);

wb.SheetNames.forEach((sheetName) => {
  console.log(`\n=================== SHEET: ${sheetName} ===================`);
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);
  console.log(`Total rows in sheet ${sheetName}: ${rows.length}`);
  
  if (rows.length > 0) {
    console.log("Keys in Row 1:", Object.keys(rows[0]));
    
    // Check backup values across columns
    const backups = rows.filter((r) => {
      const str = JSON.stringify(r).toLowerCase();
      return str.includes("backup") || str.includes("back up") || str.includes("back-up");
    });
    
    console.log(`Rows containing 'backup' in sheet "${sheetName}": ${backups.length}`);
    backups.forEach((b, i) => {
      console.log(`[Backup ${i + 1}]`, b);
    });
  }
});
