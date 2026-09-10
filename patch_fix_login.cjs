const fs = require("fs");
const path = require("path");

function patchFixLogin() {
  const dir = path.join(__dirname, "dist", "assets");
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  const file = files.find(f => f.startsWith("index-") && f.endsWith(".js"));
  if (!file) return;

  const filePath = path.join(dir, file);
  let code = fs.readFileSync(filePath, "utf8");
  let modified = false;

  const target = 'ro=async(E,L,ee=!0)=>{try{xe(!0);const W=E.trim(),ye=L.trim();let Te=`${W.toLowerCase().replace(/\\s+/g,"")}@sn777.com`,Le=In(hn(Ie,"users"),Qt("email","==",Te)),';
  const replacement = 'ro=async(E,L,ee=!0)=>{try{xe(!0);const W=E.trim(),ye=L.trim();let __cleanW=W.toLowerCase().replace(/\\s+/g,"");let Te=__cleanW.includes("@")?__cleanW:`${__cleanW}@sn777.com`;let Le=In(hn(Ie,"users"),Qt("email","==",Te)),';

  if (code.includes(target)) {
    code = code.replace(target, replacement);
    modified = true;
    console.log(`[${file}] Patched login function to handle email inputs properly.`);
  } else {
    console.warn(`[${file}] Target login function not found for email fix.`);
  }

  // Also fix the case where L.uid might be undefined in window.__sn777_user_profile
  // It is window.__sn777_user_profile = { ...Ue, uid: L.uid }; but L is a string!
  // Wait, let's see if we can fix that too, just in case. qe is the document ID (uid).
  const target2 = 'window.__sn777_user_profile = { ...Ue, uid: L.uid };';
  const replacement2 = 'window.__sn777_user_profile = { ...Ue, uid: qe };';
  if (code.includes(target2)) {
    code = code.replace(target2, replacement2);
    modified = true;
    console.log(`[${file}] Patched window.__sn777_user_profile uid assignment.`);
  }

  if (modified) {
    fs.writeFileSync(filePath, code);
  }
}

patchFixLogin();
