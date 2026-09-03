const fs = require("fs");
const esbuild = require("esbuild");

const files = ["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");

  // 1. In Home screen: Remove the 3rd history button completely. Only Deposit & Withdraw/উত্তোলন
  // Search for the home buttons div
  const homeBtnIdx = code.indexOf('from-neon-green to-green-600');
  if (homeBtnIdx !== -1) {
    const startDiv = code.lastIndexOf('o.jsxs("div"', homeBtnIdx);
    const endDiv = code.indexOf(')]})', homeBtnIdx) + 4;
    const currentHomeBlock = code.substring(startDiv, endDiv);
    console.log("Current home block found:", currentHomeBlock);

    const replacementHomeBlock = `o.jsxs("div",{className:"flex gap-3",children:[o.jsxs("button",{onClick:()=>{if(!gt.currentUser){H("signup");return}Mi()},className:"flex-1 bg-gradient-to-b from-neon-green to-green-600 text-black py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wide shadow-green-900/20 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-1.5",children:[o.jsx(W2,{size:14})," ডিপোজিট"]}),o.jsxs("button",{onClick:()=>{if(!gt.currentUser){H("signup");return}H("funds"),O("withdraw")},className:"flex-1 bg-gradient-to-b from-casino-red to-red-700 text-white py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wide shadow-red-900/20 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-1.5 border border-white/10",children:[o.jsx(FC,{size:14})," উত্তোলন"]})]})`;

    code = code.replace(currentHomeBlock, replacementHomeBlock);
    console.log(`Replaced home buttons in ${file}`);
  }

  // 2. In Funds top tab: Remove History button completely. Only [ডিপোজিট] and [উত্তোলন]
  const fundsIdx = code.indexOf('className:"bg-[#004a87] rounded-lg p-1 flex"');
  if (fundsIdx !== -1) {
    const startDiv = code.lastIndexOf('o.jsxs("div"', fundsIdx);
    const endDiv = code.indexOf(')]})', fundsIdx) + 4;
    const currentFundsBlock = code.substring(startDiv, endDiv);
    console.log("Current funds switcher block:", currentFundsBlock);

    const replacementFundsBlock = `o.jsxs("div",{className:"bg-[#004a87] rounded-lg p-1 flex",children:[o.jsx("button",{onClick:()=>Mi(),className:\`flex-1 py-2 rounded text-sm font-bold transition-all \${M==="deposit"?"bg-[#3b82f6] text-white shadow-md":"text-gray-300"}\`,children:"ডিপোজিট"}),o.jsx("button",{onClick:()=>{if(!gt.currentUser){H("signup");return}O("withdraw")},className:\`flex-1 py-2 rounded text-sm font-bold transition-all \${M==="withdraw"?"bg-[#3b82f6] text-white shadow-md":"text-gray-300"}\`,children:"উত্তোলন"})]})`;

    code = code.replace(currentFundsBlock, replacementFundsBlock);
    console.log(`Replaced funds switcher in ${file}`);
  }

  // 3. In Account page: restore clean single Transaction Record card
  const accHistIdx = code.indexOf('ডিপোজিট হিস্টোরি');
  if (accHistIdx !== -1) {
    const startAccDiv = code.lastIndexOf('o.jsxs("div"', accHistIdx);
    const endAccDiv = code.indexOf('o.jsxs("div",{onClick:()=>H("refer")', accHistIdx);
    if (startAccDiv !== -1 && endAccDiv !== -1) {
      const currentAccBlock = code.substring(startAccDiv, endAccDiv);
      const replacementAccBlock = `o.jsxs("div",{onClick:()=>{refreshUserTx();Mt(!0);},className:"p-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-3xl border border-blue-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm",children:[o.jsxs("div",{className:"flex items-center gap-4",children:[o.jsx("div",{className:"bg-[#005ba1] p-2.5 rounded-2xl shadow-sm",children:o.jsx(Y2,{className:"text-yellow-400 size-5"})}),o.jsxs("div",{children:[o.jsx("h4",{className:"text-slate-800 font-black text-sm",children:"ট্রানজেকশন রেকর্ড"}),o.jsx("p",{className:"text-slate-500 text-[10px] font-bold",children:"সকল ডিপোজিট ও উইথড্র হিস্টোরি"})]})]}),o.jsx(Ul,{className:"text-[#005ba1]",size:18})]}),`;
      code = code.replace(currentAccBlock, replacementAccBlock);
      console.log(`Restored clean account record card in ${file}`);
    }
  }

  try {
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(file, code, "utf8");
    console.log(`[SAVED] Successfully transformed and saved ${file}`);
  } catch (e) {
    console.error(`[ERROR] Syntax error in ${file}:`, e.message);
  }
}
