const fs = require("fs");
const esbuild = require("esbuild");

const filesToPatch = [
  "dist_backup/assets/index-CUhzlpga-v3.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js",
  "dist/assets/index-sn777-v5.js"
];

const oldYa = `ya=[{amount:"500",displayOrig:"500",total:"500",bonusPercent:""},{amount:"550",displayOrig:"550",total:"1,100",bonusPercent:"100%"},{amount:"1000",displayOrig:"1,000",total:"2,000",bonusPercent:"100%"},{amount:"2000",displayOrig:"2,000",total:"4,000",bonusPercent:"100%"},{amount:"5000",displayOrig:"5,000",total:"10,000",bonusPercent:"100%"},{amount:"10000",displayOrig:"10,000",total:"20,000",bonusPercent:"100%"},{amount:"15000",displayOrig:"15,000",total:"30,000",bonusPercent:"100%"},{amount:"20000",displayOrig:"20,000",total:"40,000",bonusPercent:"100%"},{amount:"25000",displayOrig:"25,000",total:"50,000",bonusPercent:"100%"}]`;

const newYa = `ya=[{amount:"200",displayOrig:"200",total:"200",bonusPercent:""},{amount:"300",displayOrig:"300",total:"300",bonusPercent:""},{amount:"400",displayOrig:"400",total:"400",bonusPercent:""},{amount:"500",displayOrig:"500",total:"500",bonusPercent:""},{amount:"550",displayOrig:"550",total:"1,100",bonusPercent:"100%"},{amount:"1000",displayOrig:"1,000",total:"2,000",bonusPercent:"100%"},{amount:"2000",displayOrig:"2,000",total:"4,000",bonusPercent:"100%"},{amount:"5000",displayOrig:"5,000",total:"10,000",bonusPercent:"100%"},{amount:"10000",displayOrig:"10,000",total:"20,000",bonusPercent:"100%"},{amount:"15000",displayOrig:"15,000",total:"30,000",bonusPercent:"100%"},{amount:"20000",displayOrig:"20,000",total:"40,000",bonusPercent:"100%"},{amount:"25000",displayOrig:"25,000",total:"50,000",bonusPercent:"100%"}]`;

filesToPatch.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log("Skipping non-existent file:", filePath);
    return;
  }

  let code = fs.readFileSync(filePath, "utf8");
  let modified = false;

  if (code.includes(oldYa)) {
    code = code.replace(oldYa, newYa);
    console.log(`[${filePath}] Replaced deposit packages ya array with 200, 300, 400 options`);
    modified = true;
  } else {
    console.warn(`[${filePath}] oldYa string not found!`);
  }

  // Replace minimum deposit validation check ee=L?500:300 -> ee=L?500:200
  if (code.includes("ee=L?500:300")) {
    code = code.replace(/ee=L\?500:300/g, "ee=L?500:200");
    console.log(`[${filePath}] Replaced ee=L?500:300 with ee=L?500:200`);
    modified = true;
  }

  // Replace limit badge text
  if (code.includes('children:"সীমা: ৳৩০০ - ৳২৫,০০০"')) {
    code = code.replace(/children:"সীমা: ৳৩০০ - ৳২৫,০০০"/g, 'children:"সীমা: ৳২০০ - ৳২৫,০০০"');
    console.log(`[${filePath}] Replaced deposit limit badge text to ৳২০০`);
    modified = true;
  }

  // Replace warning modal text
  if (code.includes('children:"৩০০ টাকা"})," ডিপোজিট করেন"]')) {
    code = code.replace(/children:"৩০০ টাকা"\}\)," ডিপোজিট করেন"\]/g, 'children:"২০০ টাকা"})," ডিপোজিট করেন"]');
    console.log(`[${filePath}] Replaced warning modal title text to ২০০ টাকা`);
    modified = true;
  }

  if (code.includes('children:"৩০০ টাকা"})," থেকে "')) {
    code = code.replace(/children:"৩০০ টাকা"\}\)," থেকে "/g, 'children:"২০০ টাকা"})," থেকে "');
    console.log(`[${filePath}] Replaced warning modal range text to ২০০ টাকা`);
    modified = true;
  }

  if (code.includes('পর্যন্ত। ৩০০ টাকা ডিপোজিট করলে সাথে সাথে')) {
    code = code.replace(/পর্যন্ত। ৩০০ টাকা ডিপোজিট করলে সাথে সাথে/g, 'পর্যন্ত। ২০০ টাকা ডিপোজিট করলে সাথে সাথে');
    console.log(`[${filePath}] Replaced warning modal note text to ২০০ টাকা`);
    modified = true;
  }

  if (code.includes('onClick:()=>{fi("300"),be(!1)}')) {
    code = code.replace(/onClick:\(\)=>\{fi\("300"\),be\(!1\)\}/g, 'onClick:()=>{fi("200"),be(!1)}');
    console.log(`[${filePath}] Replaced warning modal button action to select 200`);
    modified = true;
  }

  if (code.includes('"৳৩০০ সিলেক্ট করে এগিয়ে যান"')) {
    code = code.replace(/"৳৩০০ সিলেক্ট করে এগিয়ে যান"/g, '"৳২০০ সিলেক্ট করে এগিয়ে যান"');
    console.log(`[${filePath}] Replaced warning modal button label to ৳২০০`);
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
