const fs = require("fs");
const acorn = require("acorn");
const esbuild = require("esbuild");

const files = [
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist/assets/index-sn777-v6.js",
  "dist_backup/assets/index-sn777-v6.js"
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  let code = fs.readFileSync(file, "utf8");

  // 1. In Rc (withdraw submission): record window._lastWithdrawInfo
  const oldWthFinish = 'setTimeout(()=>{xe(!1),nt("আপনার উইথড্র রিকোয়েস্টটি সফলভাবে গ্রহণ করা হয়েছে। দয়া করে ২৪ ঘণ্টার মধ্যে আপনি আপনার ProPay পেয়ে যাবেন। ধন্যবাদ!"),De(!0),H("home")},2e3)';
  const newWthFinish = 'try{if(typeof window!=="undefined"){window._lastWithdrawInfo={id:is,withdrawNo:nwS,serialNo:nwS,amount:ft,method:_finalWthMethod,accountNumber:(activeBank?activeBank.accNumber:(activeBank&&activeBank.phone?activeBank.phone:"")),accountHolder:(activeBank?activeBank.accHolder:ye.username)}}}catch(_e){}setTimeout(()=>{xe(!1),nt("উইথড্র রিকোয়েস্ট সফল"),De(!0)},1200)';

  if (code.includes(oldWthFinish)) {
    code = code.replace(oldWthFinish, newWthFinish);
    console.log(`[Withdraw Modal] Updated Rc withdrawal completion in ${file}`);
  }

  // 2. Find and replace the ht modal (old dark modal) with clean white deposit-matched design
  const startIdx = code.indexOf("o.jsx(tn,{children:ht&&");
  const endIdx = code.indexOf(",o.jsx(tn,{children:Li&&", startIdx);

  if (startIdx !== -1 && endIdx !== -1) {
    const fullOldModal = code.substring(startIdx, endIdx);

    const newModal = `o.jsx(tn,{children:ht&&o.jsx(ce.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm",children:` +
      `o.jsxs(ce.div,{initial:{scale:.9,opacity:0,y:20},animate:{scale:1,opacity:1,y:0},className:"bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col items-center p-6 relative shadow-2xl border border-slate-100",children:[` +
        // Close button top-right
        `o.jsx("button",{type:"button",onClick:()=>{De(!1),H("home")},className:"absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-pointer",children:o.jsx(Ts,{size:20})}),` +
        // Animated checkmark badge
        `o.jsxs("div",{className:"relative mb-3.5 flex items-center justify-center mt-1",children:[` +
          `o.jsx("div",{className:"absolute w-20 h-20 bg-green-100 rounded-full animate-ping opacity-40"}),` +
          `o.jsx("div",{className:"w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30 relative z-10",children:o.jsx(Oa,{size:32,strokeWidth:3})})` +
        `]}),` +
        // Title
        `o.jsx("h2",{className:"text-xl font-black text-slate-800 text-center mb-1 tracking-tight",children:(Ae==="পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!"?"পাসওয়ার্ড পরিবর্তন সফল!":"উত্তোলন সফলভাবে জমা হয়েছে!")}),` +
        // Subtitle
        `o.jsx("p",{className:"text-slate-500 text-center font-medium text-xs leading-relaxed mb-3.5 px-2",children:(Ae==="পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!"?"আপনার একাউন্টের পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।":"আপনার উইথড্র রিকোয়েস্ট সফলভাবে গ্রহণ করা হয়েছে। স্বল্প সময়ের মধ্যে আপনার একাউন্টে টাকা পৌঁছে যাবে।")}),` +
        // Order details card (if withdrawal)
        `(Ae==="পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!"?null:o.jsxs("div",{className:"w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3 mb-4 space-y-2.5",children:[` +
          // Withdraw ID row with Copy button
          `o.jsxs("div",{className:"bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between shadow-xs",children:[` +
            `o.jsxs("div",{className:"text-left",children:[` +
              `o.jsx("span",{className:"text-[10px] font-bold text-slate-400 block uppercase tracking-wider",children:"উইথড্র আইডি (Withdraw ID)"}),` +
              `o.jsx("span",{className:"text-sm font-black text-slate-800 font-mono select-all tracking-wide",children:(typeof window!=="undefined"&&window._lastWithdrawInfo&&window._lastWithdrawInfo.id)||"WTH"+Date.now()})` +
            `]}),` +
            `o.jsxs("button",{type:"button",onClick:()=>Z((typeof window!=="undefined"&&window._lastWithdrawInfo&&window._lastWithdrawInfo.id)||"","wth_id"),className:"flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-all cursor-pointer",children:[` +
              `o.jsx(ih,{size:13}),` +
              `o.jsx("span",{children:T==="wth_id"?"কপি হয়েছে":"কপি"})` +
            `]})` +
          `]}),` +
          // Account Number row
          `o.jsxs("div",{className:"flex items-center justify-between text-xs px-1 text-slate-600",children:[` +
            `o.jsx("span",{className:"font-medium text-slate-500",children:"একাউন্ট নম্বর (Account):"}),` +
            `o.jsx("span",{className:"font-mono font-bold text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded",children:(typeof window!=="undefined"&&window._lastWithdrawInfo&&window._lastWithdrawInfo.accountNumber)||"ব্যক্তিগত"})` +
          `]}),` +
          // Amount & Method row
          `o.jsxs("div",{className:"flex items-center justify-between text-xs px-1 pt-1 border-t border-slate-200/60",children:[` +
            `o.jsxs("span",{className:"text-slate-500 font-medium",children:["মেথড: ",o.jsx("strong",{className:"text-slate-700 uppercase font-bold",children:(typeof window!=="undefined"&&window._lastWithdrawInfo&&window._lastWithdrawInfo.method)||"Nagad"})]}),` +
            `o.jsxs("span",{className:"text-slate-500 font-medium",children:["পরিমাণ: ",o.jsxs("strong",{className:"text-emerald-600 font-black",children:["৳ ",parseFloat((typeof window!=="undefined"&&window._lastWithdrawInfo&&window._lastWithdrawInfo.amount)||"0").toFixed(2)]})]})` +
          `]})` +
        `]})),` +
        // Home button
        `o.jsx("button",{type:"button",onClick:()=>{De(!1); if(Ae==="পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!"){window.location.href="https://sn777.site";}else{H("home");Er(!0);}},className:"w-full bg-[#00684a] hover:bg-[#00543c] active:scale-98 text-white h-11 rounded-xl font-bold text-base transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer",children:(Ae==="পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!"?"লগইন করুন":"হোমে ফিরে যান")}),` +
        // Security footer
        `o.jsxs("div",{className:"mt-3 flex items-center gap-1.5 text-slate-400 font-bold text-[11px]",children:[` +
          `o.jsx(wh,{size:13}),"SN777 নিরাপদ লেনদেন এনক্রিপশন"` +
        `]})` +
      `]})})})`;

    code = code.replace(fullOldModal, newModal);
    console.log(`[Withdraw Modal] Successfully updated modal in ${file}`);
  } else {
    console.warn(`[Withdraw Modal] Markers not found in ${file}`);
  }

  // Validate syntax
  try {
    acorn.parse(code, { ecmaVersion: 2020 });
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(file, code);
    console.log(`[Success] Successfully saved ${file}`);
  } catch (err) {
    console.error(`[Error] Failed to validate ${file}:`, err.message);
    process.exit(1);
  }
}
