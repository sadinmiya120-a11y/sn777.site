const fs = require("fs");
["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");
  
  // Replace the hardcoded run.app URL for callback
  code = code.replace(/https:\/\/sn777-site-864935185164\.us-west1\.run\.app\/callback\.php/g, "https://sn777.site/callback.php");
  
  // Also replace any sendBeacon hardcoded URL
  code = code.replace(/https:\/\/sn777-site-864935185164\.us-west1\.run\.app\/api\/record-transaction/g, "https://sn777.site/api/record-transaction");

  fs.writeFileSync(file, code, "utf8");
  console.log("Patched", file);
});
