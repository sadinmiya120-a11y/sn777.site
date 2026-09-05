const fs = require("fs");

const files = ["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  // 1. Fix sendBeacon hardcoded url in Kr
  if (code.includes('navigator.sendBeacon("https://sn777.site/api/record-transaction"')) {
    code = code.replace(
      'navigator.sendBeacon("https://sn777.site/api/record-transaction"',
      'navigator.sendBeacon("/api/record-transaction"'
    );
    modified = true;
    console.log(`[${file}] Fixed sendBeacon URL to relative path`);
  }

  // 2. Enhance refreshUserTx to pass username & phone and sync immediately
  const oldRefreshUserTxMarker = 'refreshUserTx=R.useCallback(async(targetUid)=>{const uid=targetUid||(gt.currentUser?gt.currentUser.uid:"");if(!uid)return;let allDocs=[];try{const loc=JSON.parse(localStorage.getItem("sn777_tx_list_"+uid)||"[]");Array.isArray(loc)&&allDocs.push(...loc)}catch(e){}try{const r=await fetch("/api/user-transactions?uid="+encodeURIComponent(uid))';
  
  if (code.includes(oldRefreshUserTxMarker)) {
    const newRefreshUserTxCode = 'refreshUserTx=R.useCallback(async(targetUid)=>{const uid=targetUid||(gt.currentUser?gt.currentUser.uid:"");const _uName=(ve&&(ve.username||ve.name))||(gt.currentUser&&(gt.currentUser.displayName||gt.currentUser.email))||"";const _uPhone=(ve&&(ve.phone||ve.phoneNumber||ve.accountNumber))||(gt.currentUser&&gt.currentUser.phoneNumber)||"";if(!uid&&!_uName)return;let allDocs=[];try{if(uid){const loc=JSON.parse(localStorage.getItem("sn777_tx_list_"+uid)||"[]");if(Array.isArray(loc)&&loc.length>0){allDocs.push(...loc);gs(loc)}}}catch(e){}try{const qp=new URLSearchParams();if(uid)qp.set("uid",uid);if(_uName)qp.set("username",_uName);if(_uPhone)qp.set("phone",_uPhone);const r=await fetch("/api/user-transactions?"+qp.toString())';
    
    code = code.replace(oldRefreshUserTxMarker, newRefreshUserTxCode);
    modified = true;
    console.log(`[${file}] Enhanced refreshUserTx for immediate local display and multi-parameter querying`);
  }

  // 3. Ensure manual deposit (v) also writes to localStorage and /api/record-transaction
  const oldVRecordMarker = 'await Tn(ye,{...Le,amount:jt,finalCredit:Ke,description:`ডিপোজিট রিকোয়েস্ট ${jt} টাকা';
  if (code.includes(oldVRecordMarker) && !code.includes('_manualDepTx')) {
    const newVRecordCode = 'const _manualDepTx={id:Oi,order_no:Oi,orderId:Oi,depositNo:Oi,serialNo:Oi,uid:gt.currentUser.uid,username:(ve&&(ve.username||ve.name))||"User",phone:Bn||"",userPhone:Bn||"",accountNumber:Bn||"",type:"deposit",amount:jt,finalCredit:Ke,method:Be,status:ee,timestamp:new Date().toISOString(),createdAt:new Date().toISOString(),senderNumber:Bn||"Manual",transactionId:oi||Oi,displayAmount:jt,description:`ডিপোজিট রিকোয়েস্ট ${jt} টাকা (${Be.toUpperCase()})`};try{const _mArr=JSON.parse(localStorage.getItem("sn777_tx_list_"+gt.currentUser.uid)||"[]");_mArr.unshift(_manualDepTx);localStorage.setItem("sn777_tx_list_"+gt.currentUser.uid,JSON.stringify(_mArr));typeof gs=="function"&&gs(_mArr)}catch(e){}try{fetch("/api/record-transaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(_manualDepTx)}).catch(()=>{})}catch(e){};await Tn(ye,{...Le,amount:jt,finalCredit:Ke,description:`ডিপোজিট রিকোয়েস্ট ${jt} টাকা';
    code = code.replace(oldVRecordMarker, newVRecordCode);
    modified = true;
    console.log(`[${file}] Added local persistence & API recording for manual deposits in function v`);
  }

  // 4. In return from payment handler (?m=1&order_no=ORD...), trigger refreshUserTx immediately
  const oldReturnHandlerMarker = 'if(resData.success||resData.status==="approved"||resData.status==="success"){const sMsg = `🎉 পেমেন্ট সফল হয়েছে!';
  if (code.includes(oldReturnHandlerMarker)) {
    const newReturnHandlerCode = 'if(resData.success||resData.status==="approved"||resData.status==="success"){try{if(gt.currentUser&&refreshUserTx){refreshUserTx(gt.currentUser.uid);}}catch(e){}const sMsg = `🎉 পেমেন্ট সফল হয়েছে!';
    code = code.replace(oldReturnHandlerMarker, newReturnHandlerCode);
    modified = true;
    console.log(`[${file}] Added instant refreshUserTx on payment gateway return`);
  }

  // 5. In History buttons click, immediately load local cache before opening modal
  const oldModalOpenClick = 'onClick:()=>{if(!gt.currentUser){H("signup");return}refreshUserTx();hi(M==="deposit"?"deposit":M==="withdraw"?"withdraw":"all");Mt(!0)}';
  if (code.includes(oldModalOpenClick)) {
    const newModalOpenClick = 'onClick:()=>{if(!gt.currentUser){H("signup");return}try{const _c=JSON.parse(localStorage.getItem("sn777_tx_list_"+gt.currentUser.uid)||"[]");if(_c&&_c.length>0)gs(_c)}catch(e){}refreshUserTx(gt.currentUser.uid);hi(M==="deposit"?"deposit":M==="withdraw"?"withdraw":"all");Mt(!0)}';
    code = code.replaceAll(oldModalOpenClick, newModalOpenClick);
    modified = true;
    console.log(`[${file}] Updated History buttons to load local transactions immediately without delay`);
  }

  if (modified) {
    fs.writeFileSync(file, code, "utf8");
    console.log(`Successfully updated ${file}`);
  } else {
    console.log(`No changes made to ${file}`);
  }
}
