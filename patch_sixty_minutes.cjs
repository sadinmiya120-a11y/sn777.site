const fs = require("fs");

const files = [
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js",
  "patch_auto_cancel_history.cjs"
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");
  const countBefore = (code.match(/7\*60\*1000/g) || []).length;
  if (countBefore > 0) {
    code = code.replaceAll("7*60*1000", "60*60*1000");
    fs.writeFileSync(file, code, "utf8");
    console.log(`[${file}] Replaced ${countBefore} occurrences of 7*60*1000 with 60*60*1000`);
  } else {
    console.log(`[${file}] No occurrences found`);
  }
}
