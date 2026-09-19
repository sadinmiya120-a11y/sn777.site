const fs = require("fs");

const files = [
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist/assets/index-sn777-v6.js",
  "dist_backup/assets/index-sn777-v6.js"
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  // 1. Completely disable the 60-second interval that queries and cancels pending deposits in Firestore
  const oldIntervalCheck = 'if(Ue-wt>3600*1e3&&jt.type==="deposit"){await Tn(Ke.ref,{status:"cancelled",description:"ডিপোজিট রিকোয়েস্ট বাতিল করা হয়েছে (পেমেন্ট সম্পন্ন হয়নি)।"});const ft=We(Ie,"deposits",Ke.id),Fn=We(Ie,"users",gt.currentUser.uid,"history",Ke.id);try{await Tn(ft,{status:"cancelled",updatedAt:new Date().toISOString()}),await Tn(Fn,{status:"cancelled"})}catch{}}';
  if (code.includes(oldIntervalCheck)) {
    code = code.replaceAll(oldIntervalCheck, 'if(false){}');
    modified = true;
    console.log(`[${file}] Disabled 60s Firestore auto-cancel interval`);
  }

  // Also replace any generic match for that cancel block
  const oldIntervalCancelTarget = 'await Tn(Ke.ref,{status:"cancelled",description:"ডিপোজিট রিকোয়েস্ট বাতিল করা হয়েছে (পেমেন্ট সম্পন্ন হয়নি)।"})';
  if (code.includes(oldIntervalCancelTarget)) {
    code = code.replaceAll(oldIntervalCancelTarget, '/* auto-cancel removed */');
    modified = true;
    console.log(`[${file}] Removed auto-cancel updateDoc statement`);
  }

  // 2. In transaction card status rendering: ONLY show cancelled if admin explicitly cancelled/rejected
  if (code.includes("_isDepExp")) {
    code = code.replaceAll("_isDepExp=!y&&isDep(e)&&(e.status===\"pending\"||!e.status)&&(Date.now()-(e.timestamp?new Date(e.timestamp).getTime():(e.createdAt?new Date(e.createdAt).getTime():0))>60*60*1000)", "_isDepExp=false");
    code = code.replaceAll("_isDepExp=!y&&isDep(e)&&(e.status===\"pending\"||!e.status)&&(Date.now()-(e.timestamp?new Date(e.timestamp).getTime():(e.createdAt?new Date(e.createdAt).getTime():0))>7*60*1000)", "_isDepExp=false");
    code = code.replaceAll("_isDepExp=!y&&isDep(e)", "_isDepExp=false&&isDep(e)");
    modified = true;
    console.log(`[${file}] Disabled _isDepExp auto-cancel in transaction cards`);
  }

  // 3. In refreshUserTx: Never auto-expire pending deposits during merge
  if (code.includes("_isExp")) {
    code = code.replaceAll("_isExp=!isAppr&&_tAge>60*60*1000&&(it.type===\"deposit\"||ex.type===\"deposit\"||String(k).startsWith(\"ORD\")||String(k).startsWith(\"dep\"))", "_isExp=false");
    code = code.replaceAll("_isExp=!isAppr&&_tAge>7*60*1000&&(it.type===\"deposit\"||ex.type===\"deposit\"||String(k).startsWith(\"ORD\")||String(k).startsWith(\"dep\"))", "_isExp=false");
    modified = true;
    console.log(`[${file}] Disabled _isExp auto-cancel in refreshUserTx`);
  }

  // 4. In History modal open: Do not mutate pending deposits to cancelled in localStorage
  const oldHistoryAutoCancel = 'if(_t.type==="deposit"&&(_t.status==="pending"||!_t.status)&&(_nw-new Date(_t.timestamp||_t.createdAt||0).getTime()>60*60*1000)){_t.status="cancelled";_t.cancelled=true;_mod=true;}';
  const newHistoryAutoCancel = 'if(false){}';
  if (code.includes(oldHistoryAutoCancel)) {
    code = code.replaceAll(oldHistoryAutoCancel, newHistoryAutoCancel);
    modified = true;
    console.log(`[${file}] Removed auto-cancel in History modal opener`);
  }
  const oldHistoryAutoCancel7 = 'if(_t.type==="deposit"&&(_t.status==="pending"||!_t.status)&&(_nw-new Date(_t.timestamp||_t.createdAt||0).getTime()>7*60*1000)){_t.status="cancelled";_t.cancelled=true;_mod=true;}';
  if (code.includes(oldHistoryAutoCancel7)) {
    code = code.replaceAll(oldHistoryAutoCancel7, newHistoryAutoCancel);
    modified = true;
    console.log(`[${file}] Removed 7min auto-cancel in History modal opener`);
  }

  if (modified) {
    fs.writeFileSync(file, code, "utf8");
    console.log(`[${file}] Successfully saved all auto-cancel removals!`);
  }
}
