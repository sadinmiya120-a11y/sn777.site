const fs = require("fs");
["dist/index.html", "dist_backup/index.html"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");

  // Fix 100vh and 100vw issue
  html = html.replace(/width: 100vw;\s*height: 100vh;/g, "width: 100%;\n      height: 100%;\n      height: 100dvh;");
  
  // Make sure it doesn't get pushed out
  // The .sn-chat-box could also use `bottom: 0;`
  html = html.replace(/\.sn-chat-box \{([^\}]+)height: 100dvh;/g, ".sn-chat-box {$1height: 100%; height: 100dvh; bottom: 0;");

  fs.writeFileSync(file, html, "utf8");
  console.log("Patched", file);
});
