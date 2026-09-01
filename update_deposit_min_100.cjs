const fs = require("fs");
const esbuild = require("esbuild");

const filesToPatch = [
  "dist_backup/assets/index-CUhzlpga-v3.js",
  "dist_backup/assets/index-sn777-v5.js"
];

const oldYa = `ya=[{amount:"200",displayOrig:"200",total:"200",bonusPercent:""},{amount:"300",displayOrig:"300",total:"300",bonusPercent:""},{amount:"400",displayOrig:"400",total:"400",bonusPercent:""},{amount:"500",displayOrig:"500",total:"500",bonusPercent:""},{amount:"550",displayOrig:"550",total:"1,100",bonusPercent:"100%"},{amount:"1000",displayOrig:"1,000",total:"2,000",bonusPercent:"100%"},{amount:"2000",displayOrig:"2,000",total:"4,000",bonusPercent:"100%"},{amount:"5000",displayOrig:"5,000",total:"10,000",bonusPercent:"100%"},{amount:"10000",displayOrig:"10,000",total:"20,000",bonusPercent:"100%"},{amount:"15000",displayOrig:"15,000",total:"30,000",bonusPercent:"100%"},{amount:"20000",displayOrig:"20,000",total:"40,000",bonusPercent:"100%"},{amount:"25000",displayOrig:"25,000",total:"50,000",bonusPercent:"100%"}]`;

const newYa = `ya=[{amount:"100",displayOrig:"100",total:"100",bonusPercent:""},{amount:"200",displayOrig:"200",total:"200",bonusPercent:""},{amount:"300",displayOrig:"300",total:"300",bonusPercent:""},{amount:"400",displayOrig:"400",total:"400",bonusPercent:""},{amount:"500",displayOrig:"500",total:"500",bonusPercent:""},{amount:"550",displayOrig:"550",total:"1,100",bonusPercent:"100%"},{amount:"1000",displayOrig:"1,000",total:"2,000",bonusPercent:"100%"},{amount:"2000",displayOrig:"2,000",total:"4,000",bonusPercent:"100%"},{amount:"5000",displayOrig:"5,000",total:"10,000",bonusPercent:"100%"},{amount:"10000",displayOrig:"10,000",total:"20,000",bonusPercent:"100%"},{amount:"15000",displayOrig:"15,000",total:"30,000",bonusPercent:"100%"},{amount:"20000",displayOrig:"20,000",total:"40,000",bonusPercent:"100%"},{amount:"25000",displayOrig:"25,000",total:"50,000",bonusPercent:"100%"}]`;

filesToPatch.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log("Skipping non-existent file:", filePath);
    return;
  }

  let code = fs.readFileSync(filePath, "utf8");
  let modified = false;

  if (code.includes(oldYa)) {
    code = code.replace(oldYa, newYa);
    console.log(`[${filePath}] Replaced deposit packages ya array with 100 option at the start`);
    modified = true;
  } else {
    console.warn(`[${filePath}] oldYa string not found!`);
  }

  // Replace minimum deposit validation check ee=L?500:200 -> ee=L?500:100
  if (code.includes("ee=L?500:200")) {
    code = code.replace(/ee=L\?500:200/g, "ee=L?500:100");
    console.log(`[${filePath}] Replaced ee=L?500:200 with ee=L?500:100`);
    modified = true;
  }

  // Replace limit badge text
  if (code.includes('children:"সীমা: ৳২০০ - ৳২৫,০০০"')) {
    code = code.replace(/children:"সীমা: ৳২০০ - ৳২৫,০০০"/g, 'children:"সীমা: ৳১০০ - ৳২৫,০০০"');
    console.log(`[${filePath}] Replaced deposit limit badge text to ৳১০০`);
    modified = true;
  }

  // Replace warning modal text
  if (code.includes('children:"২০০ টাকা"})," ডিপোজিট করেন"]')) {
    code = code.replace(/children:"২০০ টাকা"\}\)," ডিপোজিট করেন"\]/g, 'children:"১০০ টাকা"})," ডিপোজিট করেন"]');
    console.log(`[${filePath}] Replaced warning modal title text to ১০০ টাকা`);
    modified = true;
  }

  if (code.includes('children:"২০০ টাকা"})," থেকে "')) {
    code = code.replace(/children:"২০০ টাকা"\}\)," থেকে "/g, 'children:"১০০ টাকা"})," থেকে "');
    console.log(`[${filePath}] Replaced warning modal range text to ১০০ টাকা`);
    modified = true;
  }

  if (code.includes('পর্যন্ত। ২০০ টাকা ডিপোজিট করলে সাথে সাথে')) {
    code = code.replace(/পর্যন্ত। ২০০ টাকা ডিপোজিট করলে সাথে সাথে/g, 'পর্যন্ত। ১০০ টাকা ডিপোজিট করলে সাথে সাথে');
    console.log(`[${filePath}] Replaced warning modal note text to ১০০ টাকা`);
    modified = true;
  }

  if (code.includes('onClick:()=>{fi("200"),be(!1)}')) {
    code = code.replace(/onClick:\(\)=>\{fi\("200"\),be\(!1\)\}/g, 'onClick:()=>{fi("100"),be(!1)}');
    console.log(`[${filePath}] Replaced warning modal button action to select 100`);
    modified = true;
  }

  if (code.includes('"৳২০০ সিলেক্ট করে এগিয়ে যান"')) {
    code = code.replace(/"৳২০০ সিলেক্ট করে এগিয়ে যান"/g, '"৳১০০ সিলেক্ট করে এগিয়ে যান"');
    console.log(`[${filePath}] Replaced warning modal button label to ৳১০০`);
    modified = true;
  }

  // Verify syntax with esbuild
  try {
    esbuild.transformSync(code, { loader: "js" });
    console.log(`[${filePath}] Syntax validation PASSED!`);
  } catch (err) {
    console.error(`[${filePath}] Syntax validation FAILED:`, err);
    process.exit(1);
  }

  fs.writeFileSync(filePath, code, "utf8");
  console.log(`[${filePath}] Successfully saved!`);
});

// Copy all files from dist_backup to dist
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  let entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    let srcPath = src + "/" + entry.name;
    let destPath = dest + "/" + entry.name;
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
copyDir("dist_backup", "dist");
console.log("Successfully copied dist_backup to dist!");
