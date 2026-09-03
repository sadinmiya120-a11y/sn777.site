const fs = require("fs");

function patchFile(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");

  // 1. Prevent double-click / duplicate triggering of Kr
  const oldKrStart = "Kr=async()=>{if(!gt.currentUser){";
  const newKrStart = "Kr=async()=>{if(window._sn777_dep_submitting)return;if(!gt.currentUser){";
  if (code.includes(oldKrStart)) {
    code = code.replace(oldKrStart, newKrStart);
    console.log(`[SUCCESS] Added double-click guard to Kr in ${file}`);
  }

  // 2. Lock and set unique ORD<timestamp>
  const target1 = 'xe(!0);const Te="ORD-"+gt.currentUser.uid+"-"+Date.now(),Ne="cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc",gateway_url=(Be==="nagad")?"https://checkout.propay.cyou/pay/Nagad.php":"https://checkout.propay.cyou/pay/Bkash.php",qe=new URLSearchParams({api_key:Ne,uid:gt.currentUser.uid,amount:Number(E).toFixed(2),order_no:Te,return_url:"https://www.sn777.site/success.php",pass_through_key:Ne,pass_through_callback_url:"https://www.sn777.site/callback.php"}),Le=gateway_url+"?"+qe.toString();const _';

  const target2 = 'xe(!0);const _d=new Date(),_dp=n=>String(n).padStart(2,"0"),_dtStr=_d.getFullYear()+_dp(_d.getMonth()+1)+_dp(_d.getDate())+"-"+_dp(_d.getHours())+_dp(_d.getMinutes())+_dp(_d.getSeconds()),Te="ORD-"+_dtStr+"-"+Math.floor(1000+Math.random()*9000),Ne="cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc",gateway_url=(Be==="nagad")?"https://checkout.propay.cyou/pay/Nagad.php":"https://checkout.propay.cyou/pay/Bkash.php",_curOrigin=(typeof window!=="undefined"&&window.location&&window.location.origin)?window.location.origin:"https://sn777.site",qe=new URLSearchParams({api_key:Ne,uid:gt.currentUser.uid,amount:Number(E).toFixed(2),order_no:Te,return_url:_curOrigin+"/success.php?order_no="+encodeURIComponent(Te),pass_through_key:Ne,pass_through_callback_url:_curOrigin+"/callback.php"}),Le=gateway_url+"?"+qe.toString();const _';

  const target3 = 'xe(!0);const Te="ORD"+Date.now(),Ne="cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc",gateway_url=(Be==="nagad")?"https://checkout.propay.cyou/pay/Nagad.php":"https://checkout.propay.cyou/pay/Bkash.php",_curOrigin=(typeof window!=="undefined"&&window.location&&window.location.origin)?window.location.origin:"https://sn777.site",qe=new URLSearchParams({api_key:Ne,uid:gt.currentUser.uid,amount:Number(E).toFixed(2),order_no:Te,return_url:_curOrigin+"/success.php?order_no="+encodeURIComponent(Te),pass_through_key:Ne,pass_through_callback_url:_curOrigin+"/callback.php"}),Le=gateway_url+"?"+qe.toString();const _';

  const replacement = 'xe(!0);window._sn777_dep_submitting=!0;setTimeout(()=>{window._sn777_dep_submitting=!1},10000);const Te="ORD"+Date.now(),Ne="cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc",gateway_url=(Be==="nagad")?"https://checkout.propay.cyou/pay/Nagad.php":"https://checkout.propay.cyou/pay/Bkash.php",_curOrigin=(typeof window!=="undefined"&&window.location&&window.location.origin)?window.location.origin:"https://sn777.site",qe=new URLSearchParams({api_key:Ne,uid:gt.currentUser.uid,amount:Number(E).toFixed(2),order_no:Te,return_url:_curOrigin+"/success.php?order_no="+encodeURIComponent(Te),pass_through_key:Ne,pass_through_callback_url:_curOrigin+"/callback.php"}),Le=gateway_url+"?"+qe.toString();const _';

  if (code.includes(target3)) {
    code = code.replace(target3, replacement);
    console.log(`[SUCCESS] Patched submit lock into target3 in ${file}`);
  } else if (code.includes(target2)) {
    code = code.replace(target2, replacement);
    console.log(`[SUCCESS] Patched submit lock into target2 in ${file}`);
  } else if (code.includes(target1)) {
    code = code.replace(target1, replacement);
    console.log(`[SUCCESS] Patched submit lock into target1 in ${file}`);
  }

  // 3. Remove duplicate setTimeout redirect
  const oldRedirect = "try{if(window.top&&window.top!==window)window.top.location.href=Le;else window.location.href=Le}catch(e){window.location.href=Le}setTimeout(()=>{try{window.location.assign(Le)}catch(e){}},100)";
  const newRedirect = "try{if(window.top&&window.top!==window)window.top.location.href=Le;else window.location.href=Le}catch(e){window.location.href=Le}";
  if (code.includes(oldRedirect)) {
    code = code.replace(oldRedirect, newRedirect);
    console.log(`[SUCCESS] Removed duplicate setTimeout redirect in ${file}`);
  }

  fs.writeFileSync(file, code);
}

patchFile("dist/assets/index-sn777-v5.js");
patchFile("dist_backup/assets/index-sn777-v5.js");

try {
  require("./patch_full_deposit_fix.cjs");
} catch(e) {}

