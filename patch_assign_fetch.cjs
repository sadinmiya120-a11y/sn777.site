const fs = require("fs");

function patchFile(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");
  
  const p1 = `window.location.assign("/gopay_pay.php?uid=" + encodeURIComponent(gt.currentUser.uid) + "&amount=" + encodeURIComponent(E) + "&method=" + encodeURIComponent(Be) + "&order_no=" + encodeURIComponent(Te)),fi("")`;
  const p1_new = `fetch("/gopay_pay.php?uid=" + encodeURIComponent(gt.currentUser.uid) + "&amount=" + encodeURIComponent(E) + "&method=" + encodeURIComponent(Be) + "&order_no=" + encodeURIComponent(Te),{headers:{Accept:"application/json"}}).then(r=>r.json()).then(d=>{if(d.redirect_url)window.location.assign(d.redirect_url);else{Fe("ডিপোজিট রিকোয়েস্ট সফলভাবে সাবমিট হয়েছে!");}}).catch(()=>{Fe("ডিপোজিট রিকোয়েস্ট সফলভাবে সাবমিট হয়েছে!");}),fi("")`;
  
  if (code.includes(p1)) {
    code = code.replace(p1, p1_new);
    fs.writeFileSync(file, code);
    console.log("Patched p1 in", file);
  }

  const p2 = `window.location.assign(_payUrl),fi("")`;
  const p2_new = `fetch(_payUrl,{headers:{Accept:"application/json"}}).then(r=>r.json()).then(d=>{if(d.redirect_url)window.location.assign(d.redirect_url);else{Fe("ডিপোজিট রিকোয়েস্ট সফলভাবে সাবমিট হয়েছে!");}}).catch(()=>{Fe("ডিপোজিট রিকোয়েস্ট সফলভাবে সাবমিট হয়েছে!");}),fi("")`;

  if (code.includes(p2)) {
    code = code.replace(p2, p2_new);
    fs.writeFileSync(file, code);
    console.log("Patched p2 in", file);
  }
}

patchFile("dist/assets/index-sn777-v5.js");
patchFile("dist/assets/index-CUhzlpga-v3.js");
patchFile("dist_backup/assets/index-sn777-v5.js");
patchFile("dist_backup/assets/index-CUhzlpga-v3.js");
