const fs = require("fs");
const { parse } = require("acorn");

const files = [
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js",
  "dist_backup/assets/index-CUhzlpga-v3.js"
];

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  // Fix the invalid const _syncServerDeposits
  const badSegmentPrefix = 'const _syncServerDeposits=()=>{fetch("/api/admin/all-deposits")';
  if (code.includes(badSegmentPrefix)) {
    const startIdx = code.indexOf(badSegmentPrefix);
    const endMarker = 'return(async()=>{';
    const endIdx = code.indexOf(endMarker, startIdx);
    if (startIdx !== -1 && endIdx !== -1) {
      const validJeReplacement = 'je=(fetch("/api/admin/all-deposits").then(r=>r.json()).then(res=>{if(res&&res.deposits&&res.deposits.length>0){H(prev=>{const map=new Map();(prev||[]).forEach(d=>map.set(d.id||d.order_no,d));res.deposits.forEach(d=>map.set(d.id||d.order_no,d));return Array.from(map.values()).sort((a,b)=>new Date(b.timestamp||b.createdAt||0).getTime()-new Date(a.timestamp||a.createdAt||0).getTime())})}}).catch(()=>{}),setInterval(()=>{fetch("/api/admin/all-deposits").then(r=>r.json()).then(res=>{if(res&&res.deposits&&res.deposits.length>0){H(prev=>{const map=new Map();(prev||[]).forEach(d=>map.set(d.id||d.order_no,d));res.deposits.forEach(d=>map.set(d.id||d.order_no,d));return Array.from(map.values()).sort((a,b)=>new Date(b.timestamp||b.createdAt||0).getTime()-new Date(a.timestamp||a.createdAt||0).getTime())})}}).catch(()=>{})},4000),Dr(In(hn(Ie,"deposits"),Nb("timestamp","desc"),Oh(100)),Ge=>{const fbDocs=Ge.docs.map(_e=>({id:_e.id,..._e.data()}));H(prev=>{const map=new Map();(prev||[]).forEach(d=>map.set(d.id||d.order_no,d));fbDocs.forEach(d=>map.set(d.id||d.order_no,d));return Array.from(map.values()).sort((a,b)=>new Date(b.timestamp||b.createdAt||0).getTime()-new Date(a.timestamp||a.createdAt||0).getTime())})},Ge=>{console.warn("AdminPanel: Error loading deposits:",Ge)}));';
      code = code.substring(0, startIdx) + validJeReplacement + code.substring(endIdx);
      console.log(`[${filePath}] Replaced invalid const declaration with clean comma-operator je expression!`);
    }
  }

  // Also fix cleanup if it had _syncInterval
  const badCleanup = '()=>{try{clearInterval(_syncInterval)}catch(e){};V();be();je()}';
  if (code.includes(badCleanup)) {
    code = code.replace(badCleanup, '()=>{V(),be(),typeof je==="function"&&je()}');
  }

  // Ensure Kr is patched
  const krTarget = 'Le=gateway_url+"?"+qe.toString();try{localStorage.setItem("sn777_pending_order",JSON.stringify({order_no:Te,amount:Number(E),time:Date.now()}));const _newDepTx={id:Te,order_no:Te,uid:gt.currentUser.uid,type:"deposit",amount:E,finalCredit:E,method:Be,status:"pending",timestamp:new Date().toISOString(),createdAt:new Date().toISOString(),displayAmount:E,description:"ProPay ডিপোজিট "+E+" টাকা ("+Be.toUpperCase()+")"},_arr=JSON.parse(localStorage.getItem("sn777_tx_list_"+gt.currentUser.uid)||"[]");_arr.unshift(_newDepTx),localStorage.setItem("sn777_tx_list_"+gt.currentUser.uid,JSON.stringify(_arr)),typeof gs=="function"&&gs(_arr)}catch(e){}try{fetch("/api/record-transaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:Te,order_no:Te,uid:gt.currentUser.uid,type:"deposit",amount:E,method:Be,gateway:"propay",status:"pending"}),keepalive:!0}).catch(()=>{})}catch(e){}try{if(window.top&&window.top!==window)window.top.location.href=Le;else window.location.href=Le}catch(e){window.location.href=Le}setTimeout(()=>{try{window.location.assign(Le)}catch(e){}},100)}';
  const krReplacement = 'Le=gateway_url+"?"+qe.toString();const _nowIso=new Date().toISOString(),_uName=(ve&&(ve.username||ve.name))||(gt.currentUser&&(gt.currentUser.displayName||gt.currentUser.email))||"User";const _newDepTx={id:Te,order_no:Te,uid:gt.currentUser.uid,username:_uName,type:"deposit",amount:E,finalCredit:E,method:Be,status:"pending",timestamp:_nowIso,createdAt:_nowIso,gateway:"propay",senderNumber:"ProPay Gateway",transactionId:"ProPay-"+Te,displayAmount:E,description:"ProPay ডিপোজিট "+E+" টাকা ("+Be.toUpperCase()+")"};try{localStorage.setItem("sn777_pending_order",JSON.stringify({order_no:Te,amount:Number(E),time:Date.now()}));const _arr=JSON.parse(localStorage.getItem("sn777_tx_list_"+gt.currentUser.uid)||"[]");_arr.unshift(_newDepTx);localStorage.setItem("sn777_tx_list_"+gt.currentUser.uid,JSON.stringify(_arr));typeof gs=="function"&&gs(_arr)}catch(e){}try{await Promise.race([Tn(We(Ie,"deposits",Te),_newDepTx),new Promise(r=>setTimeout(r,600))])}catch(e){console.warn("Firestore deposits write:",e)}try{await Promise.race([Tn(We(Ie,"transactions",Te),_newDepTx),new Promise(r=>setTimeout(r,300))])}catch(e){}try{await fetch("/api/record-transaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(_newDepTx),keepalive:!0}).catch(()=>{})}catch(e){}try{if(window.top&&window.top!==window)window.top.location.href=Le;else window.location.href=Le}catch(e){window.location.href=Le}setTimeout(()=>{try{window.location.assign(Le)}catch(e){}},100)}';

  if (code.includes(krTarget)) {
    code = code.replace(krTarget, krReplacement);
    console.log(`[${filePath}] Patched Kr deposit submission!`);
  }

  // Date formatting fallback
  const dateTarget = 'children:new Date(V.timestamp).toLocaleString()';
  const dateReplacement = 'children:new Date(V.timestamp||V.createdAt||Date.now()).toLocaleString()';
  if (code.includes(dateTarget)) {
    code = code.replace(dateTarget, dateReplacement);
  }

  fs.writeFileSync(filePath, code, "utf8");

  // Validate syntax with acorn
  try {
    parse(code, { ecmaVersion: "latest", sourceType: "module" });
    console.log(`[${filePath}] PARSED 100% OK!`);
  } catch(err) {
    console.error(`[${filePath}] Parse error:`, err.message, "at", err.loc);
  }
});
