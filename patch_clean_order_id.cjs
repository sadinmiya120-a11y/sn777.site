const fs = require("fs");
function patchFile(file) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, "utf8");

  const replacement = 'xe(!0);window._sn777_dep_submitting=!0;setTimeout(()=>{window._sn777_dep_submitting=!1},10000);const v=typeof gt!=="undefined"&&gt.currentUser?gt.currentUser.uid:"Guest",Te="ORD"+Date.now(),Ne="cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc",gateway_url=(Be==="nagad")?"https://checkout.propay.cyou/pay/Nagad.php":"https://checkout.propay.cyou/pay/Bkash.php",_curOrigin=(typeof window!=="undefined"&&window.location&&window.location.origin)?window.location.origin:"https://sn777.site",qe=new URLSearchParams({api_key:Ne,uid:v,amount:Number(E).toFixed(2),order_no:Te,return_url:_curOrigin+"/success.php?order_no="+encodeURIComponent(Te),pass_through_key:Ne,pass_through_callback_url:"https://sn777.site/callback.php"}),Le=gateway_url+"?"+qe.toString();const _';

  // Fix up the callback URL if it's dynamic
  code = code.replace(/pass_through_callback_url:_curOrigin\+"\/callback\.php"/g, 'pass_through_callback_url:"https://sn777.site/callback.php"');
  code = code.replace(/pass_through_callback_url:"[^"]+"/g, 'pass_through_callback_url:"https://sn777.site/callback.php"');

  fs.writeFileSync(file, code);
}
patchFile("dist/assets/index-sn777-v5.js");
patchFile("dist_backup/assets/index-sn777-v5.js");

try {
  require("./patch_full_deposit_fix.cjs");
} catch(e) {}
