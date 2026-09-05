const fs = require("fs");
const esbuild = require("esbuild");

const jsFiles = [
  "dist/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist_backup/assets/index-CUhzlpga-v3.js"
];

jsFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  // Search for the phone number block in AdminPanel deposit card:
  // o.jsxs("div",{children:[o.jsx("p",{className:"text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1",children:"একাউন্ট ফোন নম্বর"}),o.jsx("p",{className:"text-sm font-black text-slate-800",children:V.phone})]})
  
  const targetPattern = 'o.jsxs("div",{children:[o.jsx("p",{className:"text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1",children:"একাউন্ট ফোন নম্বর"}),o.jsx("p",{className:"text-sm font-black text-slate-800",children:V.phone})]})';
  
  const replacement = 'o.jsxs("div",{className:"flex items-center justify-between",children:[o.jsxs("div",{children:[o.jsx("p",{className:"text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1",children:"একাউন্ট ফোন নম্বর"}),o.jsx("p",{className:"text-sm font-black text-slate-800",children:V.phone})]}),o.jsx("span",{className:"text-[10px] font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg uppercase border border-blue-100 shadow-sm",children:(V.method||"GOPay").toUpperCase()+(V.gateway==="gopay"||!V.senderNumber?" (Auto)":"")})]}),o.jsxs("div",{className:"pt-3 border-t border-slate-200 flex items-center justify-between",children:[o.jsxs("div",{children:[o.jsx("p",{className:"text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1",children:"অর্ডার নম্বর (Order ID)"}),o.jsx("p",{className:"text-xs font-black text-indigo-700 font-mono tracking-tight select-all",children:V.order_no||V.depositNo||V.serialNo||V.orderId||V.id||"N/A"})]}),o.jsx("span",{className:"text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded",children:"ORDER ID"})]})';

  if (code.includes(targetPattern)) {
    code = code.replace(targetPattern, replacement);
    try {
      esbuild.transformSync(code, { loader: "js" });
      fs.writeFileSync(filePath, code, "utf8");
      console.log(`[${filePath}] Successfully added Order ID & Method badge to Admin deposit cards.`);
    } catch (err) {
      console.error(`[${filePath}] Error:`, err.message);
    }
  } else {
    console.log(`[${filePath}] targetPattern not found.`);
  }
});
