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

      const target = `+encodeURIComponent(Te);else{throw new Error((_initData&&_initData.error)||"পেমেন্ট গেটওয়ে সমস্যা");}`;
      if (content.includes(target)) {
        content = content.split(target).join(`+encodeURIComponent(Te);`);
        modified = true;
        console.log(`Fixed target in: ${fp}`);
      }

      if (modified) {
        fs.writeFileSync(fp, content, "utf8");
      }
    }
  }
}

fixDir("dist");
fixDir("dist_backup");
