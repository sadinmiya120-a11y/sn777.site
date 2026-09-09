const fs = require("fs");

const files = [
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js"
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  // 1. Remove the problematic snapshot listener diff popup that causes duplicate/total-balance popups
  // Matches both original and promo-patched versions
  const snapRegex = /if\(typeof window\.__prevUserBalance==="number"&&window\.__prevUserBalanceUid===L\.uid\)\{if\(curBal>window\.__prevUserBalance\)\{const diff=Math\.round\(curBal-window\.__prevUserBalance\);if\(diff>0\)\{[\s\S]*?osc\.stop\(au\.currentTime\+0\.4\)\}catch\(e\)\{\}\}\}\}window\.__prevUserBalance=curBal;window\.__prevUserBalanceUid=L\.uid/g;

  if (snapRegex.test(code)) {
    code = code.replace(snapRegex, "window.__prevUserBalance=curBal;window.__prevUserBalanceUid=L.uid");
    modified = true;
    console.log(`[${file}] Removed snapshot balance diff popup trigger`);
  } else {
    console.warn(`[${file}] Snapshot balance diff trigger regex not matched`);
  }

  // 2. Remove persistent success message on mount (so stale messages like total balance don't pop up on reload)
  const tMount = 'try{const savedMsg=localStorage.getItem("sn777_persist_success");if(savedMsg){sr(savedMsg);Er(!0);}}catch(e){}';
  const rMount = 'try{localStorage.removeItem("sn777_persist_success");}catch(e){}';
  if (code.includes(tMount)) {
    code = code.replace(tMount, rMount);
    modified = true;
    console.log(`[${file}] Cleared stale persistent success on mount`);
  }

  // 3. Fix checkPendingAuto to deduplicate and only show the exact deposited amount once
  const tCheckAuto = 'const sMsg = `🎉 পেমেন্ট সফল হয়েছে! ৳${appItem.result.finalCredit||appItem.result.amount||500} টাকা একাউন্টে যোগ করা হয়েছে।`; sr(sMsg); try{localStorage.setItem("sn777_persist_success", sMsg);}catch(e){} Er(!0)';
  const rCheckAuto = 'const _depAmt=Number(appItem.result.finalCredit||appItem.result.amount||appItem.amount||0);const _ordKey=String(appItem.order_no||appItem.id||(appItem.result&&appItem.result.order_no)||"");if(_depAmt>0&&(!window.__sn777_notified_orders||!window.__sn777_notified_orders[_ordKey])){if(!window.__sn777_notified_orders)window.__sn777_notified_orders={};if(_ordKey)window.__sn777_notified_orders[_ordKey]=true;const sMsg=`🎉 পেমেন্ট সফল হয়েছে! ৳${_depAmt} টাকা একাউন্টে যোগ করা হয়েছে।`;sr(sMsg);Er(!0);}';
  if (code.includes(tCheckAuto)) {
    code = code.replace(tCheckAuto, rCheckAuto);
    modified = true;
    console.log(`[${file}] Patched checkPendingAuto to deduplicate deposit modal`);
  }

  // 4. Fix verify-payment handler to deduplicate and only show the exact deposited amount once
  const tVerify = 'const sMsg = `🎉 পেমেন্ট সফল হয়েছে! ৳${resData.finalCredit||resData.amount||500} টাকা যোগ করা হয়েছে।`; sr(sMsg); try{localStorage.setItem("sn777_persist_success", sMsg);}catch(e){} Er(!0);';
  const rVerify = 'const _depAmt=Number(resData.finalCredit||resData.amount||0);const _ordKey=String(L||"");if(_depAmt>0&&(!window.__sn777_notified_orders||!window.__sn777_notified_orders[_ordKey])){if(!window.__sn777_notified_orders)window.__sn777_notified_orders={};if(_ordKey)window.__sn777_notified_orders[_ordKey]=true;const sMsg=`🎉 পেমেন্ট সফল হয়েছে! ৳${_depAmt} টাকা একাউন্টে যোগ করা হয়েছে।`;sr(sMsg);Er(!0);}';
  if (code.includes(tVerify)) {
    code = code.replace(tVerify, rVerify);
    modified = true;
    console.log(`[${file}] Patched verify-payment to deduplicate deposit modal`);
  }

  if (modified) {
    fs.writeFileSync(file, code, "utf8");
    console.log(`[${file}] Successfully saved!`);
  }
}
