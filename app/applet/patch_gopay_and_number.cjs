const fs = require("fs");
const esbuild = require("esbuild");

const files = [
  "dist_backup/assets/index-sn777-v5.js",
  "dist_backup/assets/index-CUhzlpga-v3.js",
  "dist/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js"
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");

  // 1. Set Ys default value to "01996306610"
  code = code.replace(/\[Ys,([a-zA-Z0-9_$]+)\]=R\.useState\(""\)/g, '[Ys,$1]=R.useState("01996306610")');
  code = code.replace(/\[Ys,([a-zA-Z0-9_$]+)\]=useState\(""\)/g, '[Ys,$1]=useState("01996306610")');

  // 2. Remove GOPay channel option or section
  // Let us find and remove the button for GOPay
  let idx = code.indexOf('onClick:()=>setDepCh("gopay")');
  if (idx !== -1) {
    let start = code.lastIndexOf('o.jsxs("button"', idx);
    if (start === -1) start = code.lastIndexOf('o.jsx("button"', idx);
    let end = code.indexOf('})', idx);
    if (start !== -1 && end !== -1) {
      code = code.substring(0, start) + code.substring(end + 2);
      console.log(`[${file}] Removed GOPay button JSX.`);
    }
  }

  // Also update channel count badge if present
  code = code.replace(/২টি চ্যানেল সক্রিয়/g, '১টি চ্যানেল সক্রিয়');

  try {
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(file, code, "utf8");
    console.log(`[${file}] Patched successfully.`);
  } catch (err) {
    console.error(`[${file}] Build error:`, err.message);
  }
});
