const fs = require("fs");
["dist/index.html", "dist_backup/index.html"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");

  // Remove any previous custom labels
  html = html.replace(/<div class="sn-chat-floating-label"[\s\S]*?<\/div>/g, "");

  // The new label HTML
  const labelHTML = `<div class="sn-chat-floating-label" onclick="toggleSnWidget()" style="position: fixed; top: calc(52% + 34px); right: 40px; transform: translateX(50%); background: linear-gradient(135deg, #ff9900, #ff5500); color: #fff; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 15px rgba(255,153,0,0.4); border: 2px solid #fff; z-index: 99999; cursor: pointer; text-align: center; user-select: none; transition: transform 0.2s;" onmouseover="this.style.transform='translateX(50%) scale(1.05)'" onmouseout="this.style.transform='translateX(50%) scale(1)'">২৪/৭ লাইভ চ্যাট</div>`;

  html = html.replace(/<div class="sn-chat-btn"/, labelHTML + "\n        <div class=\"sn-chat-btn\"");

  fs.writeFileSync(file, html, "utf8");
  console.log("Updated", file);
});
