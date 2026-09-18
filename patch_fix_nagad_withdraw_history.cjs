const fs = require("fs");
const path = require("path");

const filesToPatch = [
  path.join(__dirname, "dist", "assets", "index-sn777-v5.js"),
  path.join(__dirname, "dist_backup", "assets", "index-sn777-v5.js")
];

for (const targetFile of filesToPatch) {
  if (!fs.existsSync(targetFile)) {
    console.warn(`[patch_fix_nagad_withdraw_history] File not found: ${targetFile}`);
    continue;
  }

  let code = fs.readFileSync(targetFile, "utf8");
  let modified = false;

  // 1. BankAccountSection: prioritize account matching currentMethod (e.g. nagad)
  const target1 = 'var activeAcc = accounts.find(function(a) { return a.id === selectedId; }) || accounts[0];';
  const repl1 = 'var activeAcc = (accounts.find(function(a) { return (a.id === selectedId && ((a.methodId||a.bankType||"").toLowerCase() === (currentMethod||"").toLowerCase())); }) || accounts.find(function(a) { return ((a.methodId||a.bankType||"").toLowerCase() === (currentMethod||"").toLowerCase()); }) || accounts.find(function(a) { return a.id === selectedId; }) || accounts[0]);';
  if (code.includes(target1)) {
    code = code.replace(target1, repl1);
    modified = true;
    console.log(`[${targetFile}] Patched BankAccountSection activeAcc selection`);
  }

  // 2. Withdrawal submission in Rc: ensure bankName and method accurately use selected method (Nagad/Bkash/etc)
  const target2 = 'bankName:(activeBank?activeBank.bankType:Be),accountHolder:(activeBank?activeBank.accHolder:ye.username),accountNumber:(activeBank?activeBank.accNumber:(activeBank&&activeBank.phone?activeBank.phone:"")),amount:ft,method:(activeBank?activeBank.bankType.toLowerCase():Be)';
  const repl2 = 'bankName:(Be==="nagad"?"Nagad":Be==="bkash"?"Bkash":Be==="rocket"?"Rocket":Be==="upay"?"Upay":(Be?(Be.charAt(0).toUpperCase()+Be.slice(1)):(activeBank?activeBank.bankType:"Nagad"))),accountHolder:(activeBank?activeBank.accHolder:ye.username),accountNumber:(activeBank?activeBank.accNumber:(activeBank&&activeBank.phone?activeBank.phone:"")),amount:ft,method:(Be==="nagad"?"Nagad":Be==="bkash"?"Bkash":Be==="rocket"?"Rocket":Be==="upay"?"Upay":(Be||(activeBank?activeBank.bankType:"Nagad")))';
  if (code.includes(target2)) {
    code = code.replace(target2, repl2);
    modified = true;
    console.log(`[${targetFile}] Patched withdrawal doc submission method & bankName`);
  }

  // 3. _newWthTx object: ensure method is Nagad / Bkash and has bankName & paymentMethod
  const target3 = 'const _newWthTx={id:is,uid:E.uid,type:"withdraw",amount:ft,method:Be,status:"pending",timestamp:Rs,createdAt:Rs,withdrawNo:nwS,serialNo:nwS,displayAmount:ft';
  const repl3 = 'const _finalWthMethod=(Be==="nagad"?"Nagad":Be==="bkash"?"Bkash":Be==="rocket"?"Rocket":Be==="upay"?"Upay":(Be||(activeBank?activeBank.bankType:"Nagad")));const _newWthTx={id:is,uid:E.uid,type:"withdraw",amount:ft,method:_finalWthMethod,bankName:_finalWthMethod,paymentMethod:_finalWthMethod,accountNumber:(activeBank?activeBank.accNumber:(activeBank&&activeBank.phone?activeBank.phone:"")),accountHolder:(activeBank?activeBank.accHolder:ye.username),status:"pending",timestamp:Rs,createdAt:Rs,withdrawNo:nwS,serialNo:nwS,displayAmount:ft';
  if (code.includes(target3)) {
    code = code.replace(target3, repl3);
    modified = true;
    console.log(`[${targetFile}] Patched _newWthTx object`);
  }

  // 4. History modal card rendering: ensure PAY TYPE detects Nagad / নগদ accurately
  const target4 = 'h=e.method||e.paymentMethod||(s%2===0?"Bkash":"Nagad")';
  const repl4 = '_rawM=String(e.method||e.bankName||e.paymentMethod||e.channel||"").trim(),_lowM=_rawM.toLowerCase(),h=_lowM.includes("nagad")||_lowM.includes("নগদ")?"Nagad":_lowM.includes("bkash")||_lowM.includes("বিকাশ")?"Bkash":_lowM.includes("rocket")||_lowM.includes("রকেট")?"Rocket":_lowM.includes("upay")||_lowM.includes("উপায়")||_lowM.includes("উপায়")?"Upay":_lowM.includes("usdterc20")?"USDT ERC20":_lowM.includes("usdt")?"USDT TRC20":_lowM.includes("binance")?"Binance":_rawM?(_rawM.charAt(0).toUpperCase()+_rawM.slice(1)):(isWth(e)?"Nagad":(s%2===0?"Bkash":"Nagad"))';
  if (code.includes(target4)) {
    code = code.replaceAll(target4, repl4);
    modified = true;
    console.log(`[${targetFile}] Patched history card PAY TYPE display`);
  }

  if (modified) {
    fs.writeFileSync(targetFile, code, "utf8");
    console.log(`[patch_fix_nagad_withdraw_history] Successfully patched ${targetFile}`);
  }
}
