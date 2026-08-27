const fs = require("fs");

const jsFiles = [
  "dist/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist_backup/assets/index-CUhzlpga-v3.js"
];

jsFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`File ${file} does not exist, skipping.`);
    return;
  }

  let code = fs.readFileSync(file, "utf8");

  // Replace current ya array starting with 200 and 500 with 200, 300, 400, 500...
  const oldYa = 'ya=[{amount:"200",displayOrig:"200",total:"200",bonusPercent:""},{amount:"500",displayOrig:"500",total:"500",bonusPercent:""}';
  const newYa = 'ya=[{amount:"200",displayOrig:"200",total:"200",bonusPercent:""},{amount:"300",displayOrig:"300",total:"300",bonusPercent:""},{amount:"400",displayOrig:"400",total:"400",bonusPercent:""},{amount:"500",displayOrig:"500",total:"500",bonusPercent:""}';

  if (code.includes(oldYa)) {
    code = code.replace(oldYa, newYa);
    fs.writeFileSync(file, code, "utf8");
    console.log(`Successfully patched quick select amounts in ${file}`);
  } else {
    // Let us try matching the original/restored sequence just in case
    const oldYaOrig = 'ya=[{amount:"500",displayOrig:"500",total:"500",bonusPercent:""}';
    const newYaFull = 'ya=[{amount:"200",displayOrig:"200",total:"200",bonusPercent:""},{amount:"300",displayOrig:"300",total:"300",bonusPercent:""},{amount:"400",displayOrig:"400",total:"400",bonusPercent:""},{amount:"500",displayOrig:"500",total:"500",bonusPercent:""}';
    if (code.includes(oldYaOrig)) {
      code = code.replace(oldYaOrig, newYaFull);
      fs.writeFileSync(file, code, "utf8");
      console.log(`Successfully patched quick select amounts (original match) in ${file}`);
    } else {
      console.log(`Could not find target ya array in ${file}`);
    }
  }
});
