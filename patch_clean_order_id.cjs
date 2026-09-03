const fs = require("fs");

function patchFile(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");

  const target1 = 'xe(!0);const Te="ORD-"+gt.currentUser.uid+"-"+Date.now(),Ne="cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc",gateway_url=(Be==="nagad")?"https://checkout.propay.cyou/pay/Nagad.php":"https://checkout.propay.cyou/pay/Bkash.php",qe=new URLSearchParams({api_key:Ne,uid:gt.currentUser.uid,amount:Number(E).toFixed(2),order_no:Te,return_url:"https://www.sn777.site/success.php",pass_through_key:Ne,pass_through_callback_url:"https://www.sn777.site/callback.php"}),Le=gateway_url+"?"+qe.toString();const _';

  const target2 = 'xe(!0);const _d=new Date(),_dp=n=>String(n).padStart(2,"0"),_dtStr=_d.getFullYear()+_dp(_d.getMonth()+1)+_dp(_d.getDate())+"-"+_dp(_d.getHours())+_dp(_d.getMinutes())+_dp(_d.getSeconds()),Te="ORD-"+_dtStr+"-"+Math.floor(1000+Math.random()*9000),Ne="cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc",gateway_url=(Be==="nagad")?"https://checkout.propay.cyou/pay/Nagad.php":"https://checkout.propay.cyou/pay/Bkash.php",_curOrigin=(typeof window!=="undefined"&&window.location&&window.location.origin)?window.location.origin:"https://sn777.site",qe=new URLSearchParams({api_key:Ne,uid:gt.currentUser.uid,amount:Number(E).toFixed(2),order_no:Te,return_url:_curOrigin+"/success.php?order_no="+encodeURIComponent(Te),pass_through_key:Ne,pass_through_callback_url:_curOrigin+"/callback.php"}),Le=gateway_url+"?"+qe.toString();const _';

  const replacement = 'xe(!0);const Te="ORD"+Date.now(),Ne="cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc",gateway_url=(Be==="nagad")?"https://checkout.propay.cyou/pay/Nagad.php":"https://checkout.propay.cyou/pay/Bkash.php",_curOrigin=(typeof window!=="undefined"&&window.location&&window.location.origin)?window.location.origin:"https://sn777.site",qe=new URLSearchParams({api_key:Ne,uid:gt.currentUser.uid,amount:Number(E).toFixed(2),order_no:Te,return_url:_curOrigin+"/success.php?order_no="+encodeURIComponent(Te),pass_through_key:Ne,pass_through_callback_url:_curOrigin+"/callback.php"}),Le=gateway_url+"?"+qe.toString();const _';

  if (code.includes(target2)) {
    code = code.replace(target2, replacement);
    fs.writeFileSync(file, code);
    console.log(`[SUCCESS] Patched ORD<timestamp> Order ID (from target2) in ${file}`);
  } else if (code.includes(target1)) {
    code = code.replace(target1, replacement);
    fs.writeFileSync(file, code);
    console.log(`[SUCCESS] Patched ORD<timestamp> Order ID (from target1) in ${file}`);
  } else if (code.includes('Te="ORD"+Date.now(),Ne=')) {
    console.log(`[OK] Already patched with ORD<timestamp> Order ID in ${file}`);
  } else {
    console.log(`[SKIP] Target not found in ${file}`);
  }
}

patchFile("dist/assets/index-sn777-v5.js");
patchFile("dist_backup/assets/index-sn777-v5.js");
