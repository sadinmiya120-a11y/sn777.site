const fs = require("fs");
const path = require("path");

function patchFixLogin() {
  const dirs = [
    path.join(__dirname, "dist", "assets"),
    path.join(__dirname, "dist_backup", "assets")
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);
    const file = files.find(f => f.startsWith("index-") && f.endsWith(".js"));
    if (!file) continue;

    const filePath = path.join(dir, file);
    let code = fs.readFileSync(filePath, "utf8");
    let modified = false;

    const target = 'ro=async(E,L,ee=!0)=>{try{xe(!0);const W=E.trim(),ye=L.trim();let Te=`${W.toLowerCase().replace(/\\s+/g,"")}@sn777.com`,Le=In(hn(Ie,"users"),Qt("email","==",Te)),';
    const replacement = 'ro=async(E,L,ee=!0)=>{try{xe(!0);const W=E.trim(),ye=L.trim();let __cleanW=W.toLowerCase().replace(/\\s+/g,"");let Te=__cleanW.includes("@")?__cleanW:`${__cleanW}@sn777.com`;let Le=In(hn(Ie,"users"),Qt("email","==",Te)),';

    if (code.includes(target)) {
      code = code.replace(target, replacement);
      modified = true;
      console.log(`[${file}] Patched login function to handle email inputs properly.`);
    }

    const target2 = 'window.__sn777_user_profile = { ...Ue, uid: L.uid };';
    const replacement2 = 'window.__sn777_user_profile = { ...Ue, uid: qe };';
    if (code.includes(target2)) {
      code = code.replace(target2, replacement2);
      modified = true;
      console.log(`[${file}] Patched window.__sn777_user_profile uid assignment.`);
    }

    const target3 = ': L.uid);      var _numBal';
    const replacement3 = ': (qe || (L && L.uid ? L.uid : "")));      var _numBal';
    if (code.includes(target3)) {
      code = code.replace(target3, replacement3);
      modified = true;
      console.log(`[${file}] Patched _uId in login ro.`);
    }

    if (modified) {
      fs.writeFileSync(filePath, code);
    }
  }
}

patchFixLogin();
