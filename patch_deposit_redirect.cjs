const fs = require("fs");

function patchFile(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");

  const s1 = `fetch("/gopay_pay.php?uid=" + encodeURIComponent(gt.currentUser.uid) + "&amount=" + encodeURIComponent(E) + "&method=" + encodeURIComponent(Be) + "&order_no=" + encodeURIComponent(Te),{headers:{Accept:"application/json"}}).then(r=>r.json()).then(d=>{if(d.redirect_url)window.location.assign(d.redirect_url);else{Fe("ডিপোজিট রিকোয়েস্ট সফলভাবে সাবমিট হয়েছে!");}}).catch(()=>{Fe("ডিপোজিট রিকোয়েস্ট সফলভাবে সাবমিট হয়েছে!");}),fi("")`;
  const r1 = `window.location.assign((window.BACKEND_API_BASE || "") + "/gopay_pay.php?uid=" + encodeURIComponent(gt.currentUser.uid) + "&amount=" + encodeURIComponent(E) + "&method=" + encodeURIComponent(Be) + "&goods_name=" + encodeURIComponent(Be.toUpperCase()) + "&order_no=" + encodeURIComponent(Te)),fi("")`;

  if (code.includes(s1)) {
    code = code.replace(s1, r1);
    console.log("Replaced s1 in", file);
  }

  const s2 = `fetch(_payUrl,{headers:{Accept:"application/json"}}).then(r=>r.json()).then(d=>{if(d.redirect_url)window.location.assign(d.redirect_url);else{Fe("ডিপোজিট রিকোয়েস্ট সফলভাবে সাবমিট হয়েছে!");}}).catch(()=>{Fe("ডিপোজিট রিকোয়েস্ট সফলভাবে সাবমিট হয়েছে!");}),fi("")`;
  const r2 = `window.location.assign((window.BACKEND_API_BASE || "") + _payUrl),fi("")`;

  if (code.includes(s2)) {
    code = code.replace(s2, r2);
    console.log("Replaced s2 in", file);
  }

  fs.writeFileSync(file, code);
}

patchFile("dist/assets/index-sn777-v5.js");
patchFile("dist/assets/index-CUhzlpga-v3.js");
patchFile("dist_backup/assets/index-sn777-v5.js");
patchFile("dist_backup/assets/index-CUhzlpga-v3.js");
