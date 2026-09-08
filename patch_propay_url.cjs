const fs = require("fs");
["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");
  
  // Replace the hardcoded run.app URL for callback
  code = code.replace(/https:\/\/sn777-site-864935185164\.us-west1\.run\.app\/callback\.php/g, "https://sn777.site/callback.php");
  
  // Also replace any sendBeacon hardcoded URL
  code = code.replace(/https:\/\/sn777-site-864935185164\.us-west1\.run\.app\/api\/record-transaction/g, "https://sn777.site/api/record-transaction");

  // Add pending order recovery fallback when returning to ?m=1 without order_no
  if (!code.includes('if(!L&&ee==="1")')) {
    code = code.replace(
      'ee=E.get("m");if(L&&(L.startsWith("deposit_")||L.startsWith("ORD"))){',
      'ee=E.get("m");if(!L&&ee==="1"){try{const _po=JSON.parse(localStorage.getItem("sn777_pending_order")||"{}");if(_po&&_po.order_no)L=_po.order_no;}catch(e){}}if(L&&(L.startsWith("deposit_")||L.startsWith("ORD"))){'
    );
  }

  fs.writeFileSync(file, code, "utf8");
  console.log("Patched", file);
});
