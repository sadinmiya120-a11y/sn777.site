const fs = require("fs");

function patchHtmlFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf8");

  // 1. Replace sendSnImage implementation to use /api/send-telegram-photo
  const oldSendImageRegex = /window\.sendSnImage\s*=\s*function\(fileInput\)\s*\{[\s\S]*?fileInput\.value\s*=\s*""\s*;\s*\};/;
  const newSendImage = `window.sendSnImage = function(fileInput) {
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
          const imgDataUrl = e.target.result;
          appendSnBubble('<img src="' + imgDataUrl + '" />', "user");
          const userInfo = getUserDetails();
          updateUserStrip();
          fetch("/api/send-telegram-photo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: userInfo.name,
              userId: userInfo.userId,
              balance: userInfo.balance,
              deposit: userInfo.deposit,
              imageBase64: imgDataUrl
            })
          }).catch(function(err) {
            console.error("Error sending photo:", err);
          });
        };
        reader.readAsDataURL(file);
        fileInput.value = "";
      };`;

  if (oldSendImageRegex.test(content)) {
    content = content.replace(oldSendImageRegex, newSendImage);
    console.log(`[OK] Replaced sendSnImage in ${filePath}`);
  } else {
    console.warn(`[WARN] sendSnImage pattern not found in ${filePath}`);
  }

  // 2. Replace fetchTelegramReplies implementation to use /api/telegram-replies
  const oldFetchRepliesRegex = /let snLastUpdateId = 0;[\s\S]*?function fetchTelegramReplies\(\)\s*\{[\s\S]*?\}\s*loadSavedMessages\(\);/;
  const newFetchReplies = `const deliveredReplyIds = new Set();
      function fetchTelegramReplies() {
        const userInfo = getUserDetails();
        if (!userInfo || !userInfo.userId) return;
        fetch("/api/telegram-replies?userId=" + encodeURIComponent(userInfo.userId))
          .then(function(res) { return res.json(); })
          .then(function(data) {
            if (data && data.success && Array.isArray(data.replies)) {
              data.replies.forEach(function(reply) {
                if (deliveredReplyIds.has(reply.id)) return;
                deliveredReplyIds.add(reply.id);
                const replyText = reply.text;
                if (replyText.toUpperCase() === "CLEAR") {
                  const container = document.getElementById("snMsgContainer");
                  if (container) {
                    container.innerHTML = '<div class="sn-msg-bubble sn-msg-admin">স্বাগতম! আমি Sn777 সাপোর্টটিম থেকে আপনাকে কীভাবে সাহায্য করতে পারি?<span class="sn-msg-time"></span></div>';
                  }
                  try {
                    localStorage.removeItem("sn777_chat_history_" + userInfo.userId);
                  } catch(e) {}
                } else {
                  appendSnBubble(replyText, "admin", reply.time);
                }
              });
            }
          })
          .catch(function(err) {});
      }
      loadSavedMessages();`;

  if (oldFetchRepliesRegex.test(content)) {
    content = content.replace(oldFetchRepliesRegex, newFetchReplies);
    console.log(`[OK] Replaced fetchTelegramReplies in ${filePath}`);
  } else {
    console.warn(`[WARN] fetchTelegramReplies pattern not found in ${filePath}`);
  }

  fs.writeFileSync(filePath, content, "utf8");
}

patchHtmlFile("dist/index.html");
patchHtmlFile("dist_backup/index.html");
