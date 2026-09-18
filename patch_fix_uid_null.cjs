const fs = require("fs");
const path = require("path");

const filesToPatch = [
  path.join(__dirname, "dist", "assets", "index-sn777-v5.js"),
  path.join(__dirname, "dist_backup", "assets", "index-sn777-v5.js")
];

for (const targetFile of filesToPatch) {
  if (!fs.existsSync(targetFile)) {
    console.warn(`[patch_fix_uid_null] File not found: ${targetFile}`);
    continue;
  }

  let code = fs.readFileSync(targetFile, "utf8");
  let modified = false;

  // 1. Fix BankAccountSection userKey and useEffect dependency array
  if (code.includes('var userKey = (user.id || user.uid || user.username || user.phone || "").trim() || "default";')) {
    code = code.replace(
      'var userKey = (user.id || user.uid || user.username || user.phone || "").trim() || "default";',
      'user = user || {}; var userKey = ((user && (user.id || user.uid || user.username || user.phone)) || "").trim() || "default";'
    );
    modified = true;
    console.log(`[${targetFile}] Patched BankAccountSection userKey`);
  }

  if (code.includes('}, [user.id, user.uid, user.username, user.phone]);')) {
    code = code.replace(
      '}, [user.id, user.uid, user.username, user.phone]);',
      '}, [user ? user.id : null, user ? user.uid : null, user ? user.username : null, user ? user.phone : null]);'
    );
    modified = true;
    console.log(`[${targetFile}] Patched BankAccountSection useEffect dependencies`);
  }

  // 2. Fix L.uid in login function ro
  const oldLoginUid = 'var _uId = (Ue.username && Ue.username !== "ব্যবহারকারী") ? Ue.username : (Ue.phone ? Ue.phone.replace(/[^0-9]/g, "") : L.uid);';
  const newLoginUid = 'var _uId = (Ue.username && Ue.username !== "ব্যবহারকারী") ? Ue.username : (Ue.phone ? Ue.phone.replace(/[^0-9]/g, "") : (qe || (L && L.uid ? L.uid : "")));';
  if (code.includes(oldLoginUid)) {
    code = code.replace(oldLoginUid, newLoginUid);
    modified = true;
    console.log(`[${targetFile}] Patched login ro _uId assignment`);
  }

  // 3. Fix checkPendingAuto: body:JSON.stringify({uid:gt.currentUser.uid})
  if (code.includes('body:JSON.stringify({uid:gt.currentUser.uid})')) {
    code = code.replace(
      'body:JSON.stringify({uid:gt.currentUser.uid})',
      'body:JSON.stringify({uid:(gt.currentUser?gt.currentUser.uid:"")})'
    );
    modified = true;
    console.log(`[${targetFile}] Patched checkPendingAuto body uid`);
  }

  // 4. Fix deposit creation with unsafe gt.currentUser.uid
  if (code.includes('uid:gt.currentUser.uid,username:_uName,phone:_uPhone,userPhone:_uPhone,accountNumber:_uPhone')) {
    code = code.replace(
      'uid:gt.currentUser.uid,username:_uName,phone:_uPhone,userPhone:_uPhone,accountNumber:_uPhone',
      'uid:(gt.currentUser?gt.currentUser.uid:(ve?(ve.id||ve.uid):"")||""),username:_uName,phone:_uPhone,userPhone:_uPhone,accountNumber:_uPhone'
    );
    modified = true;
    console.log(`[${targetFile}] Patched deposit creation uid`);
  }

  // 5. Fix deposit creation localStorage.getItem / setItem
  if (code.includes('localStorage.getItem("sn777_tx_list_"+gt.currentUser.uid)')) {
    code = code.replaceAll(
      'localStorage.getItem("sn777_tx_list_"+gt.currentUser.uid)',
      'localStorage.getItem("sn777_tx_list_"+(gt.currentUser?gt.currentUser.uid:(ve?(ve.id||ve.uid):"")||""))'
    );
    modified = true;
    console.log(`[${targetFile}] Patched sn777_tx_list_ getItem for currentUser`);
  }

  if (code.includes('localStorage.setItem("sn777_tx_list_"+gt.currentUser.uid,')) {
    code = code.replaceAll(
      'localStorage.setItem("sn777_tx_list_"+gt.currentUser.uid,',
      'localStorage.setItem("sn777_tx_list_"+(gt.currentUser?gt.currentUser.uid:(ve?(ve.id||ve.uid):"")||""),'
    );
    modified = true;
    console.log(`[${targetFile}] Patched sn777_tx_list_ setItem for currentUser`);
  }

  // 6. Fix manual deposit submission: Te=We(Ie,"users",gt.currentUser.uid,"history",Oi)
  if (code.includes('Te=We(Ie,"users",gt.currentUser.uid,"history",Oi)')) {
    code = code.replaceAll(
      'Te=We(Ie,"users",gt.currentUser.uid,"history",Oi)',
      'Te=(gt.currentUser&&gt.currentUser.uid)?We(Ie,"users",gt.currentUser.uid,"history",Oi):null'
    );
    modified = true;
    console.log(`[${targetFile}] Patched manual deposit history doc ref`);
  }

  // 7. Fix manual deposit wt=We(Ie,"users",gt.currentUser.uid)
  if (code.includes('const wt=We(Ie,"users",gt.currentUser.uid)')) {
    code = code.replaceAll(
      'const wt=We(Ie,"users",gt.currentUser.uid)',
      'const wt=(gt.currentUser&&gt.currentUser.uid)?We(Ie,"users",gt.currentUser.uid):null'
    );
    modified = true;
    console.log(`[${targetFile}] Patched wt user doc ref`);
  }

  // 8. Fix manual deposit tx uid:
  if (code.includes('uid:gt.currentUser.uid,username:(ve&&(ve.username||ve.name))||"User"')) {
    code = code.replace(
      'uid:gt.currentUser.uid,username:(ve&&(ve.username||ve.name))||"User"',
      'uid:(gt.currentUser?gt.currentUser.uid:(ve?(ve.id||ve.uid):"")||""),username:(ve&&(ve.username||ve.name))||"User"'
    );
    modified = true;
    console.log(`[${targetFile}] Patched manual deposit tx uid`);
  }

  // 9. Fix refreshUserTx call in buttons: refreshUserTx(gt.currentUser.uid)
  if (code.includes('refreshUserTx(gt.currentUser.uid)')) {
    code = code.replaceAll(
      'refreshUserTx(gt.currentUser.uid)',
      'refreshUserTx(gt.currentUser?gt.currentUser.uid:"")'
    );
    modified = true;
    console.log(`[${targetFile}] Patched refreshUserTx calls`);
  }

  // 10. Fix promo and voucher window.__prevUserBalanceUid=gt.currentUser.uid
  if (code.includes('window.__prevUserBalanceUid=gt.currentUser.uid')) {
    code = code.replaceAll(
      'window.__prevUserBalanceUid=gt.currentUser.uid',
      'window.__prevUserBalanceUid=(gt.currentUser?gt.currentUser.uid:"")'
    );
    modified = true;
    console.log(`[${targetFile}] Patched promo/voucher prevUserBalanceUid`);
  }

  // 11. Fix timeout check ((Ue=gt.currentUser)==null?void 0:Ue.uid)===L.uid
  if (code.includes('===L.uid&&((await En(W)).exists()')) {
    code = code.replace(
      '===L.uid&&((await En(W)).exists()',
      '===(L?L.uid:null)&&((await En(W)).exists()'
    );
    modified = true;
    console.log(`[${targetFile}] Patched timeout auth comparison`);
  }

  // 12. Fix BankAccountSection rendering: ensure user is never null
  if (code.includes('o.jsx(BankAccountSection,{user:ve,')) {
    code = code.replaceAll(
      'o.jsx(BankAccountSection,{user:ve,',
      'o.jsx(BankAccountSection,{user:ve||{},'
    );
    modified = true;
    console.log(`[${targetFile}] Patched BankAccountSection props`);
  }

  if (modified) {
    fs.writeFileSync(targetFile, code, "utf8");
    console.log(`[patch_fix_uid_null] Successfully patched ${targetFile}`);
  }
}
