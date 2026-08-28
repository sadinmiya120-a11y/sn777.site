const fs = require("fs");
const esbuild = require("esbuild");

const BACKEND_URL = "";

const jsFiles = [
  "dist/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist_backup/assets/index-CUhzlpga-v3.js"
];

jsFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  // Fix template string concatenation
  // Match 1: jt=`${...}/gopay_pay.php`
  code = code.replace(
    /jt=`\$\{.*?\}\/gopay_pay\.php`/g,
    `jt="${BACKEND_URL}/gopay_pay.php"`
  );

  // Match 2: Le=`...`
  code = code.replace(
    /Le=`\$\{.*?\}https:\/\/sn777-site-864935185164\.us-west1\.run\.app\/gopay_pay\.php\?uid=\$\{gt\.currentUser\.uid\}&amount=\$\{E\}&method=\$\{Be\}&order_no=\$\{Te\}`/g,
    `Le=\`${BACKEND_URL}/gopay_pay.php?uid=\${gt.currentUser.uid}&amount=\${E}&method=\${Be}&order_no=\${Te}\``
  );

  // Match 3: window.location.href=`...`
  code = code.replace(
    /window\.location\.href=`\$\{.*?\}https:\/\/sn777-site-864935185164\.us-west1\.run\.app\/gopay_pay\.php\?uid=\$\{gt\.currentUser\.uid\}&amount=\$\{E\}&method=\$\{Be\}&order_no=\$\{Te\}`/g,
    `window.location.href=\`${BACKEND_URL}/gopay_pay.php?uid=\${gt.currentUser.uid}&amount=\${E}&method=\${Be}&order_no=\${Te}\``
  );

  try {
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(filePath, code, "utf8");
    console.log(`[${filePath}] Cleaned & verified cleanly.`);
  } catch (err) {
    console.error(`[${filePath}] Error:`, err.message);
  }
});
