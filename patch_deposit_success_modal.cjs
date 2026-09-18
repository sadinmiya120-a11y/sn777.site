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

  // 1. In v() function: store last deposit order info before to(!0)
  const oldElseTo = `}else{if(window.startPaymentVerification){window.startPaymentVerification(Oi,oi,jt,Ke,ss,()=>{Ls(!1);H("home")})}else{to(!0)}}Zs(""),Tr(!1),Xt("")`;
  const newElseTo = `}else{try{if(typeof window!=="undefined"){window._lastDepositOrderId=Oi||("ORD"+Date.now());window._lastDepositTrxId=oi||"";window._lastDepositAmount=jt||parseFloat(Is||ys||"0");window._lastDepositMethod=(Be==="bkash"?"Bkash":Be==="nagad"?"Nagad":Be==="rocket"?"Rocket":Be)}}catch(_e){}to(!0)}Zs(""),Tr(!1),Xt("")`;

  if (code.includes(oldElseTo)) {
    code = code.replace(oldElseTo, newElseTo);
    console.log(`[Deposit Modal] Updated v() else handler in ${file}`);
  }

  // 2. Replace the vl modal with the gorgeous Order ID popup
  const oldModalStart = `o.jsx(tn,{children:vl&&o.jsx(ce.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm",children:o.jsxs(ce.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},className:"bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-8 relative shadow-2xl"`;
  const oldModalEndMarker = `তুমি একটা নিরাপদ জায়গায় আছো।"]})]})})})`;

  const startIdx = code.indexOf(oldModalStart);
  if (startIdx !== -1) {
    const endIdx = code.indexOf(oldModalEndMarker, startIdx);
    if (endIdx !== -1) {
      const fullOldModal = code.substring(startIdx, endIdx + oldModalEndMarker.length);

      const newModal = `o.jsx(tn,{children:vl&&o.jsx(ce.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm",children:` +
        `o.jsxs(ce.div,{initial:{scale:.9,opacity:0,y:20},animate:{scale:1,opacity:1,y:0},className:"bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col items-center p-6 relative shadow-2xl border border-slate-100",children:[` +
          // Close button top-right
          `o.jsx("button",{type:"button",onClick:()=>{to(!1),Ls(!1),H("home")},className:"absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-pointer",children:o.jsx(Ts,{size:20})}),` +
          // Animated checkmark badge
          `o.jsxs("div",{className:"relative mb-3.5 flex items-center justify-center mt-1",children:[` +
            `o.jsx("div",{className:"absolute w-20 h-20 bg-green-100 rounded-full animate-ping opacity-40"}),` +
            `o.jsx("div",{className:"w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30 relative z-10",children:o.jsx(Oa,{size:32,strokeWidth:3})})` +
          `]}),` +
          // Title
          `o.jsx("h2",{className:"text-xl font-black text-slate-800 text-center mb-1 tracking-tight",children:"পেমেন্ট সফলভাবে জমা হয়েছে!"}),` +
          // Subtitle
          `o.jsx("p",{className:"text-slate-500 text-center font-medium text-xs leading-relaxed mb-3.5 px-2",children:"আপনার ডিপোজিট রিকোয়েস্ট ও ট্রানজ্যাকশন আইডি সফলভাবে জমা হয়েছে। ৫ থেকে ১০ মিনিটের মধ্যে একাউন্টে ব্যালেন্স যুক্ত হবে।"}),` +
          // Order details card
          `o.jsxs("div",{className:"w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3 mb-4 space-y-2.5",children:[` +
            // Order ID row with Copy button
            `o.jsxs("div",{className:"bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between shadow-xs",children:[` +
              `o.jsxs("div",{className:"text-left",children:[` +
                `o.jsx("span",{className:"text-[10px] font-bold text-slate-400 block uppercase tracking-wider",children:"অর্ডার আইডি (Order ID)"}),` +
                `o.jsx("span",{className:"text-sm font-black text-slate-800 font-mono select-all tracking-wide",children:(typeof window!=="undefined"&&window._lastDepositOrderId)||Oi||"ORD"+Date.now()})` +
              `]}),` +
              `o.jsxs("button",{type:"button",onClick:()=>Z((typeof window!=="undefined"&&window._lastDepositOrderId)||Oi||"","order_id"),className:"flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-all cursor-pointer",children:[` +
                `o.jsx(ih,{size:13}),` +
                `o.jsx("span",{children:T==="order_id"?"কপি হয়েছে":"কপি"})` +
              `]})` +
            `]}),` +
            // TrxID row
            `o.jsxs("div",{className:"flex items-center justify-between text-xs px-1 text-slate-600",children:[` +
              `o.jsx("span",{className:"font-medium text-slate-500",children:"ট্রানজ্যাকশন আইডি (TrxID):"}),` +
              `o.jsx("span",{className:"font-mono font-bold text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded",children:(typeof window!=="undefined"&&window._lastDepositTrxId)||oi||"যাচাইাধীন"})` +
            `]}),` +
            // Amount & Method row
            `o.jsxs("div",{className:"flex items-center justify-between text-xs px-1 pt-1 border-t border-slate-200/60",children:[` +
              `o.jsxs("span",{className:"text-slate-500 font-medium",children:["মেথড: ",o.jsx("strong",{className:"text-slate-700 uppercase font-bold",children:(typeof window!=="undefined"&&window._lastDepositMethod)||(Be==="bkash"?"Bkash":Be==="nagad"?"Nagad":Be==="rocket"?"Rocket":Be)})]}),` +
              `o.jsxs("span",{className:"text-slate-500 font-medium",children:["পরিমাণ: ",o.jsxs("strong",{className:"text-emerald-600 font-black",children:["৳ ",parseFloat((typeof window!=="undefined"&&window._lastDepositAmount)||Is||ys||"0").toFixed(2)]})]})` +
            `]})` +
          `]}),` +
          // Home button
          `o.jsx("button",{type:"button",onClick:()=>{to(!1),Ls(!1),H("home"),Er(!0)},className:"w-full bg-[#00684a] hover:bg-[#00543c] active:scale-98 text-white h-11 rounded-xl font-bold text-base transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer",children:"হোমে ফিরে যান"}),` +
          // Security footer
          `o.jsxs("div",{className:"mt-3 flex items-center gap-1.5 text-slate-400 font-bold text-[11px]",children:[` +
            `o.jsx(wh,{size:13}),"SN777 নিরাপদ লেনদেন এনক্রিপশন"` +
          `]})` +
        `]})})})`;

      code = code.replace(fullOldModal, newModal);
      console.log(`[Deposit Modal] Replaced vl modal in ${file}`);
    }
  }

  // Validate syntax
  try {
    acorn.parse(code, { ecmaVersion: 2020 });
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(file, code);
    console.log(`[Success] Successfully patched ${file}`);
  } catch (err) {
    console.error(`[Error] Failed to validate ${file}:`, err.message);
    process.exit(1);
  }
}
