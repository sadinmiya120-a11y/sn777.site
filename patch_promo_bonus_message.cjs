const fs = require("fs");

const files = [
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js"
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  // 1. In snapshot listener:
  const tSnap = "if(diff>0){const _isBonus=window.__sn777_just_signed_up||((!Ue.totalDeposited||Number(Ue.totalDeposited)===0)&&(!Ue.approvedDepositsCount||Number(Ue.approvedDepositsCount)===0)&&(diff===777||curBal===777));const sMsg=_isBonus?`🎉 আপনাকে অভিনন্দন আপনি বোনাস পেয়েছেন! ৳${diff} টাকা একাউন্টে যোগ করা হয়েছে。`:`🎉 পেমেন্ট সফল হয়েছে! ৳${diff} টাকা একাউন্টে যোগ করা হয়েছে।`;sr(sMsg);try{localStorage.setItem(\"sn777_persist_success\",sMsg);}catch(e){}Er(!0);";
  const rSnap = "if(diff>0){const _isPromo=window.__sn777_just_redeemed_promo||(diff===250&&Ue.promoRedeemed);const _isVoucher=window.__sn777_just_redeemed_voucher||((diff===500||diff===1011)&&(Ue.voucherRedeemed||Ue.voucherVipRedeemed));const _isBonus=window.__sn777_just_signed_up||((!Ue.totalDeposited||Number(Ue.totalDeposited)===0)&&(!Ue.approvedDepositsCount||Number(Ue.approvedDepositsCount)===0)&&(diff===777||curBal===777));const sMsg=_isPromo?`🎉 অভিনন্দন! প্রোমো কোড সফল হয়েছে! ৳${diff} টাকা বোনাস একাউন্টে যোগ করা হয়েছে。`:_isVoucher?`🎉 অভিনন্দন! ভাউচার কোড সফল হয়েছে! ৳${diff} টাকা বোনাস একাউন্টে যোগ করা হয়েছে。`:_isBonus?`🎉 আপনাকে অভিনন্দন আপনি বোনাস পেয়েছেন! ৳${diff} টাকা একাউন্টে যোগ করা হয়েছে。`:`🎉 পেমেন্ট সফল হয়েছে! ৳${diff} টাকা একাউন্টে যোগ করা হয়েছে।`;sr(sMsg);try{localStorage.setItem(\"sn777_persist_success\",sMsg);}catch(e){}Er(!0);";

  if (code.includes(tSnap)) {
    code = code.replace(tSnap, rSnap);
    modified = true;
    console.log(`[${file}] Patched snapshot listener for promo/voucher/bonus distinction`);
  } else {
    console.warn(`[${file}] Target snapshot listener not found`);
  }

  // 2. In Promo Code handler (Cc):
  const tPromo = "const ye=250,Le=(parseFloat(W.balance||\"0.00\")+ye).toFixed(2);await Tn(L,{balance:Le,promoRedeemed:!0});";
  const rPromo = "const ye=250,Le=(parseFloat(W.balance||\"0.00\")+ye).toFixed(2);try{window.__sn777_just_redeemed_promo=true;window.__prevUserBalance=parseFloat(Le);window.__prevUserBalanceUid=gt.currentUser.uid;const _pMsg=\"🎉 অভিনন্দন! প্রোমো কোড সফল হয়েছে! ৳250 টাকা বোনাস একাউন্টে যোগ করা হয়েছে।\";sr(_pMsg);localStorage.setItem(\"sn777_persist_success\",_pMsg);Er(!0);}catch(e){}await Tn(L,{balance:Le,promoRedeemed:!0});";

  if (code.includes(tPromo)) {
    code = code.replace(tPromo, rPromo);
    modified = true;
    console.log(`[${file}] Patched Promo handler to trigger promo success modal`);
  } else {
    console.warn(`[${file}] Target Promo handler not found`);
  }

  // 3. In Voucher Code handler (Vc):
  const tVoucher = "const qe=(parseFloat(Le.balance||\"0.00\")+W).toFixed(2),Ue={balance:qe};L?Ue.voucherVipRedeemed=!0:Ue.voucherRedeemed=!0,await Tn(ye,Ue);";
  const rVoucher = "const qe=(parseFloat(Le.balance||\"0.00\")+W).toFixed(2),Ue={balance:qe};try{window.__sn777_just_redeemed_voucher=true;window.__prevUserBalance=parseFloat(qe);window.__prevUserBalanceUid=gt.currentUser.uid;const _vMsg=`🎉 অভিনন্দন! ভাউচার কোড সফল হয়েছে! ৳${W} টাকা বোনাস একাউন্টে যোগ করা হয়েছে।`;sr(_vMsg);localStorage.setItem(\"sn777_persist_success\",_vMsg);Er(!0);}catch(e){}L?Ue.voucherVipRedeemed=!0:Ue.voucherRedeemed=!0,await Tn(ye,Ue);";

  if (code.includes(tVoucher)) {
    code = code.replace(tVoucher, rVoucher);
    modified = true;
    console.log(`[${file}] Patched Voucher handler to trigger voucher success modal`);
  } else {
    console.warn(`[${file}] Target Voucher handler not found`);
  }

  // 4. In Modal Heading:
  const tHeading = "o.jsx(\"h3\",{className:\"text-xl font-black text-emerald-400 mb-2 tracking-tight text-center relative z-10\",children:(Gr&&(Gr.includes(\"বোনাস\")||Gr.includes(\"অভিনন্দন\"))?\"অভিনন্দন!\":\"সফল হয়েছে!\")})";
  const rHeading = "o.jsx(\"h3\",{className:\"text-xl font-black text-emerald-400 mb-2 tracking-tight text-center relative z-10\",children:(Gr&&(Gr.includes(\"বোনাস\")||Gr.includes(\"অভিনন্দন\")||Gr.includes(\"প্রোমো\")||Gr.includes(\"ভাউচার\"))?\"অভিনন্দন!\":\"সফল হয়েছে!\")})";

  if (code.includes(tHeading)) {
    code = code.replace(tHeading, rHeading);
    modified = true;
    console.log(`[${file}] Patched modal heading for promo and voucher`);
  }

  if (modified) {
    fs.writeFileSync(file, code, "utf8");
    console.log(`[${file}] Successfully saved!`);
  }
}
