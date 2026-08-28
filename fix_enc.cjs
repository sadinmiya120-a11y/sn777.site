const fs = require("fs");
const path = require("path");

function fixDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) {
      fixDir(fp);
    } else if (f.endsWith(".js") || f.endsWith(".cjs")) {
      let content = fs.readFileSync(fp, "utf8");
      let modified = false;

      const target = 'ee=encodeURIComponent(`SN777 সাইন আপ করলেই ৭৭৭ টাকা বোনাস সম্পূর্ণ ফ্রিতে';
      if (content.includes(target)) {
        let idx = content.indexOf(target);
        let endIdx = content.indexOf(')`,', idx);
        if (endIdx === -1) endIdx = content.indexOf('`)', idx);
        if (endIdx !== -1) {
          const replacement = 'ee=encodeURIComponent(`SN777 সাইন আপ করলেই ৭৭৭ টাকা বোনাস সম্পূর্ণ ফ্রিতে - প্রতিটি রেফারেলের জন্য আপনি মোট ৳ ২৫০.০০ বোনাস পাবেন! বন্ধু সাইন আপ করলে ৫০ টাকা এবং প্রথম ডিপোজিট করলে বাকি ২০০ টাকা আপনার একাউন্টে যোগ হবে।`)';
          content = content.substring(0, idx) + replacement + content.substring(endIdx + 2);
          modified = true;
          console.log("Fixed encodeURIComponent template literal in:", fp);
        }
      }

      if (modified) {
        fs.writeFileSync(fp, content, "utf8");
      }
    }
  }
}

fixDir("dist");
fixDir("dist_backup");
