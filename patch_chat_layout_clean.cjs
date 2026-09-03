const fs = require("fs");
["dist/index.html", "dist_backup/index.html"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");

  // Clean up the weird double height injected previously
  html = html.replace(/height: 100%;\s*height: 100%;\s*height: 100dvh;\s*bottom: 0;/g, "height: 100%; height: 100dvh; bottom: 0;");

  fs.writeFileSync(file, html, "utf8");
});
