const fs = require("fs");
const acorn = require("acorn");
const esbuild = require("esbuild");

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

  // 1. Fix const L assignment: change "const E=...,L=..." to "const E=...;let L=..."
  const oldConstL = 'const E=new URLSearchParams(window.location.search),L=E.get("order_no")||E.get("order_id")||E.get("ref"),ee=E.get("m");';
  const newLetL = 'const E=new URLSearchParams(window.location.search);let L=E.get("order_no")||E.get("order_id")||E.get("ref");const ee=E.get("m");';
  if (code.includes(oldConstL)) {
    code = code.replace(oldConstL, newLetL);
    modified = true;
    console.log(`[Fixed const L] in ${file}`);
  }

  // 2. Fix const Bn assignment in v()
  const oldBnAssign = 'if(!Bn){Bn=(ve&&(ve.phone||ve.username))||(gt.currentUser&&gt.currentUser.phoneNumber)||"01700000000"}';
  const newBnSafe = 'const _curSenderNum=(Bn&&Bn.trim())||(ve&&(ve.phone||ve.username))||(gt.currentUser&&gt.currentUser.phoneNumber)||"01700000000";try{Zs(_curSenderNum)}catch(_e){}';
  if (code.includes(oldBnAssign)) {
    code = code.replace(oldBnAssign, newBnSafe);
    modified = true;
    console.log(`[Fixed const Bn] in ${file}`);
  }

  // 3. Update usages of Bn in v() to use _curSenderNum
  const oldLeSender = 'Le={senderNumber:Bn||';
  const newLeSender = 'Le={senderNumber:(typeof _curSenderNum!=="undefined"?_curSenderNum:Bn)||';
  if (code.includes(oldLeSender)) {
    code = code.replace(oldLeSender, newLeSender);
    modified = true;
  }

  const oldTxPhone = 'phone:Bn||"",userPhone:Bn||"",accountNumber:Bn||""';
  const newTxPhone = 'phone:(typeof _curSenderNum!=="undefined"?_curSenderNum:Bn)||"",userPhone:(typeof _curSenderNum!=="undefined"?_curSenderNum:Bn)||"",accountNumber:(typeof _curSenderNum!=="undefined"?_curSenderNum:Bn)||""';
  if (code.includes(oldTxPhone)) {
    code = code.replace(oldTxPhone, newTxPhone);
    modified = true;
  }

  const oldTxSender = 'senderNumber:Bn||"Manual"';
  const newTxSender = 'senderNumber:(typeof _curSenderNum!=="undefined"?_curSenderNum:Bn)||"Manual"';
  if (code.includes(oldTxSender)) {
    code = code.replace(oldTxSender, newTxSender);
    modified = true;
  }

  // 4. Validate with Acorn and esbuild
  try {
    acorn.parse(code, { ecmaVersion: 2020 });
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(file, code, "utf8");
    console.log(`[SUCCESS] Saved and verified ${file}`);
  } catch (err) {
    console.error(`[ERROR] Parsing failed for ${file}:`, err.message);
    process.exit(1);
  }
}
