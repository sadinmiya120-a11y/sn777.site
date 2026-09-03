const fs = require("fs");
["dist/index.html", "dist_backup/index.html"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");

  // Find the exact block we want to replace
  const targetLogic = `if (msgText.toLowerCase().startsWith(prefix.toLowerCase())) {
                    const replyText = msgText.substring(prefix.length).trim();
                    appendSnBubble(replyText, "admin");
                  }`;
                  
  const replacementLogic = `if (msgText.toLowerCase().startsWith(prefix.toLowerCase())) {
                    const replyText = msgText.substring(prefix.length).trim();
                    if (replyText.toUpperCase() === "CLEAR") {
                      const container = document.getElementById("snMsgContainer");
                      if (container) {
                        container.innerHTML = '<div class="sn-msg sn-received" style="margin-top:auto;">স্বাগতম! আমি Sn777 সাপোর্ট। আপনাকে কীভাবে সাহায্য করতে পারি?<span class="sn-msg-time"></span></div>';
                      }
                      try {
                        const uInfo = getUserDetails();
                        localStorage.removeItem("sn777_chat_history_" + uInfo.userId);
                      } catch(e) {}
                    } else {
                      appendSnBubble(replyText, "admin");
                    }
                  }`;

  html = html.replace(targetLogic, replacementLogic);
  fs.writeFileSync(file, html, "utf8");
  console.log("Added CLEAR command support to", file);
});
