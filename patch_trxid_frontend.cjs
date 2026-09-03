const fs = require("fs");
["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");

  const duplicateCheck = `if(E&&!["binance","usdt","usdterc20"].includes(Be)){const wt=hn(Ie,"deposits")`;
  
  // We add a regex check before the duplicate check
  const newCheck = `if(E&&!["binance","usdt","usdterc20"].includes(Be)){
    const _cE = E.trim();
    if (_cE.length < 8 || !/^[A-Za-z0-9]+$/.test(_cE) || /^(.)\\1+$/.test(_cE)) {
       Fe("ভুল বা ফেক ট্রানজ্যাকশন আইডি! দয়া করে সঠিক ট্রানজ্যাকশন আইডি দিন।");
       Je(!0); xe(!1); window._sn777_dep_submitting=!1; return;
    }
    const wt=hn(Ie,"deposits")`;

  if (code.includes(duplicateCheck)) {
     code = code.replace(duplicateCheck, newCheck);
     console.log("Patched fake TrxID check in", file);
  }

  fs.writeFileSync(file, code, "utf8");
});
