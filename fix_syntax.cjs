const fs = require("fs");
const path = require("path");

function fixFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) {
      fixFiles(fp);
    } else if (f.endsWith(".js") || f.endsWith(".cjs")) {
      let content = fs.readFileSync(fp, "utf8");
      let changed = false;

      // Let us locate children:/iPad|iPhone|iPod/.test(...) ? [ ... ] : [ ... ]
      // We want to wrap the whole ternary in parentheses: children:(... ? [...] : [...])
      
      const searchStr = "children:/iPad|iPhone|iPod/.test(navigator.userAgent) ? [";
      let idx = content.indexOf(searchStr);
      while (idx !== -1) {
        // Find the matching end of the ternary:
        // We know it starts with `children:/iPad|iPhone|iPod/.test(navigator.userAgent) ? [`
        // Let us find where the false array `] [ ... ] : [ ... ]` ends.
        // Specifically, the true array ends with `]`, then ` : [`, then the false array ends with `]`.
        // We can scan forward from idx to find the closing bracket `]` of the false array.
        let bracketCount = 0;
        let foundFirstTrueArray = false;
        let colonSeen = false;
        let endIdx = -1;

        for (let i = idx + searchStr.length - 1; i < content.length; i++) {
          const ch = content[i];
          if (ch === '[') bracketCount++;
          else if (ch === ']') {
            bracketCount--;
            if (bracketCount === 0) {
              if (!colonSeen) {
                colonSeen = true;
              } else {
                endIdx = i;
                break;
              }
            }
          }
        }

        if (endIdx !== -1) {
          // Replace from idx + "children:".length to endIdx + 1 with ( ... )
          const prefix = content.substring(0, idx + "children:".length);
          const ternaryExpr = content.substring(idx + "children:".length, endIdx + 1);
          const suffix = content.substring(endIdx + 1);

          content = prefix + "(" + ternaryExpr + ")" + suffix;
          changed = true;
          console.log("Successfully wrapped ternary in parentheses in:", fp);
        } else {
          console.log("Could not find end of ternary in:", fp);
        }

        idx = content.indexOf(searchStr, idx + 50);
      }

      if (changed) {
        fs.writeFileSync(fp, content, "utf8");
      }
    }
  }
}

fixFiles("dist");
fixFiles("dist_backup");
