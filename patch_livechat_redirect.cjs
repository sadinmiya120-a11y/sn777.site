const fs = require("fs");
const files = ["dist/index.html", "dist_backup/index.html"];
for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, "utf8");
    // Replace onclick="toggleSnWidget()" in sn-chat-btn with window.open
    content = content.replace(
      /<div class="sn-chat-btn" onclick="toggleSnWidget\(\)"/g,
      '<div class="sn-chat-btn" onclick="window.open(\'https://t.me/sn777top\', \'_blank\')"'
    );
    // There may also be a label patch in another script but they usually refer to toggleSnWidget()
    content = content.replace(
      /onclick="toggleSnWidget\(\)"/g,
      'onclick="window.open(\'https://t.me/sn777top\', \'_blank\')"'
    );
    fs.writeFileSync(file, content);
    console.log("Patched live chat link in", file);
  }
}
