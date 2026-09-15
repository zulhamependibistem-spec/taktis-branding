const XLSX = require("xlsx");
const path = require("path");

const filePath = path.join(__dirname, "../raw_data/W34 ONLY MAPPING.xlsx");
const wb = XLSX.readFile(filePath);

console.log("=== SHEETS IN W34 ONLY MAPPING.xlsx ===");
console.log(wb.SheetNames);

wb.SheetNames.forEach((name) => {
  console.log(`\n=================== SHEET: ${name} ===================`);
  const sheet = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sheet);
  console.log(`Total Rows: ${rows.length}`);
  if (rows.length > 0) {
    console.log("Sample Row 1:", rows[0]);
    console.log("Sample Row 2:", rows[1]);
  }
});
