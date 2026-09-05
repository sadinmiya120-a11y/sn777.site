const fs = require("fs");
["dist/index.html", "dist_backup/index.html"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");

  // Remove the old base and media query
  const oldBaseStart = html.indexOf(".sn-chat-box {");
  const oldBaseEnd = html.indexOf("@keyframes snFadeIn");
  
  if (oldBaseStart > -1 && oldBaseEnd > -1) {
    const newCss = `.sn-chat-box {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 100%;
      height: 100dvh;
      background: #121418;
      z-index: 999999;
      flex-direction: column;
      overflow: hidden;
      animation: snFadeIn 0.2s ease-out;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    @media (min-width: 768px) {
      .sn-chat-box {
        bottom: 24px !important;
        right: 24px !important;
        left: auto !important;
        top: auto !important;
        width: 380px !important;
        height: 600px !important;
        max-height: calc(100vh - 48px) !important;
        border-radius: 16px !important;
        box-shadow: 0 12px 40px rgba(0,0,0,0.5) !important;
        border: 1px solid #272a32 !important;
      }
    }
    `;
    
    html = html.substring(0, oldBaseStart) + newCss + html.substring(oldBaseEnd);
    fs.writeFileSync(file, html, "utf8");
    console.log("Patched", file);
  } else {
    console.log("Could not find css block in", file);
  }
});
