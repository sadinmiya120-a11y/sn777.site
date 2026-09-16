const fs = require("fs");
const files = ["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, "utf8");
    const target = 'onClick:()=>setDepCh("gopay"),className:';
    const replacement = 'onClick:()=>setDepCh("gopay"),style:{display:"none"},className:';
    
    if (content.includes(target)) {
        content = content.replace(new RegExp(target.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "g"), replacement);
        fs.writeFileSync(file, content);
        console.log("Hidden ProPay button in " + file);
    } else {
        console.log("Target not found in " + file);
    }
  }
}
