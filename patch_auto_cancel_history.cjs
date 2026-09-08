const fs = require("fs");

const files = ["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  // 1. In tx-exact-card: Auto-cancel deposits older than 7 minutes in status rendering
  const oldCardStatus = 'p=e.status==="rejected"||e.status==="cancelled"||e.status==="failed"||e.status===2||(e.description&&e.description.includes("\\u09AC\\u09BE\\u09A4\\u09BF\\u09B2")),y=e.status==="approved"||e.status==="success"||e.status===1||e.credited===true';
  const newCardStatus = 'y=e.status==="approved"||e.status==="success"||e.status===1||e.credited===true,_isDepExp=!y&&isDep(e)&&(e.status==="pending"||!e.status)&&(Date.now()-(e.timestamp?new Date(e.timestamp).getTime():(e.createdAt?new Date(e.createdAt).getTime():0))>60*60*1000),p=_isDepExp||e.status==="rejected"||e.status==="cancelled"||e.status==="failed"||e.status===2||(e.description&&e.description.includes("\\u09AC\\u09BE\\u09A4\\u09BF\\u09B2"))';

  if (code.includes(oldCardStatus)) {
    code = code.replace(oldCardStatus, newCardStatus);
    modified = true;
    console.log(`[${file}] Patched transaction card to display auto-cancelled status for deposits older than 7 minutes`);
  } else {
    console.warn(`[${file}] Could not find oldCardStatus`);
  }

  // 2. In refreshUserTx: Auto-expire unapproved deposits older than 7 minutes when merging
  const oldRefreshMerge = 'const isAppr=ex.status==="approved"||ex.status==="success"||ex.status===1||ex.credited===true||it.status==="approved"||it.status==="success"||it.status===1||it.credited===true;const isRej=!isAppr&&(ex.status==="rejected"||ex.status==="cancelled"||ex.status===2||it.status==="rejected"||it.status==="cancelled"||it.status==="failed"||it.status===2);';
  // Let's check the exact string in refreshUserTx
  const oldRefreshMergeCheck = 'const isAppr=ex.status==="approved"||ex.status==="success"||ex.status===1||ex.credited===true||it.status==="approved"||it.status==="success"||it.status===1||it.credited===true;const isRej=!isAppr&&(ex.status==="rejected"||ex.status==="cancelled"||ex.status===2||it.status==="rejected"||it.status==="cancelled"||it.status===2);';
  
  const newRefreshMerge = 'const isAppr=ex.status==="approved"||ex.status==="success"||ex.status===1||ex.credited===true||it.status==="approved"||it.status==="success"||it.status===1||it.credited===true;const _tAge=Date.now()-new Date(it.timestamp||it.createdAt||ex.timestamp||ex.createdAt||0).getTime();const _isExp=!isAppr&&_tAge>60*60*1000&&(it.type==="deposit"||ex.type==="deposit"||String(k).startsWith("ORD")||String(k).startsWith("dep"));const isRej=!isAppr&&(_isExp||ex.status==="rejected"||ex.status==="cancelled"||ex.status===2||it.status==="rejected"||it.status==="cancelled"||it.status===2);';

  if (code.includes(oldRefreshMergeCheck)) {
    code = code.replace(oldRefreshMergeCheck, newRefreshMerge);
    modified = true;
    console.log(`[${file}] Patched refreshUserTx to auto-cancel pending deposits older than 7 minutes`);
  } else {
    console.warn(`[${file}] Could not find oldRefreshMergeCheck`);
  }

  // 3. In cancelMsg (when returning from payment with cancel or failure):
  const oldCancelBranch = '(()=>{const cancelMsg="❌ পেমেন্ট বাতিল করা হয়েছে!\\n\\nআপনার ডিপোজিট রিকোয়েস্টটি সম্পন্ন করা যায়নি বা বাতিল করা হয়েছে।";sr(cancelMsg);Er(!0);Fe(cancelMsg);Je(!0)})();';
  const newCancelBranch = '(()=>{const cancelMsg="❌ পেমেন্ট বাতিল করা হয়েছে!\\n\\nআপনার ডিপোজিট রিকোয়েস্টটি সম্পন্ন করা যায়নি বা বাতিল করা হয়েছে।";sr(cancelMsg);Er(!0);Fe(cancelMsg);Je(!0);try{localStorage.removeItem("sn777_pending_order");const _cU=gt.currentUser?gt.currentUser.uid:"";if(_cU){const _k="sn777_tx_list_"+_cU;_arr=JSON.parse(localStorage.getItem(_k)||"[]");let _m=false;_arr.forEach(_t=>{if(_t.id===L||_t.order_no===L||_t.transactionId===L){_t.status="cancelled";_t.cancelled=true;_m=true;}});if(_m){localStorage.setItem(_k,JSON.stringify(_arr));typeof gs=="function"&&gs(_arr)}}}catch(e){}if(L){fetch("/api/cancel-transaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_no:L,uid:gt.currentUser?gt.currentUser.uid:""})}).catch(()=>{})}})();';

  if (code.includes(oldCancelBranch)) {
    code = code.replace(oldCancelBranch, newCancelBranch);
    modified = true;
    console.log(`[${file}] Patched payment return cancel branch to mark transaction cancelled in local cache & server`);
  } else {
    console.warn(`[${file}] Could not find oldCancelBranch`);
  }

  // 4. In manual cancel handler f:
  const oldManualCancel = 'await Tn(L,{status:"cancelled"})}catch(E){console.error("Error updating status:",E)}setTimeout(()=>{lo(!1)},2e3)}';
  const newManualCancel = 'await Tn(L,{status:"cancelled"})}catch(E){console.error("Error updating status:",E)}try{const _cU=gt.currentUser?gt.currentUser.uid:"";if(_cU){const _k="sn777_tx_list_"+_cU;const _arr=JSON.parse(localStorage.getItem(_k)||"[]");let _m=false;_arr.forEach(_t=>{if(_t.id===Oi||_t.order_no===Oi||_t.depositNo===Oi){_t.status="cancelled";_t.cancelled=true;_m=true;}});if(_m){localStorage.setItem(_k,JSON.stringify(_arr));typeof gs=="function"&&gs(_arr);}}fetch("/api/cancel-transaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_no:Oi,id:Oi,uid:gt.currentUser?gt.currentUser.uid:""})}).catch(()=>{});}catch(e){}setTimeout(()=>{lo(!1)},2e3)}';

  if (code.includes(oldManualCancel)) {
    code = code.replace(oldManualCancel, newManualCancel);
    modified = true;
    console.log(`[${file}] Patched manual deposit cancel handler to update local cache & server`);
  }

  // 5. In History button click: Clean up local cache so expired deposits immediately show cancelled
  const oldHistoryOpen = 'const _c=JSON.parse(localStorage.getItem("sn777_tx_list_"+gt.currentUser.uid)||"[]");if(_c&&_c.length>0)gs(_c)';
  const newHistoryOpen = 'const _c=JSON.parse(localStorage.getItem("sn777_tx_list_"+gt.currentUser.uid)||"[]");if(_c&&_c.length>0){const _nw=Date.now();let _mod=false;_c.forEach(_t=>{if(_t.type==="deposit"&&(_t.status==="pending"||!_t.status)&&(_nw-new Date(_t.timestamp||_t.createdAt||0).getTime()>60*60*1000)){_t.status="cancelled";_t.cancelled=true;_mod=true;}});if(_mod){try{localStorage.setItem("sn777_tx_list_"+gt.currentUser.uid,JSON.stringify(_c))}catch(e){}}gs(_c)}';

  if (code.includes(oldHistoryOpen)) {
    code = code.replaceAll(oldHistoryOpen, newHistoryOpen);
    modified = true;
    console.log(`[${file}] Patched History button openers to clean up expired deposits in local cache`);
  }

  if (modified) {
    fs.writeFileSync(file, code, "utf8");
    console.log(`[${file}] Successfully saved all patches!`);
  }
}
