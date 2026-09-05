const fs = require("fs");
const esbuild = require("esbuild");

const jsFiles = [
  "dist/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist_backup/assets/index-CUhzlpga-v3.js"
];

jsFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  // 1. Fix Firestore initialization: use auto-detect long polling rather than forcing long polling
  code = code.replace(
    /IR\(\$R,\{experimentalForceLongPolling:!0\}\)/g,
    'IR($R,{experimentalAutoDetectLongPolling:!0})'
  );

  // 2. Wrap En (getDoc) with offline catch fallback
  const oldEn = 'function En(n){n=Lt(n,mn);const e=Lt(n.firestore,An),t=Kn(e);return _R(t,n._key).then((s=>_1(e,n,s)))}';
  const newEn = 'function En(n){n=Lt(n,mn);const e=Lt(n.firestore,An),t=Kn(e);return _R(t,n._key).then((s=>_1(e,n,s))).catch((err)=>{console.warn("Firestore En offline/network handled:",err&&err.message);return{exists:()=>false,data:()=>({}),id:n?._key?.path?.lastSegment()||""}})}';
  if (code.includes(oldEn)) {
    code = code.replace(oldEn, newEn);
    console.log(`[${filePath}] En wrapped with offline fallback.`);
  }

  // 3. Wrap Gn (getDocs) with offline catch fallback
  const oldGn = 'function Gn(n){n=Lt(n,As);const e=Lt(n.firestore,An),t=Kn(e),s=new bl(e);return zR(n._query),TR(t,n._query).then((a=>new Ii(e,s,n,a)))}';
  const newGn = 'function Gn(n){n=Lt(n,As);const e=Lt(n.firestore,An),t=Kn(e),s=new bl(e);return zR(n._query),TR(t,n._query).then((a=>new Ii(e,s,n,a))).catch((err)=>{console.warn("Firestore Gn offline/network handled:",err&&err.message);return{empty:true,docs:[],size:0,forEach:()=>{}}})}';
  if (code.includes(oldGn)) {
    code = code.replace(oldGn, newGn);
    console.log(`[${filePath}] Gn wrapped with offline fallback.`);
  }

  try {
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(filePath, code, "utf8");
    console.log(`[${filePath}] Successfully patched Firestore connection settings.`);
  } catch (err) {
    console.error(`[${filePath}] Syntax Error:`, err.message);
  }
});
