const fs = require("fs");
const esbuild = require("esbuild");

const files = ["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  // 1. Home screen action buttons: Add separate Deposit, Withdraw (উত্তোলন), and History buttons
  const oldHomeButtons = `o.jsxs("div",{className:"flex gap-3",children:[o.jsxs("button",{onClick:()=>{if(!gt.currentUser){H("signup");return}Mi()},className:"flex-1 bg-gradient-to-b from-neon-green to-green-600 text-black py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wide shadow-green-900/20 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-1.5",children:[o.jsx(W2,{size:14})," ডিপোজিট"]}),o.jsxs("button",{onClick:()=>{if(!gt.currentUser){H("signup");return}H("funds"),O("withdraw")},className:"flex-1 bg-gradient-to-b from-casino-red to-red-700 text-white py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wide shadow-red-900/20 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-1.5 border border-white/10",children:[o.jsx(FC,{size:14})," উইথড্র"]})]})`;
  const newHomeButtons = `o.jsxs("div",{className:"flex gap-2",children:[o.jsxs("button",{onClick:()=>{if(!gt.currentUser){H("signup");return}Mi()},className:"flex-1 bg-gradient-to-b from-neon-green to-green-600 text-black py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wide shadow-green-900/20 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-1",children:[o.jsx(W2,{size:13})," ডিপোজিট"]}),o.jsxs("button",{onClick:()=>{if(!gt.currentUser){H("signup");return}H("funds"),O("withdraw")},className:"flex-1 bg-gradient-to-b from-casino-red to-red-700 text-white py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wide shadow-red-900/20 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-1 border border-white/10",children:[o.jsx(FC,{size:13})," উত্তোলন"]}),o.jsxs("button",{onClick:()=>{if(!gt.currentUser){H("signup");return}refreshUserTx();hi("all");Mt(!0)},className:"flex-1 bg-gradient-to-b from-sky-500 to-blue-700 text-white py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wide shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-1 border border-white/10",children:[o.jsx(Y2,{size:13})," হিস্টোরি"]})]})`;

  if (code.includes(oldHomeButtons)) {
    code = code.replace(oldHomeButtons, newHomeButtons);
    modified = true;
    console.log(`[1. Home Buttons] Updated Deposit, Withdraw, History in ${file}`);
  }

  // 2. Funds tab switcher: Ensure Deposit, Withdraw (উত্তোলন), and History are clear and distinct
  const oldFundsSwitcher = `o.jsxs("div",{className:"bg-[#004a87] rounded-lg p-1 flex",children:[o.jsx("button",{onClick:()=>Mi(),className:\`flex-1 py-2 rounded text-sm font-bold transition-all \${M==="deposit"?"bg-[#3b82f6] text-white shadow-md":"text-gray-300"}\`,children:"ডিপোজিট"}),o.jsx("button",{onClick:()=>{if(!gt.currentUser){H("signup");return}O("withdraw")},className:\`flex-1 py-2 rounded text-sm font-bold transition-all \${M==="withdraw"?"bg-[#3b82f6] text-white shadow-md":"text-gray-300"}\`,children:"উইথড্র"}),o.jsx("button",{onClick:()=>{refreshUserTx(),Mt(!0)},className:"flex-1 py-2 rounded text-sm font-bold transition-all text-gray-300",children:"হিস্টোরি"})]})`;
  const newFundsSwitcher = `o.jsxs("div",{className:"bg-[#004a87] rounded-lg p-1 flex",children:[o.jsx("button",{onClick:()=>Mi(),className:\`flex-1 py-2 rounded text-sm font-bold transition-all \${M==="deposit"?"bg-[#3b82f6] text-white shadow-md":"text-gray-300"}\`,children:"ডিপোজিট"}),o.jsx("button",{onClick:()=>{if(!gt.currentUser){H("signup");return}O("withdraw")},className:\`flex-1 py-2 rounded text-sm font-bold transition-all \${M==="withdraw"?"bg-[#3b82f6] text-white shadow-md":"text-gray-300"}\`,children:"উত্তোলন"}),o.jsx("button",{onClick:()=>{if(!gt.currentUser){H("signup");return}refreshUserTx();hi("all");Mt(!0)},className:\`flex-1 py-2 rounded text-sm font-bold transition-all \${M==="history"?"bg-[#3b82f6] text-white shadow-md":"text-gray-300"} hover:text-white\`,children:"হিস্টোরি"})]})`;

  if (code.includes(oldFundsSwitcher)) {
    code = code.replace(oldFundsSwitcher, newFundsSwitcher);
    modified = true;
    console.log(`[2. Funds Switcher] Updated Deposit, Withdraw, History tabs in ${file}`);
  }

  // 3. Account page: Distinct cards for Deposit History, Withdrawal History, and All Transactions Record
  const oldAccountRecord = `o.jsxs("div",{onClick:()=>{refreshUserTx();Mt(!0);},className:"p-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-3xl border border-blue-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm",children:[o.jsxs("div",{className:"flex items-center gap-4",children:[o.jsx("div",{className:"bg-[#005ba1] p-2.5 rounded-2xl shadow-sm",children:o.jsx(Y2,{className:"text-yellow-400 size-5"})}),o.jsxs("div",{children:[o.jsx("h4",{className:"text-slate-800 font-black text-sm",children:"ট্রানজেকশন রেকর্ড"}),o.jsx("p",{className:"text-slate-500 text-[10px] font-bold",children:"সকল ডিপোজিট ও উইথড্র হিস্টোরি"})]})]}),o.jsx(Ul,{className:"text-[#005ba1]",size:18})]})`;
  const newAccountRecord = `o.jsxs("div",{className:"flex flex-col gap-2.5",children:[o.jsxs("div",{onClick:()=>{refreshUserTx();hi("deposit");Mt(!0);},className:"p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-3xl border border-emerald-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-md",children:[o.jsxs("div",{className:"flex items-center gap-3.5",children:[o.jsx("div",{className:"bg-emerald-600 p-2.5 rounded-2xl shadow-sm text-white",children:o.jsx(W2,{size:20})}),o.jsxs("div",{children:[o.jsx("h4",{className:"text-slate-800 font-black text-sm",children:"ডিপোজিট হিস্টোরি"}),o.jsx("p",{className:"text-slate-500 text-[10px] font-bold",children:"সকল ডিপোজিট ও রিচার্জ ট্রানজেকশন রেকর্ড"})]})]}),o.jsx(Ul,{className:"text-emerald-600",size:18})]}),o.jsxs("div",{onClick:()=>{refreshUserTx();hi("withdraw");Mt(!0);},className:"p-4 bg-gradient-to-r from-amber-50 to-rose-50 rounded-3xl border border-amber-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-md",children:[o.jsxs("div",{className:"flex items-center gap-3.5",children:[o.jsx("div",{className:"bg-rose-600 p-2.5 rounded-2xl shadow-sm text-white",children:o.jsx(FC,{size:20})}),o.jsxs("div",{children:[o.jsx("h4",{className:"text-slate-800 font-black text-sm",children:"উত্তোলন হিস্টোরি"}),o.jsx("p",{className:"text-slate-500 text-[10px] font-bold",children:"সকল উইথড্র ও ক্যাশআউট রিকোয়েস্ট রেকর্ড"})]})]}),o.jsx(Ul,{className:"text-rose-600",size:18})]}),o.jsxs("div",{onClick:()=>{refreshUserTx();hi("all");Mt(!0);},className:"p-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-3xl border border-blue-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-md",children:[o.jsxs("div",{className:"flex items-center gap-3.5",children:[o.jsx("div",{className:"bg-[#005ba1] p-2.5 rounded-2xl shadow-sm text-white",children:o.jsx(Y2,{size:20})}),o.jsxs("div",{children:[o.jsx("h4",{className:"text-slate-800 font-black text-sm",children:"সকল ট্রানজেকশন রেকর্ড"}),o.jsx("p",{className:"text-slate-500 text-[10px] font-bold",children:"ডিপোজিট, উত্তোলন ও বোনাস সামগ্রিক হিস্টোরি"})]})]}),o.jsx(Ul,{className:"text-[#005ba1]",size:18})]})]})`;

  if (code.includes(oldAccountRecord)) {
    code = code.replace(oldAccountRecord, newAccountRecord);
    modified = true;
    console.log(`[3. Account Page] Created separate Deposit, Withdraw, and All History cards in ${file}`);
  }

  if (modified) {
    try {
      esbuild.transformSync(code, { loader: "js" });
      fs.writeFileSync(file, code, "utf8");
      console.log(`[SAVED] Successfully validated and wrote ${file}`);
    } catch (e) {
      console.error(`[SYNTAX ERROR] Failed to validate ${file}:`, e.message);
    }
  } else {
    console.log(`No changes needed for ${file}`);
  }
}
