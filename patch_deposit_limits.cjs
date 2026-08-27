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

  // 1. Update minimum deposit threshold from 300 to 200
  // Original: ee=L?500:300,W=L?5e5:25e3;
  code = code.replace(/ee=L\?500:300/g, "ee=L?500:200");

  // 2. Update limit label text
  // Original: children:"সীমা: ৳৩০০ - ৳২৫,০০০"
  code = code.replace(/সীমা: ৳৩০০ - ৳২৫,০০০/g, "সীমা: ৳২০০ - ৳২৫,০০০");

  // 3. Update warning modal text
  // Original: "৩০০ টাকা" decoration underline
  code = code.replace(/children:"৩০০ টাকা"/g, 'children:"২০০ টাকা"');
  // Original: "পর্যন্ত। ৩০০ টাকা ডিপোজিট করলে"
  code = code.replace(/পর্যন্ত। ৩০০ টাকা ডিপোজিট করলে/g, "পর্যন্ত। ২০০ টাকা ডিপোজিট করলে");

  // 4. Update the warning modal auto-fill action & button label
  // Original: onClick:()=>{fi("300"),be(!1)} ... "৳৩০০ সিলেক্ট করে এগিয়ে যান"
  code = code.replace(/fi\("300"\),be\(!1\)/g, 'fi("200"),be(!1)');
  code = code.replace(/৳৩০০ সিলেক্ট করে এগিয়ে যান/g, "৳২০০ সিলেক্ট করে এগিয়ে যান");

  // 5. Add 200 as a quick select option in ya array
  // Original: ya=[{amount:"500",displayOrig:"500",total:"500",bonusPercent:""}
  code = code.replace(
    /ya=\[\{amount:"500",displayOrig:"500",total:"500",bonusPercent:""\}/g,
    'ya=[{amount:"200",displayOrig:"200",total:"200",bonusPercent:""},{amount:"500",displayOrig:"500",total:"500",bonusPercent:""}'
  );

  fs.writeFileSync(file, code, "utf8");
  console.log(`Successfully patched deposit limits in ${file}`);
});
