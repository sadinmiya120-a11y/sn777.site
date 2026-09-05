const fs = require("fs");
const esbuild = require("esbuild");

const files = ["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  // 1. Restore the History tab in Funds top switcher: [ডিপোজিট] [উত্তোলন] [হিস্টোরি]
  const currentFundsSwitcher = `o.jsxs("div",{className:"bg-[#004a87] rounded-lg p-1 flex",children:[o.jsx("button",{onClick:()=>Mi(),className:\`flex-1 py-2 rounded text-sm font-bold transition-all \${M==="deposit"?"bg-[#3b82f6] text-white shadow-md":"text-gray-300"}\`,children:"ডিপোজিট"}),o.jsx("button",{onClick:()=>{if(!gt.currentUser){H("signup");return}O("withdraw")},className:\`flex-1 py-2 rounded text-sm font-bold transition-all \${M==="withdraw"?"bg-[#3b82f6] text-white shadow-md":"text-gray-300"}\`,children:"উত্তোলন"})]})`;
  
  const restoredFundsSwitcher = `o.jsxs("div",{className:"bg-[#004a87] rounded-lg p-1 flex",children:[o.jsx("button",{onClick:()=>Mi(),className:\`flex-1 py-2 rounded text-sm font-bold transition-all \${M==="deposit"?"bg-[#3b82f6] text-white shadow-md":"text-gray-300"}\`,children:"ডিপোজিট"}),o.jsx("button",{onClick:()=>{if(!gt.currentUser){H("signup");return}O("withdraw")},className:\`flex-1 py-2 rounded text-sm font-bold transition-all \${M==="withdraw"?"bg-[#3b82f6] text-white shadow-md":"text-gray-300"}\`,children:"উত্তোলন"}),o.jsx("button",{onClick:()=>{if(!gt.currentUser){H("signup");return}refreshUserTx();hi(M==="deposit"?"deposit":M==="withdraw"?"withdraw":"all");Mt(!0)},className:\`flex-1 py-2 rounded text-sm font-bold transition-all \${M==="history"?"bg-[#3b82f6] text-white shadow-md":"text-gray-300"} hover:text-white flex items-center justify-center gap-1\`,children:"হিস্টোরি"})]})`;

  if (code.includes(currentFundsSwitcher)) {
    code = code.replace(currentFundsSwitcher, restoredFundsSwitcher);
    modified = true;
    console.log(`[1. Funds Switcher] Restored History tab in ${file}`);
  }

  // 2. Also in the funds header: replace empty w-8 with a dedicated transaction history quick button
  const oldHeader = `o.jsxs("header",{className:"px-4 py-4 flex items-center justify-between",children:[o.jsx("div",{className:"w-8"}),o.jsx("h1",{className:"text-xl font-bold",children:"ফান্ডস"}),o.jsx("button",{onClick:()=>H("home"),className:"p-1",children:o.jsx(Ts,{size:24})})]}`;
  const newHeader = `o.jsxs("header",{className:"px-4 py-4 flex items-center justify-between",children:[o.jsxs("button",{type:"button",onClick:()=>{if(!gt.currentUser){H("signup");return}refreshUserTx();hi(M==="deposit"?"deposit":M==="withdraw"?"withdraw":"all");Mt(!0)},className:"flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1.5 rounded-lg font-bold transition-all active:scale-95 shadow-sm",children:[o.jsx(Y2,{size:14}),"হিস্ট্রি"]}),o.jsx("h1",{className:"text-xl font-bold",children:"ফান্ডস"}),o.jsx("button",{onClick:()=>H("home"),className:"p-1 hover:bg-white/10 rounded-full transition-all",children:o.jsx(Ts,{size:24})})]}`;

  if (code.includes(oldHeader)) {
    code = code.replace(oldHeader, newHeader);
    modified = true;
    console.log(`[2. Funds Header] Added quick History button in header in ${file}`);
  }

  if (modified) {
    try {
      esbuild.transformSync(code, { loader: "js" });
      fs.writeFileSync(file, code, "utf8");
      console.log(`[SAVED] Successfully validated and saved ${file}`);
    } catch (e) {
      console.error(`[ERROR] Syntax error in ${file}:`, e.message);
    }
  }
}
