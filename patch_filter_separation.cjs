const fs = require("fs");
const esbuild = require("esbuild");

const files = ["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  // 1. Update isWth, isDep and filtering in History modal
  const oldLogic = `const isWth=e=>{if(!e)return!1;const _t=String(e.type||e.txType||"").toLowerCase().trim();if(_t==="withdraw"||_t==="withdrawal"||_t==="উইথড্র"||_t==="উত্তোলন")return!0;if(e.withdrawNo!==void 0&&e.withdrawNo!==null&&e.withdrawNo!=="")return!0;const _id=String(e.id||e.order_no||e.orderId||"").toLowerCase();if(_id.startsWith("withdraw")||_id.includes("wth"))return!0;const _desc=String(e.description||e.desc||e.title||"").toLowerCase();if(_desc.includes("উইথড্র")||_desc.includes("উত্তোলন")||_desc.includes("withdraw"))return!0;if(e.bankName||e.accountNumber||e.accountHolder)return!0;return!1};const isDep=e=>{if(!e)return!1;if(isWth(e))return!1;const _t=String(e.type||e.txType||"").toLowerCase().trim();if(_t==="deposit"||_t==="ডিপোজিট")return!0;if(e.depositNo!==void 0&&e.depositNo!==null&&e.depositNo!=="")return!0;const _id=String(e.id||e.order_no||e.orderId||"").toLowerCase();if(_id.startsWith("ord")||_id.startsWith("dep")||_id.includes("dep"))return!0;const _desc=String(e.description||e.desc||e.title||"").toLowerCase();if(_desc.includes("ডিপোজিট")||_desc.includes("deposit")||_desc.includes("বোনাস")||_desc.includes("bonus"))return!0;return!0};`;

  const newLogic = `const isWth=e=>{if(!e)return!1;const _t=String(e.type||e.txType||"").toLowerCase().trim();if(_t==="withdraw"||_t==="withdrawal"||_t==="উইথড্র"||_t==="উত্তোলন"||_t==="payout")return!0;if(e.withdrawNo!==void 0&&e.withdrawNo!==null&&e.withdrawNo!=="")return!0;const _id=String(e.id||e.order_no||e.orderId||"").toLowerCase();if(_id.startsWith("withdraw")||_id.startsWith("wth")||_id.includes("withdraw"))return!0;const _desc=String(e.description||e.desc||e.title||"").toLowerCase();if(_desc.includes("উইথড্র")||_desc.includes("উত্তোলন")||_desc.includes("withdraw"))return!0;if(e.bankName||e.accountNumber||e.accountHolder)return!0;return!1};const isDep=e=>{if(!e)return!1;if(isWth(e))return!1;const _t=String(e.type||e.txType||"").toLowerCase().trim();if(_t==="deposit"||_t==="ডিপোজিট"||_t==="payin"||_t==="recharge")return!0;if(e.depositNo!==void 0&&e.depositNo!==null&&e.depositNo!=="")return!0;const _id=String(e.id||e.order_no||e.orderId||"").toLowerCase();if(_id.startsWith("ord")||_id.startsWith("dep")||_id.includes("dep")||_id.includes("deposit"))return!0;const _desc=String(e.description||e.desc||e.title||"").toLowerCase();if(_desc.includes("ডিপোজিট")||_desc.includes("deposit")||_desc.includes("বোনাস")||_desc.includes("bonus")||_desc.includes("রিচার্জ"))return!0;if(e.senderNumber||e.transactionId||e.channel||e.trxId)return!0;return!0};`;

  if (code.includes(oldLogic)) {
    code = code.replace(oldLogic, newLogic);
    modified = true;
    console.log(`[1. History Logic] Updated isWth and isDep in ${file}`);
  }

  // Ensure filter is strict:
  const oldFilter = `const d=xn.filter(e=>{if(!e)return!1;if(gn==="all")return!0;if(gn==="withdraw")return isWth(e);if(gn==="deposit")return isDep(e);return!0});`;
  const newFilter = `const d=xn.filter(e=>{if(!e)return!1;if(gn==="withdraw")return isWth(e);if(gn==="deposit")return isDep(e)&&!isWth(e);if(gn==="all")return isWth(e)||isDep(e)||!0;return!0});`;

  if (code.includes(oldFilter)) {
    code = code.replace(oldFilter, newFilter);
    modified = true;
    console.log(`[2. History Filter] Updated filter strictness in ${file}`);
  }

  // 3. Ensure Account page has clear cards for Deposit History, Withdraw History, and All Records
  const oldSingleAccCard = `o.jsxs("div",{onClick:()=>{refreshUserTx();Mt(!0);},className:"p-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-3xl border border-blue-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm",children:[o.jsxs("div",{className:"flex items-center gap-4",children:[o.jsx("div",{className:"bg-[#005ba1] p-2.5 rounded-2xl shadow-sm",children:o.jsx(Y2,{className:"text-yellow-400 size-5"})}),o.jsxs("div",{children:[o.jsx("h4",{className:"text-slate-800 font-black text-sm",children:"ট্রানজেকশন রেকর্ড"}),o.jsx("p",{className:"text-slate-500 text-[10px] font-bold",children:"সকল ডিপোজিট ও উইথড্র হিস্টোরি"})]})]}),o.jsx(Ul,{className:"text-[#005ba1]",size:18})]}),`;

  const newMultiAccCards = `o.jsxs("div",{className:"flex flex-col gap-2.5",children:[o.jsxs("div",{onClick:()=>{refreshUserTx();hi("deposit");Mt(!0);},className:"p-3.5 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border border-emerald-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm",children:[o.jsxs("div",{className:"flex items-center gap-3.5",children:[o.jsx("div",{className:"bg-emerald-600 p-2.5 rounded-xl shadow-sm text-white",children:o.jsx(W2,{size:18})}),o.jsxs("div",{children:[o.jsx("h4",{className:"text-slate-800 font-black text-sm",children:"ডিপোজিট হিস্টোরি"}),o.jsx("p",{className:"text-slate-500 text-[10px] font-bold",children:"শুধুমাত্র ডিপোজিট ও রিচার্জ রেকর্ডসমূহ"})]})]}),o.jsx(Ul,{className:"text-emerald-600",size:18})]}),o.jsxs("div",{onClick:()=>{refreshUserTx();hi("withdraw");Mt(!0);},className:"p-3.5 bg-gradient-to-r from-rose-50 to-amber-50 rounded-2xl border border-rose-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm",children:[o.jsxs("div",{className:"flex items-center gap-3.5",children:[o.jsx("div",{className:"bg-rose-600 p-2.5 rounded-xl shadow-sm text-white",children:o.jsx(FC,{size:18})}),o.jsxs("div",{children:[o.jsx("h4",{className:"text-slate-800 font-black text-sm",children:"উত্তোলন হিস্টোরি"}),o.jsx("p",{className:"text-slate-500 text-[10px] font-bold",children:"শুধুমাত্র উত্তোলন ও ক্যাশআউট রেকর্ডসমূহ"})]})]}),o.jsx(Ul,{className:"text-rose-600",size:18})]}),o.jsxs("div",{onClick:()=>{refreshUserTx();hi("all");Mt(!0);},className:"p-3.5 bg-gradient-to-r from-sky-50 to-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm",children:[o.jsxs("div",{className:"flex items-center gap-3.5",children:[o.jsx("div",{className:"bg-[#005ba1] p-2.5 rounded-xl shadow-sm text-white",children:o.jsx(Y2,{size:18})}),o.jsxs("div",{children:[o.jsx("h4",{className:"text-slate-800 font-black text-sm",children:"সকল হিস্টোরি (ALL)"}),o.jsx("p",{className:"text-slate-500 text-[10px] font-bold",children:"ডিপোজিট ও উত্তোলন উভয় রেকর্ড একসাথে"})]})]}),o.jsx(Ul,{className:"text-[#005ba1]",size:18})]})]}),`;

  if (code.includes(oldSingleAccCard)) {
    code = code.replace(oldSingleAccCard, newMultiAccCards);
    modified = true;
    console.log(`[3. Account Cards] Added categorized history options in ${file}`);
  }

  if (modified) {
    try {
      esbuild.transformSync(code, { loader: "js" });
      fs.writeFileSync(file, code, "utf8");
      console.log(`[SAVED] Successfully validated and wrote ${file}`);
    } catch (e) {
      console.error(`[ERROR] Syntax error in ${file}:`, e.message);
    }
  }
}
