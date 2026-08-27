const fs = require("fs");
const esbuild = require("esbuild");

const targetFiles = [
  "dist_backup/assets/index-sn777-v5.js",
  "dist_backup/assets/index-CUhzlpga-v3.js",
  "dist/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js"
];

targetFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");

  // 1. Remove all duplicated/corrupted domain concatenations
  code = code.replace(/(?:https?:\/\/[a-zA-Z0-9_.-]+)+\/gopay_pay\.php/g, "/gopay_pay.php");
  code = code.replace(/https:\/\/sn777\.sitehttps:\/\/sn777\.site/g, "");
  code = code.replace(/sn777\.sitehttps/g, "");

  // 2. Fix fetch wrapper in injected header if present
  code = code.replace(
    /input\.startsWith\("https:\/\/sn777\.site\/gopay_pay\.php"\)/g,
    'input.startsWith("/gopay_pay.php")'
  );

  // 3. Ensure gopay redirect uses clean relative path or window.location.assign("/gopay_pay.php...")
  code = code.replace(
    /jt="https:\/\/sn777\.site\/gopay_pay\.php"/g,
    'jt="/gopay_pay.php"'
  );
  code = code.replace(
    /Le=`https:\/\/sn777\.site\/gopay_pay\.php\?/g,
    'Le=`/gopay_pay.php?'
  );

  // 4. Update deposit limits & preset amounts
  code = code.replace(/সীমা:\s*৳৩০০\s*-\s*৳২৫,০০০/g, "সীমা: ৳২০০ - ৳২৫,০০০");
  code = code.replace(/সীমা:\s*৳৫০০\s*-\s*৳২৫,০০০/g, "সীমা: ৳২০০ - ৳২৫,০০০");

  // Ensure 200, 300, 400 presets are present in ya array if ya array is found
  if (code.includes('ya=[{amount:"500",displayOrig:"500",total:"500",bonusPercent:""}')) {
    code = code.replace(
      'ya=[{amount:"500",displayOrig:"500",total:"500",bonusPercent:""}',
      'ya=[{amount:"200",displayOrig:"200",total:"200",bonusPercent:""},{amount:"300",displayOrig:"300",total:"300",bonusPercent:""},{amount:"400",displayOrig:"400",total:"400",bonusPercent:""},{amount:"500",displayOrig:"500",total:"500",bonusPercent:""}'
    );
  }

  // Ensure minimum deposit validation supports 200
  code = code.replace(/ee=L\?500:300/g, "ee=L?500:200");
  code = code.replace(/children:"৩০০ টাকা"\}/g, 'children:"২০০ টাকা"}');

  try {
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(file, code, "utf8");
    console.log(`[SUCCESS] Sanitized and updated ${file}`);
  } catch (err) {
    console.error(`[ERROR] ${file}:`, err.message);
  }
});
