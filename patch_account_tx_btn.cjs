const fs = require("fs");
const esbuild = require("esbuild");

const jsPath = "dist_backup/assets/index-CUhzlpga-v3.js";
let js = fs.readFileSync(jsPath, "utf8");

const target = 'o.jsxs("div",{onClick:()=>H("refer"),className:"p-4 bg-gradient-to-r from-yellow-50 to-orange-50';
const idx = js.indexOf(target);

if (idx === -1) {
  console.error("Target not found!");
  process.exit(1);
}

const txBtnCode = `o.jsxs("div",{onClick:()=>Mt(!0),className:"p-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-3xl border border-blue-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-sm",children:[o.jsxs("div",{className:"flex items-center gap-4",children:[o.jsx("div",{className:"bg-[#005ba1] p-2.5 rounded-2xl shadow-sm",children:o.jsx(Y2,{className:"text-yellow-400 size-5"})}),o.jsxs("div",{children:[o.jsx("h4",{className:"text-slate-800 font-black text-sm",children:"ট্রানজেকশন রেকর্ড"}),o.jsx("p",{className:"text-slate-500 text-[10px] font-bold",children:"সকল ডিপোজিট ও উইথড্র হিস্টোরি"})]})]}),o.jsx(Ul,{className:"text-[#005ba1]",size:18})]}),`;

if (!js.includes('children:"সকল ডিপোজিট ও উইথড্র হিস্টোরি"')) {
  js = js.substring(0, idx) + txBtnCode + js.substring(idx);
  fs.writeFileSync(jsPath, js, "utf8");
  if (fs.existsSync("dist/assets/index-CUhzlpga-v3.js")) {
    fs.writeFileSync("dist/assets/index-CUhzlpga-v3.js", js, "utf8");
  }
  console.log("Added Transaction Record button to Account page successfully!");
} else {
  console.log("Button already present.");
}
