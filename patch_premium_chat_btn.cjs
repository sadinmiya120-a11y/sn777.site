const fs = require("fs");
["dist/index.html", "dist_backup/index.html"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");

  // Remove the previous floating label
  html = html.replace(/<div class="sn-chat-floating-label"[\s\S]*?<\/div>/g, "");

  // Find the sn-chat-btn and replace it with a premium combined widget
  // Also we must remove the CSS styling for .sn-chat-btn and .sn-chat-btn:hover to prevent conflicts.
  // Actually, overriding with inline styles works, but let's just clean up the css a bit or just use !important inline.
  
  // The premium button HTML (we keep the class sn-chat-btn so click handlers work, but inline styles override)
  const premiumHTML = `<div class="sn-chat-btn" onclick="toggleSnWidget()" title="লাইভ সাপোর্ট" style="position: fixed; top: 52%; right: 12px; transform: translateY(-50%); width: auto; height: auto; background: transparent; border: none; box-shadow: none; border-radius: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 99999; gap: 0;" onmouseover="this.style.transform='translateY(-50%) scale(1.05)'" onmouseout="this.style.transform='translateY(-50%) scale(1)'">
    <div style="width: 56px; height: 56px; background: linear-gradient(to bottom, #fce07c, #d4af37, #8e6315); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(212,175,55,0.6); border: 2px solid #fff; z-index: 2;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#000"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 12H7c-.55 0-1-.45-1-1s.45-1 1-1h10c.55 0 1 .45 1 1s-.45 1-1 1zm0-3H7c-.55 0-1-.45-1-1s.45-1 1-1h10c.55 0 1 .45 1 1s-.45 1-1 1zm0-3H7c-.55 0-1-.45-1-1s.45-1 1-1h10c.55 0 1 .45 1 1s-.45 1-1 1z"/></svg>
    </div>
    <div style="background: linear-gradient(to right, #1e2029, #0d0f12); border: 1.5px solid #d4af37; color: #ffe87a; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 900; white-space: nowrap; margin-top: -10px; z-index: 1; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">২৪/৭ লাইভ চ্যাট</div>
</div>`;

  // We replace the `<div class="sn-chat-btn"...>💬</div>` with premiumHTML
  html = html.replace(/<div class="sn-chat-btn"[^>]*>.*?<\/div>/s, premiumHTML);

  fs.writeFileSync(file, html, "utf8");
  console.log("Updated", file);
});
