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
      
      // Let us check for Z(`... or similar where backticks contain raw newlines
      // Specifically, let us replace the broken share string:
      // Z(`SN777 সাইন আপ করলেই ৭৭৭ টাকা বোনাস...`)
      
      // We can search for `Z(` and clean up any newlines inside backticks
      let modified = false;
      
      // Let us parse or regex replace template literals that have raw newlines
      // Or specifically replace the known broken chunks:
      const targetSub = 'Z(`SN777 সাইন আপ করলেই ৭৭৭ টাকা বোনাস সম্পূর্ণ ফ্রিতে';
      if (content.includes(targetSub)) {
        // Let us replace the entire Z(...) call with a clean one
        // Find the matching closing backtick of this Z call
        let idx = content.indexOf(targetSub);
        let endIdx = content.indexOf(')`,', idx);
        if (endIdx === -1) endIdx = content.indexOf('`)', idx);
        if (endIdx !== -1) {
          const cleanCall = 'Z(`SN777 সাইন আপ করলেই ৭৭৭ টাকা বোনাস সম্পূর্ণ ফ্রিতে - প্রতিটি রেফারেলের জন্য আপনি মোট ৳ ২৫০.০০ বোনাস পাবেন! বন্ধু সাইন আপ করলে ৫০ টাকা এবং প্রথম ডিপোজিট করলে বাকি ২০০ টাকা আপনার একাউন্টে যোগ হবে। রেজিস্ট্রেশন লিঙ্ক: ${E}`)';
          content = content.substring(0, idx) + cleanCall + content.substring(endIdx + 2);
          modified = true;
          console.log("Fixed Z call in:", fp);
        }
      }

      // Also check other occurrences of Z(` or similar sharing texts
      const targetSub2 = 'text:L,url:E}).catch(()=>{});Z(`${L}';
      if (content.includes(targetSub2)) {
        let idx = content.indexOf(targetSub2);
        let endIdx = content.indexOf(')})', idx);
        if (endIdx !== -1) {
          const cleanCall2 = 'text:L,url:E}).catch(()=>{});Z(`${L} রেজিস্ট্রেশন লিঙ্ক: ${E}`)';
          content = content.substring(0, idx) + cleanCall2 + content.substring(endIdx + 3);
          modified = true;
          console.log("Fixed Z call 2 in:", fp);
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
