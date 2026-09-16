const fs = require("fs");
const files = ["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, "utf8");
    const fullTarget = '100",children:[o.jsxs("div",{className:"flex items-center justify-between mb-3.5",children:[o.jsxs("div",{className:"flex items-center gap-2",children:[o.jsx("div",{className:"w-1.5 h-5 bg-[#00559b] rounded-full"}),o.jsx("h2",{className:"text-slate-800 font-extrabold text-sm md:text-base",children:"ডিপোজিট চ্যানেল নির্বাচন করুন"})]}),';
    const fullReplacement = '100",style:{display:"none"},children:[o.jsxs("div",{className:"flex items-center justify-between mb-3.5",children:[o.jsxs("div",{className:"flex items-center gap-2",children:[o.jsx("div",{className:"w-1.5 h-5 bg-[#00559b] rounded-full"}),o.jsx("h2",{className:"text-slate-800 font-extrabold text-sm md:text-base",children:"ডিপোজিট চ্যানেল নির্বাচন করুন"})]}),';

    if (content.includes(fullTarget)) {
        content = content.replace(fullTarget, fullReplacement);
        fs.writeFileSync(file, content);
        console.log("Hidden deposit channel section in " + file);
    } else {
        console.log("Target not found in " + file);
    }
  }
}
