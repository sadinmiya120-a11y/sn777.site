const fs = require("fs");
["dist/index.html", "dist_backup/index.html"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");

  // Re-insert the chat box after the btn
  let idx = html.indexOf('২৪/৭ লাইভ চ্যাট</div>');
  if (idx !== -1) {
    let endOfBtn = html.indexOf('</div>', idx) + 6;
    endOfBtn = html.indexOf('</div>', endOfBtn) + 6; // closes sn-chat-btn wrapper
    
    // The chat box HTML to append
    const chatBoxHTML = `
    <div class="sn-chat-box" id="snChatBox">
      <div class="sn-chat-header">
        <div class="title-area">
          <div class="status-dot"></div>
          <div>
            <h4>Sn777.site Support</h4>
            <p>● ২৪/৭ লাইভ সাপোর্ট অনলাইন</p>
          </div>
        </div>
        <div class="sn-close-btn" onclick="toggleSnWidget(false)">✕</div>
      </div>
      <div class="sn-msg-container" id="snMsgCont">
        <div class="sn-msg sn-received" style="margin-top:auto;">
          স্বাগতম! আমি Sn777 সাপোর্ট। আপনাকে কীভাবে সাহায্য করতে পারি?
          <span class="sn-msg-time" id="welcomeTime"></span>
        </div>
      </div>
      <div class="sn-chat-footer">
        <label for="snImageInput" class="sn-attach-btn" title="ছবি পাঠান">📎</label>
        <input type="file" id="snImageInput" accept="image/*" style="display:none;" onchange="handleSnImageUpload(event)">
        <input type="text" id="snMsgInput" placeholder="এখানে মেসেজ লিখুন..." onkeypress="handleSnKeyPress(event)">
        <button class="sn-send-btn" onclick="sendSnMessage()">পাঠান</button>
      </div>
    </div>`;

    // Only add if not already there
    if (!html.includes('id="snChatBox"')) {
       html = html.substring(0, endOfBtn) + chatBoxHTML + html.substring(endOfBtn);
       fs.writeFileSync(file, html, "utf8");
       console.log("Restored chat box in", file);
    }
  }
});
