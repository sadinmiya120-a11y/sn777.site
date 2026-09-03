const fs = require('fs');

["dist_backup/assets/index-sn777-v5.js", "dist/assets/index-sn777-v5.js"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let js = fs.readFileSync(file, "utf8");
  
  let target = "!no&&o.jsxs(\"div\",{className:\"fixed right-3 sm:right-4 z-[999] flex flex-col gap-6 items-end select-none\", style:{top:\"60%\", transform:\"translateY(-50%)\"},";
  let idx = js.indexOf(target);
  if (idx !== -1) {
    let start = js.lastIndexOf("!", idx);
    // Trace brackets
    let depth = 0;
    let end = -1;
    let started = false;
    for (let i = start; i < js.length; i++) {
      let c = js[i];
      if (c === "(" || c === "[" || c === "{") {
        depth++;
        started = true;
      } else if (c === ")" || c === "]" || c === "}") {
        depth--;
      }
      if (started && depth === 0) {
        end = i + 1;
        break;
      }
    }
    if (end !== -1) {
      js = js.substring(0, start) + "null" + js.substring(end);
      fs.writeFileSync(file, js, "utf8");
      console.log("Successfully removed top-right floating icons from", file);
    }
  }
});
