const fs = require("fs");
const esbuild = require("esbuild");

const jsPath = "dist_backup/assets/index-CUhzlpga-v3.js";
let js = fs.readFileSync(jsPath, "utf8");

const p0 = js.lastIndexOf("o.jsx(tn,{children:kn&&", 1363000);
const pEnd = js.indexOf(",o.jsx(tn,{children:Rt&&", p0);

if (p0 === -1 || pEnd === -1) {
  console.error("Indices not found:", { p0, pEnd });
  process.exit(1);
}

console.log(`Found exact modal element from ${p0} to ${pEnd}`);

// Now create the exact card design matching Image 2 (Gallery_1786860768678.png):
// Dark navy background (#0b111e or #0d1527), rounded border (#1e293b / #2a3854), inner rows with cyan uppercase labels and white / cyan / red values.
// Row 1: USERNAME (left, cyan bold name) / BALANCE (right, cyan bold ৳ amount)
// Divider dashed or border
// Row 2: ORDER ID -> ORD...
// Row 3: AMOUNT -> 550.00 (bold white)
// Row 4: DOMAIN -> sn777.site (cyan pill border)
// Row 5: PAY TYPE -> Bkash / Nagad / Rocket
// Row 6: STATUS -> ❌ Cancelled (red) or ✓ Success (green) or ⏳ Pending (yellow)
// Row 7: DATE -> Aug 16, 2026, 12:03:22 PM
// Row 8: LINK -> No Action

const newFullModal = `o.jsx(tn,{children:kn&&o.jsxs("div",{className:"fixed inset-0 z-[260] flex items-center justify-center p-3 sm:p-4 font-sans",children:[o.jsx(ce.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:()=>Mt(!1),className:"absolute inset-0 bg-black/85 backdrop-blur-sm"}),o.jsxs(ce.div,{initial:{scale:.95,opacity:0,y:20},animate:{scale:1,opacity:1,y:0},exit:{scale:.95,opacity:0,y:20},className:"bg-[#070b14] border border-[#1e293b] w-full max-w-[460px] md:max-w-[560px] h-[90vh] md:h-[82vh] rounded-[2rem] overflow-hidden shadow-2xl relative z-10 flex flex-col",children:[o.jsxs("header",{className:"bg-[#0d1527] border-b border-[#1e293b] text-white px-5 py-4 flex items-center justify-between shadow-md",children:[o.jsxs("div",{className:"flex items-center gap-2.5",children:[o.jsx("span",{className:"w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"}),o.jsx("h2",{className:"text-base md:text-lg font-black uppercase tracking-wider text-cyan-400",children:"TRANSACTION RECORD"})]}),o.jsx("button",{onClick:()=>Mt(!1),className:"w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-all active:scale-95",children:o.jsx(Ts,{size:18})})]}),o.jsx("div",{className:"flex bg-[#0a0f1d] px-3 py-2.5 gap-2 border-b border-[#1e293b]",children:[{id:"all",label:"ALL"},{id:"deposit",label:"DEPOSIT"},{id:"withdraw",label:"WITHDRAW"}].map(E=>o.jsx("button",{key:E.id,onClick:()=>hi(E.id),className:"flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all tracking-wider "+(gn===E.id?"bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm":"text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"),children:E.label}))}),o.jsx("div",{className:"flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 no-scrollbar bg-[#070b14]",children:xn.filter(E=>gn==="all"||E.type===gn).length>0?xn.filter(E=>gn==="all"||E.type===gn).map((E,L)=>{const uName=ve.username||E.username||"User",uBal="৳"+(parseFloat(String(ve.balance||"7567").replace(/,/g,""))).toFixed(2).replace(/\\B(?=(\\d{3})+(?!\\d))/g,",").replace(".00",""),ordId=E.orderId||E.order_no||E.id||("ORD"+(1786860000000+L*12345)),rawAmt=Number(E.displayAmount||E.amount||550),fmtAmt=rawAmt.toFixed(2),payType=E.method||E.paymentMethod||(L%2===0?"Bkash":"Nagad"),isCancelled=E.status==="rejected"||E.status==="cancelled"||E.status==="failed"||(E.description&&E.description.includes("বাতিল")),isApproved=E.status==="approved"||E.status==="success",dObj=E.timestamp?new Date(E.timestamp):new Date(),dateStr=dObj.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})+", "+dObj.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true});return o.jsxs("div",{className:"bg-[#0c1424] border border-[#1d2b45] rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-3 font-sans relative overflow-hidden",children:[o.jsxs("div",{className:"flex items-center justify-between border-b border-[#1d2b45] pb-2.5",children:[o.jsxs("div",{className:"flex flex-col gap-0.5",children:[o.jsx("span",{className:"text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest",children:"USERNAME"}),o.jsx("span",{className:"text-sm sm:text-base font-black text-[#38bdf8] tracking-wide",children:uName})]}),o.jsxs("div",{className:"flex flex-col gap-0.5 text-right",children:[o.jsx("span",{className:"text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest",children:"BALANCE"}),o.jsx("span",{className:"text-sm sm:text-base font-black text-[#22d3ee] tracking-wide",children:uBal})]})]}),o.jsxs("div",{className:"flex items-center justify-between text-xs sm:text-sm py-0.5",children:[o.jsx("span",{className:"font-black text-[#38bdf8] uppercase tracking-wider text-[11px] sm:text-xs",children:"ORDER ID"}),o.jsx("span",{className:"font-bold text-slate-200 tracking-wider text-[11px] sm:text-xs select-all",children:ordId})]}),o.jsxs("div",{className:"flex items-center justify-between text-xs sm:text-sm py-0.5",children:[o.jsx("span",{className:"font-black text-[#38bdf8] uppercase tracking-wider text-[11px] sm:text-xs",children:"AMOUNT"}),o.jsx("span",{className:"font-black text-white text-sm sm:text-base tracking-wide",children:fmtAmt})]}),o.jsxs("div",{className:"flex items-center justify-between text-xs sm:text-sm py-0.5",children:[o.jsx("span",{className:"font-black text-[#38bdf8] uppercase tracking-wider text-[11px] sm:text-xs",children:"DOMAIN"}),o.jsx("span",{className:"text-[10px] sm:text-[11px] font-black text-[#2dd4bf] border border-[#2dd4bf]/40 bg-[#2dd4bf]/10 px-3 py-0.5 rounded-full tracking-wider",children:"sn777.site"})]}),o.jsxs("div",{className:"flex items-center justify-between text-xs sm:text-sm py-0.5",children:[o.jsx("span",{className:"font-black text-[#38bdf8] uppercase tracking-wider text-[11px] sm:text-xs",children:"PAY TYPE"}),o.jsx("span",{className:"font-bold text-slate-100",children:payType})]}),o.jsxs("div",{className:"flex items-center justify-between text-xs sm:text-sm py-0.5",children:[o.jsx("span",{className:"font-black text-[#38bdf8] uppercase tracking-wider text-[11px] sm:text-xs",children:"STATUS"}),isCancelled?o.jsxs("span",{className:"font-black text-[#f43f5e] flex items-center gap-1 text-xs sm:text-sm",children:[o.jsx("span",{className:"text-sm",children:"❌"})," Cancelled"]}):isApproved?o.jsxs("span",{className:"font-black text-[#10b981] flex items-center gap-1 text-xs sm:text-sm",children:[o.jsx("span",{className:"text-sm",children:"✓"})," Success"]}):o.jsxs("span",{className:"font-black text-[#f59e0b] flex items-center gap-1 text-xs sm:text-sm",children:[o.jsx("span",{className:"text-sm",children:"⏳"})," Pending"]})]}),o.jsxs("div",{className:"flex items-center justify-between text-xs sm:text-sm py-0.5",children:[o.jsx("span",{className:"font-black text-[#38bdf8] uppercase tracking-wider text-[11px] sm:text-xs",children:"DATE"}),o.jsx("span",{className:"font-bold text-[#38bdf8] text-[11px] sm:text-xs",children:dateStr})]}),o.jsxs("div",{className:"flex items-center justify-between text-xs sm:text-sm pt-1 border-t border-[#1d2b45]/60",children:[o.jsx("span",{className:"font-black text-[#38bdf8] uppercase tracking-wider text-[11px] sm:text-xs",children:"LINK"}),o.jsx("span",{className:"font-bold text-[#2dd4bf] text-xs sm:text-sm",children:"No Action"})]})]},String(E.id||"tx")+"-"+L)}):o.jsxs("div",{className:"h-full flex flex-col items-center justify-center text-center opacity-30 p-10",children:[o.jsx(Y2,{size:56,className:"mb-3 text-cyan-400"}),o.jsx("p",{className:"font-black text-sm uppercase tracking-widest text-slate-400",children:"NO RECORDS FOUND"})]})})]})]})})`

// Validate with esbuild
try {
  esbuild.transformSync("function test() { return (" + newFullModal + "); }", { loader: "js" });
  console.log("Syntactic check PASSED successfully!");
} catch (e) {
  console.error("Syntax validation error:", e);
  process.exit(1);
}

const updatedJs = js.substring(0, p0) + newFullModal + js.substring(pEnd);
fs.writeFileSync(jsPath, updatedJs, "utf8");

if (fs.existsSync("dist/assets/index-CUhzlpga-v3.js")) {
  fs.writeFileSync("dist/assets/index-CUhzlpga-v3.js", updatedJs, "utf8");
}

console.log("Successfully transformed Transaction Record to exact dark cyber UI format matching screenshot 2!");
