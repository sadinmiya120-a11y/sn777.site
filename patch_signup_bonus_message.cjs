const fs = require("fs");

const files = [
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js"
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  // Registration handler and modal heading only (snapshot listener diff is handled by patch_fix_double_deposit_message.cjs)

  // 2. In registration handler:
  const t2 = "await Ks(We(Ie,\"users\",Vg.uid),Rf);const Le=parseInt(on.getItem(\"sn777_created_accounts_count\")||\"0\",10);const kf=Le+1;on.setItem(\"sn777_created_accounts_count\",kf.toString()),ss(Rf),xe(!1),H(\"home\");";
  const r2 = "await Ks(We(Ie,\"users\",Vg.uid),Rf);try{window.__sn777_just_signed_up=true;window.__prevUserBalance=777;window.__prevUserBalanceUid=Vg.uid;const _bMsg=\"🎉 আপনাকে অভিনন্দন আপনি বোনাস পেয়েছেন! ৳777 টাকা একাউন্টে যোগ করা হয়েছে।\";sr(_bMsg);localStorage.setItem(\"sn777_persist_success\",_bMsg);Er(!0);}catch(e){}const Le=parseInt(on.getItem(\"sn777_created_accounts_count\")||\"0\",10);const kf=Le+1;on.setItem(\"sn777_created_accounts_count\",kf.toString()),ss(Rf),xe(!1),H(\"home\");";

  if (code.includes(t2)) {
    code = code.replace(t2, r2);
    modified = true;
    console.log(`[${file}] Patched registration handler to trigger bonus modal`);
  } else {
    console.warn(`[${file}] Target 2 not found (maybe already patched)`);
  }

  // 3. In modal heading:
  const t3 = "o.jsx(\"h3\",{className:\"text-xl font-black text-emerald-400 mb-2 tracking-tight text-center relative z-10\",children:\"সফল হয়েছে!\"})";
  const r3 = "o.jsx(\"h3\",{className:\"text-xl font-black text-emerald-400 mb-2 tracking-tight text-center relative z-10\",children:(Gr&&(Gr.includes(\"বোনাস\")||Gr.includes(\"অভিনন্দন\"))?\"অভিনন্দন!\":\"সফল হয়েছে!\")})";

  if (code.includes(t3)) {
    code = code.replace(t3, r3);
    modified = true;
    console.log(`[${file}] Patched modal heading to show অভিনন্দন! for bonuses`);
  } else {
    console.warn(`[${file}] Target 3 not found (maybe already patched)`);
  }

  if (modified) {
    fs.writeFileSync(file, code, "utf8");
    console.log(`[${file}] Saved successfully!`);
  }
}
