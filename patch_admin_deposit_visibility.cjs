const fs = require("fs");
const esbuild = require("esbuild");

const files = [
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js"
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  // 1. Fix AdminPanel deposit merger so pending deposits from the server are never overridden by old client cancelled state
  const oldAdminMerge = 'res.deposits.forEach(d=>{const ex=map.get(d.id||d.order_no);if(ex){if(ex.status==="approved"||ex.status==="success")d.status="approved";else if(ex.status==="rejected"||ex.status==="cancelled")d.status="cancelled";}map.set(d.id||d.order_no,d)})';
  const newAdminMerge = 'res.deposits.forEach(d=>{const ex=map.get(d.id||d.order_no);map.set(d.id||d.order_no,{...ex,...d})})';
  if (code.includes(oldAdminMerge)) {
    code = code.replaceAll(oldAdminMerge, newAdminMerge);
    modified = true;
    console.log(`[1. Admin Merge] Fixed in ${file}`);
  }

  // 2. Fix Kr to use setDoc (Ks) instead of updateDoc (Tn), and add 300ms delay for /api/record-transaction fetch
  const oldKrSync = 'try{await Promise.race([Tn(We(Ie,"deposits",Te),_newDepTx),new Promise(r=>setTimeout(r,600))])}catch(e){console.warn("Firestore deposits write:",e)}try{await Promise.race([Tn(We(Ie,"transactions",Te),_newDepTx),new Promise(r=>setTimeout(r,300))])}catch(e){}try{await fetch("/api/record-transaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(_newDepTx),keepalive:!0}).catch(()=>{})}catch(e){}try{if(window.top&&window.top!==window)window.top.location.href=Le;else window.location.href=Le}catch(e){window.location.href=Le}';
  const newKrSync = 'try{await Promise.race([Ks(We(Ie,"deposits",Te),_newDepTx,{merge:!0}),new Promise(r=>setTimeout(r,600))])}catch(e){console.warn("Firestore deposits write:",e)}try{await Promise.race([Ks(We(Ie,"transactions",Te),_newDepTx,{merge:!0}),new Promise(r=>setTimeout(r,300))])}catch(e){}try{await fetch("/api/record-transaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(_newDepTx),keepalive:!0}).catch(()=>{})}catch(e){}try{await new Promise(r=>setTimeout(r,300))}catch(e){}try{if(window.top&&window.top!==window)window.top.location.href=Le;else window.location.href=Le}catch(e){window.location.href=Le}';
  if (code.includes(oldKrSync)) {
    code = code.replace(oldKrSync, newKrSync);
    modified = true;
    console.log(`[2. Kr setDoc & delay] Fixed in ${file}`);
  }

  // 3. Fix manual deposit submission v to use setDoc (Ks) with merge: true instead of updateDoc (Tn)
  const oldManualTn1 = 'await Tn(W,Le);';
  const newManualTn1 = 'await Ks(W,Le,{merge:!0});';
  if (code.includes(oldManualTn1)) {
    code = code.replace(oldManualTn1, newManualTn1);
    modified = true;
    console.log(`[3. Manual Tn(W,Le)] Replaced with Ks in ${file}`);
  }

  const oldManualTn2 = 'await Tn(ye,{...Le,amount:jt,finalCredit:Ke,description:`ডিপোজিট রিকোয়েস্ট ${jt} টাকা (${Be.toUpperCase()})`});';
  const newManualTn2 = 'await Ks(ye,{...Le,amount:jt,finalCredit:Ke,description:`ডিপোজিট রিকোয়েস্ট ${jt} টাকা (${Be.toUpperCase()})`},{merge:!0});';
  if (code.includes(oldManualTn2)) {
    code = code.replace(oldManualTn2, newManualTn2);
    modified = true;
    console.log(`[3b. Manual Tn(ye,...)] Replaced with Ks in ${file}`);
  }

  // 4. Also validate syntax with esbuild before writing
  if (modified) {
    try {
      esbuild.transformSync(code, { loader: "js" });
      fs.writeFileSync(file, code, "utf8");
      console.log(`[SAVED] ${file} successfully patched and validated.`);
    } catch (err) {
      console.error(`[SYNTAX ERROR] in ${file}:`, err.message);
    }
  } else {
    console.log(`[NO CHANGES] for ${file}`);
  }
});
