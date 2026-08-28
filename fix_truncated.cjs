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

      const target = ':Z(`${L}';
      if (content.includes(target)) {
        // Let us replace with proper closing
        content = content.split(target).join(':Z(`${L} রেজিস্ট্রেশন লিঙ্ক: ${E}`)');
        modified = true;
        console.log("Fixed truncated Z call in:", fp);
      }

      if (modified) {
        fs.writeFileSync(fp, content, "utf8");
      }
    }
  }
}

fixDir("dist");
fixDir("dist_backup");
