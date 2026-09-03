const fs = require("fs");
["dist/index.html", "dist_backup/index.html"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");

  // Revert back to the orange/red combined design
  const previousHTML = `<div class="sn-chat-btn" onclick="toggleSnWidget()" title="লাইভ সাপোর্ট" style="position: fixed; top: 52%; right: 12px; transform: translateY(-50%); width: auto; height: auto; background: transparent; border: none; box-shadow: none; border-radius: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 99999; gap: 0;" onmouseover="this.style.transform='translateY(-50%) scale(1.05)'" onmouseout="this.style.transform='translateY(-50%) scale(1)'">
    <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #ff9900, #ff5500); color: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 6px 20px rgba(255, 153, 0, 0.45); border: 2px solid #ffffff; z-index: 2;">
        💬
    </div>
    <div style="background: linear-gradient(135deg, #ff9900, #ff5500); border: 1.5px solid #ffffff; color: #ffffff; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 900; white-space: nowrap; margin-top: -10px; z-index: 1; box-shadow: 0 4px 10px rgba(255,153,0,0.4);">২৪/৭ লাইভ চ্যাট</div>
</div>`;

  // We replace the current premium `<div class="sn-chat-btn"...</div>` (multiline) with previousHTML
  html = html.replace(/<div class="sn-chat-btn"[^>]*>.*?<\/div>\s*<\/div>\s*<\/div>/s, previousHTML);

  fs.writeFileSync(file, html, "utf8");
  console.log("Updated", file);
});
