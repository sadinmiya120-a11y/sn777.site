const fs = require("fs");
const esbuild = require("esbuild");

const files = ["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  const targetStr = `const isWth=e=>{if(!e)return!1;const _t=String(e.type||e.txType||"").toLowerCase().trim();if(_t==="withdraw"||_t==="withdrawal"||_t==="উইথড্র"||_t==="উত্তোলন"||_t==="payout")return!0;if(e.withdrawNo!==void 0&&e.withdrawNo!==null&&e.withdrawNo!=="")return!0;const _id=String(e.id||e.order_no||e.orderId||"").toLowerCase();if(_id.startsWith("withdraw")||_id.startsWith("wth")||_id.includes("withdraw"))return!0;const _desc=String(e.description||e.desc||e.title||"").toLowerCase();if(_desc.includes("উইথড্র")||_desc.includes("উত্তোলন")||_desc.includes("withdraw"))return!0;if(e.bankName||e.accountNumber||e.accountHolder)return!0;return!1};const isDep=e=>{if(!e)return!1;if(isWth(e))return!1;const _t=String(e.type||e.txType||"").toLowerCase().trim();if(_t==="deposit"||_t==="ডিপোজিট"||_t==="payin"||_t==="recharge")return!0;if(e.depositNo!==void 0&&e.depositNo!==null&&e.depositNo!=="")return!0;const _id=String(e.id||e.order_no||e.orderId||"").toLowerCase();if(_id.startsWith("ord")||_id.startsWith("dep")||_id.includes("dep")||_id.includes("deposit"))return!0;const _desc=String(e.description||e.desc||e.title||"").toLowerCase();if(_desc.includes("ডিপোজিট")||_desc.includes("deposit")||_desc.includes("বোনাস")||_desc.includes("bonus")||_desc.includes("রিচার্জ"))return!0;if(e.senderNumber||e.transactionId||e.channel||e.trxId)return!0;return!0};`;

  const replacementStr = `const isWth=e=>{if(!e)return!1;const _t=String(e.type||e.txType||"").toLowerCase().trim();if(_t==="deposit"||_t==="ডিপোজিট"||_t==="payin"||_t==="recharge"||_t==="bonus"||_t==="বোনাস")return!1;if(e.depositNo!==void 0&&e.depositNo!==null&&e.depositNo!=="")return!1;const _id=String(e.id||e.order_no||e.orderId||"").toLowerCase();if(_id.startsWith("ord")||_id.startsWith("dep"))return!1;const _desc=String(e.description||e.desc||e.title||"").toLowerCase();if(_desc.includes("ডিপোজিট")||_desc.includes("deposit")||_desc.includes("রিচার্জ")||_desc.includes("বোনাস")||_desc.includes("propay"))return!1;if(_t==="withdraw"||_t==="withdrawal"||_t==="উইথড্র"||_t==="উত্তোলন"||_t==="payout"||_t==="cashout")return!0;if(e.withdrawNo!==void 0&&e.withdrawNo!==null&&e.withdrawNo!=="")return!0;if(_id.startsWith("withdraw")||_id.startsWith("wth")||_id.includes("withdraw"))return!0;if(_desc.includes("উইথড্র")||_desc.includes("উত্তোলন")||_desc.includes("withdraw")||_desc.includes("ক্যাশআউট"))return!0;return!1};const isDep=e=>{if(!e)return!1;if(isWth(e))return!1;const _t=String(e.type||e.txType||"").toLowerCase().trim();if(_t==="deposit"||_t==="ডিপোজিট"||_t==="payin"||_t==="recharge"||_t==="bonus"||_t==="বোনাস")return!0;if(e.depositNo!==void 0&&e.depositNo!==null&&e.depositNo!=="")return!0;const _id=String(e.id||e.order_no||e.orderId||"").toLowerCase();if(_id.startsWith("ord")||_id.startsWith("dep")||_id.includes("dep")||_id.includes("deposit"))return!0;const _desc=String(e.description||e.desc||e.title||"").toLowerCase();if(_desc.includes("ডিপোজিট")||_desc.includes("deposit")||_desc.includes("বোনাস")||_desc.includes("bonus")||_desc.includes("রিচার্জ")||_desc.includes("propay"))return!0;return!0};`;

  if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    modified = true;
    console.log(`[Fixed isWth & isDep] in ${file}`);
  } else {
    console.log(`Target string not found in ${file}`);
  }

  if (modified) {
    try {
      esbuild.transformSync(code, { loader: "js" });
      fs.writeFileSync(file, code, "utf8");
      console.log(`[SAVED] ${file}`);
    } catch (e) {
      console.error(`[ERROR] in ${file}:`, e.message);
    }
  }
}
