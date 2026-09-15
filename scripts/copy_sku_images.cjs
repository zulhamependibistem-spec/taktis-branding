const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "../SKU Product Image/button-wow-spageti-goreng.jpg");
const dest = path.join(__dirname, "../public/products/goreng.jpg");

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log("✓ Copied SKU Product Image/button-wow-spageti-goreng.jpg to public/products/goreng.jpg");
} else {
  console.error("Source image not found:", src);
}
