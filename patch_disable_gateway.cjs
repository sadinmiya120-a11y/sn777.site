const fs = require("fs");
const files = ["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, "utf8");
    const target = 'Kr=async()=>{if(window._sn777_dep_submitting)return;';
    const replacement = 'Kr=async()=>{Fe("পেমেন্ট গেটওয়েটি এখন প্যানেল থেকে বন্ধ করে দিয়েছে, দয়া করে এডমিনের সাথে যোগাযোগ করুন।");Je(!0);return;if(window._sn777_dep_submitting)return;';
    
    if (content.includes(target)) {
        content = content.replace(target, replacement);
        fs.writeFileSync(file, content);
        console.log("Gateway disabled in " + file);
    } else {
        console.log("Target not found in " + file);
    }
  }
}
