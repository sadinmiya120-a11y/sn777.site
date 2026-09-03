const fs = require("fs");
["dist/index.html", "dist_backup/index.html"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");

  // Remove old telegram buttons if they exist
  html = html.replace(/<div class="sn-tg-btn"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, "");
  
  const tgBtnHTML = `
<div class="sn-tg-btn" onclick="window.open('https://t.me/sn777top', '_blank')" title="টেলিগ্রাম সাপোর্ট" style="position: fixed; top: calc(52% + 80px); right: 12px; transform: translateY(-50%); width: auto; height: auto; background: transparent; border: none; box-shadow: none; border-radius: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 99999; gap: 0; cursor: pointer;" onmouseover="this.style.transform='translateY(-50%) scale(1.05)'" onmouseout="this.style.transform='translateY(-50%) scale(1)'">
    <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #0088cc, #24a1de); color: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 6px 20px rgba(0, 136, 204, 0.45); border: 2px solid #ffffff; z-index: 2;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.96-.63-.34-.98.22-1.56.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.06-.19-.07-.05-.17-.03-.25-.01-.11.03-1.78 1.14-5.06 3.34-.48.33-.92.49-1.32.48-.43-.01-1.24-.24-1.84-.44-.74-.24-1.32-.37-1.27-.79.03-.22.33-.44.9-.68 3.53-1.53 5.88-2.54 7.05-3.04 3.36-1.42 4.05-1.66 4.5-1.66.1 0 .31.02.44.11.12.08.19.2.21.32.02.08.01.2.01.34z"/></svg>
    </div>
    <div style="background: linear-gradient(135deg, #0088cc, #24a1de); border: 1.5px solid #ffffff; color: #ffffff; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 900; white-space: nowrap; margin-top: -10px; z-index: 1; box-shadow: 0 4px 10px rgba(0, 136, 204, 0.4);">টেলিগ্রাম সাপোর্ট</div>
</div>`;

  // Find the end of the Live Chat button block and append the Telegram button.
  // The live chat button block has `২৪/৭ লাইভ চ্যাট</div></div>` at the end.
  const marker = '২৪/৭ লাইভ চ্যাট</div>\n</div>';
  const marker2 = '২৪/৭ লাইভ চ্যাট</div></div>';
  
  if (html.includes(marker)) {
    html = html.replace(marker, marker + "\n" + tgBtnHTML);
  } else if (html.includes(marker2)) {
    html = html.replace(marker2, marker2 + "\n" + tgBtnHTML);
  } else {
    // try finding the closing tag of .sn-chat-btn
    let match = html.match(/<div class="sn-chat-btn"[^>]*>.*?<\/div>\s*<\/div>\s*<\/div>/s);
    if (match) {
        html = html.replace(match[0], match[0] + "\n" + tgBtnHTML);
    } else {
        console.log("Could not find the injection point in", file);
    }
  }

  fs.writeFileSync(file, html, "utf8");
  console.log("Updated", file);
});
