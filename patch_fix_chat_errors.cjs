const fs = require("fs");
["dist/index.html", "dist_backup/index.html"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");

  // Fix onclick="sendSnMessage()" -> onclick="sendSnChatMessage()"
  html = html.replace(/sendSnMessage\(\)/g, "sendSnChatMessage()");

  // Fix onchange="handleSnImageUpload(event)" -> onchange="sendSnImage(this)"
  html = html.replace(/handleSnImageUpload\(event\)/g, "sendSnImage(this)");

  // Fix onkeypress="handleSnKeyPress(event)" -> onkeypress="if(event.key==='Enter') sendSnChatMessage()"
  html = html.replace(/handleSnKeyPress\(event\)/g, "if(event.key==='Enter') sendSnChatMessage()");
  
  // Fix snMsgCont -> snMsgContainer in HTML (the js uses snMsgContainer)
  html = html.replace(/id="snMsgCont"/g, 'id="snMsgContainer"');

  fs.writeFileSync(file, html, "utf8");
  console.log("Fixed errors in", file);
});
