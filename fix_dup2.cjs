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

      const target = 'রেজিস্ট্রেশন লিঙ্ক: ${E}`)রেজিস্ট্রেশন লিঙ্ক: ${E}`)';
      if (content.includes(target)) {
        content = content.split(target).join('রেজিস্ট্রেশন লিঙ্ক: ${E}`)');
        modified = true;
        console.log("Fixed dup2 in:", fp);
      }

      // Also check if there is :Z(`${L} ...
      const target2 = ':Z(`${L} রেজিস্ট্রেশন লিঙ্ক: ${E}`)রেজিস্ট্রেশন লিঙ্ক: ${E}`';
      if (content.includes(target2)) {
        content = content.split(target2).join(':Z(`${L} রেজিস্ট্রেশন লিঙ্ক: ${E}`');
        modified = true;
        console.log("Fixed dup3 in:", fp);
      }

      if (modified) {
        fs.writeFileSync(fp, content, "utf8");
      }
    }
  }
}

fixDir("dist");
fixDir("dist_backup");
