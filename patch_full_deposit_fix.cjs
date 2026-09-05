const fs = require("fs");
const esbuild = require("esbuild");

const CLOUD_RUN_BACKEND = "https://sn777-site-864935185164.us-west1.run.app";

const targetFiles = [
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js"
];

targetFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`[SKIP] ${file} not found.`);
    return;
  }
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  // 1. Fix BACKEND_API_BASE: point to Cloud Run backend when on sn777.site
  const oldBase1 = 'window.BACKEND_API_BASE = isLocalOrRunApp ? "" : "https://sn777.site";';
  const newBase1 = `window.BACKEND_API_BASE = isLocalOrRunApp ? "" : "${CLOUD_RUN_BACKEND}";`;
  if (code.includes(oldBase1)) {
    code = code.replaceAll(oldBase1, newBase1);
    modified = true;
    console.log(`[1. BACKEND_API_BASE] Fixed in ${file}`);
  }

  // 2. Fix ProPay pass_through_callback_url: must point to Cloud Run backend
  // because Cloudflare on sn777.site returns 405 Method Not Allowed on POST
  const oldCb1 = 'pass_through_callback_url:_curOrigin+"/callback.php"';
  const newCb1 = `pass_through_callback_url:"https://sn777.site/callback.php"`;
  if (code.includes(oldCb1)) {
    code = code.replaceAll(oldCb1, newCb1);
    modified = true;
    console.log(`[2. Callback URL] Fixed in ${file}`);
  }

  const oldCb2 = 'pass_through_callback_url:"https://www.sn777.site/callback.php"';
  if (code.includes(oldCb2)) {
    code = code.replaceAll(oldCb2, newCb1);
    modified = true;
    console.log(`[2. Callback URL] Fixed www.sn777.site in ${file}`);
  }

  const oldCb3 = 'pass_through_callback_url:"https://sn777.site/callback.php"';
  if (code.includes(oldCb3)) {
    code = code.replaceAll(oldCb3, newCb1);
    modified = true;
    console.log(`[2. Callback URL] Fixed sn777.site in ${file}`);
  }

  // 3. Enrich _newDepTx with user's phone number and order ID aliases for Admin Panel (no ProPay- prefix)
  const oldDepTx = 'const _nowIso=new Date().toISOString(),_uName=(ve&&(ve.username||ve.name))||(gt.currentUser&&(gt.currentUser.displayName||gt.currentUser.email))||"User";const _newDepTx={id:Te,order_no:Te,uid:gt.currentUser.uid,username:_uName,type:"deposit",amount:E,finalCredit:E,method:Be,status:"pending",timestamp:_nowIso,createdAt:_nowIso,gateway:"propay",senderNumber:"ProPay Gateway",transactionId:"ProPay-"+Te,displayAmount:E,description:"ProPay ডিপোজিট "+E+" টাকা ("+Be.toUpperCase()+")"};';
  const newDepTx = 'const _nowIso=new Date().toISOString(),_uName=(ve&&(ve.username||ve.name))||(gt.currentUser&&(gt.currentUser.displayName||gt.currentUser.email))||"User",_uPhone=(ve&&(ve.phone||ve.phoneNumber||ve.accountNumber))||(gt.currentUser&&gt.currentUser.phoneNumber)||"";const _newDepTx={id:Te,order_no:Te,orderId:Te,depositNo:Te,serialNo:Te,uid:gt.currentUser.uid,username:_uName,phone:_uPhone,userPhone:_uPhone,accountNumber:_uPhone,type:"deposit",amount:E,finalCredit:E,method:Be,status:"pending",timestamp:_nowIso,createdAt:_nowIso,gateway:"propay",senderNumber:"ProPay Gateway",transactionId:Te,displayAmount:E,description:"ProPay ডিপোজিট "+E+" টাকা ("+Be.toUpperCase()+")"};try{if(navigator.sendBeacon){navigator.sendBeacon("https://sn777-site-864935185164.us-west1.run.app/api/record-transaction",new Blob([JSON.stringify(_newDepTx)],{type:"application/json"}))}}catch(e){}';

  if (code.includes(oldDepTx)) {
    code = code.replace(oldDepTx, newDepTx);
    modified = true;
    console.log(`[3. _newDepTx] Enriched with phone & beacon in ${file}`);
  }

  // Also replace any existing transactionId:"ProPay-"+Te with transactionId:Te
  if (code.includes('transactionId:"ProPay-"+Te')) {
    code = code.replaceAll('transactionId:"ProPay-"+Te', 'transactionId:Te');
    modified = true;
    console.log(`[3b. transactionId without ProPay-] Fixed in ${file}`);
  }

  // Strip ProPay- in Admin Panel TrxID rendering if present
  if (code.includes('children:V.transactionId})]}')) {
    code = code.replaceAll('children:V.transactionId})]}', 'children:String(V.transactionId||"").replace(/^ProPay-/i,"")})]}');
    modified = true;
    console.log(`[3c. Admin TrxID display stripped ProPay-] Fixed in ${file}`);
  }

  // 4. Fix Admin Panel deposit status filter so approved and cancelled deposits match correctly
  const oldFilter = 'K.filter(V=>de==="all"||V.status===de)';
  const newFilter = 'K.filter(V=>de==="all"||(de==="pending"?(V.status==="pending"||V.status==="processing"):(de==="approved"?(V.status==="approved"||V.status==="success"||V.credited===!0||V.status===1):(V.status==="rejected"||V.status==="cancelled"||V.status==="failed"||V.status===2||V.status===de))))';
  if (code.includes(oldFilter)) {
    code = code.replaceAll(oldFilter, newFilter);
    modified = true;
    console.log(`[4. Admin Filter] Status filter broadened in ${file}`);
  }

  // 5. Fix submit button stuck on "প্রসেসিং..." when returning from payment gateway
  // Hook up pageshow, focus, visibilitychange to reset Ee (isSubmitting) to false
  const oldEffectTarget = 'R.useEffect(()=>{(async()=>{const L=await En(We(Ie,"settings","paymentMethods"));L.exists()&&nr(ee=>({...ee,...L.data()}))})()},[]);';
  const newEffectTarget = 'R.useEffect(()=>{const _rst=()=>{xe(!1);try{window._sn777_dep_submitting=!1}catch(e){}};window._sn777_reset_dep=_rst;window.addEventListener("pageshow",_rst);window.addEventListener("focus",_rst);document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"&&_rst()});return()=>{window.removeEventListener("pageshow",_rst);window.removeEventListener("focus",_rst)}},[]);' + oldEffectTarget;

  if (code.includes(oldEffectTarget) && !code.includes('window._sn777_reset_dep')) {
    code = code.replace(oldEffectTarget, newEffectTarget);
    modified = true;
    console.log(`[5. Reset Submitting on Return] Added pageshow/visibilitychange listener in ${file}`);
  }

  // 6. Reset Ee (isSubmitting) in Kr submit handler with 3-second safety timeout instead of locking permanently
  const oldSubmitLock = 'xe(!0);window._sn777_dep_submitting=!0;setTimeout(()=>{window._sn777_dep_submitting=!1},10000);';
  const newSubmitLock = 'xe(!0);window._sn777_dep_submitting=!0;setTimeout(()=>{try{window._sn777_dep_submitting=!1;xe(!1)}catch(e){}},3000);';
  if (code.includes(oldSubmitLock)) {
    code = code.replaceAll(oldSubmitLock, newSubmitLock);
    modified = true;
    console.log(`[6. Submit Timeout] Replaced 10s permanent lock with 3s auto-reset in ${file}`);
  }

  // 7. Reset deposit submitting when switching tabs or clicking deposit
  const oldMi = 'Mi=async E=>{H("funds"),O("deposit")};';
  const newMi = 'Mi=async E=>{try{window._sn777_reset_dep&&window._sn777_reset_dep()}catch(e){}H("funds"),O("deposit")};';
  if (code.includes(oldMi)) {
    code = code.replaceAll(oldMi, newMi);
    modified = true;
    console.log(`[7. Mi Tab Switch Reset] Reset submitting on entering deposit tab in ${file}`);
  }

  // 8. Check syntax with esbuild before writing
  try {
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(file, code, "utf8");
    console.log(`[SAVED] Successfully patched and validated ${file}`);
  } catch (err) {
    console.error(`[SYNTAX ERROR] Could not save ${file}:`, err.message);
  }
});
