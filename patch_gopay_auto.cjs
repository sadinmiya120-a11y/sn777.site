const fs = require('fs');

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File ${filePath} does not exist. Skipping.`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Patch GOPay checkout URL parameters and localStorage tracking
  const target1 = `const Ue=\`\${qe}/api/gopay-callback\`,Ke=\`\${qe}?m=1&order_no=\${Te}\`,jt=Be==="bkash"?"https://checkout.gopay.cyou/pay/Bkash.php":"https://checkout.gopay.cyou/pay/Nagad.php",wt=new URLSearchParams({api_key:Ne,uid:gt.currentUser.uid,amount:Number(E).toFixed(2),order_no:Te,return_url:Ke,pass_through_key:Ne,pass_through_callback_url:Ue});Le=\`\${jt}?\${wt.toString()}\``;

  const replace1 = `const Ue=\`\${qe}/api/gopay-callback\`,Ke=\`\${qe}/success?m=1&order_no=\${Te}\`,jt=Be==="bkash"?"https://checkout.gopay.cyou/pay/Bkash.php":"https://checkout.gopay.cyou/pay/Nagad.php",wt=new URLSearchParams({api_key:Ne,uid:gt.currentUser.uid,amount:Number(E).toFixed(2),order_no:Te,return_url:Ke,success_url:Ke,cancel_url:\`\${qe}/fail?order_no=\${Te}\`,callback_url:Ue,webhook_url:Ue,notify_url:Ue,ipn_url:Ue,pass_through_key:Ne,pass_through_callback_url:Ue});try{localStorage.setItem("sn777_pending_order",JSON.stringify({order_no:Te,amount:Number(E),time:Date.now()}))}catch(e){}Le=\`\${jt}?\${wt.toString()}\``;

  if (content.includes(target1)) {
    content = content.replace(target1, replace1);
    modified = true;
    console.log(`[${filePath}] Patched GOPay checkout params and storage tracking`);
  }

  // 2. Patch URL and Pending Order useEffect
  const target2 = `R.useEffect(()=>{if(!gt.currentUser)return;const E=new URLSearchParams(window.location.search),L=E.get("order_no"),ee=E.get("m");if(L&&(L.startsWith("deposit_")||L.startsWith("ORD"))){H("home");Ls(!1);(E.get("status")!=="cancel"&&E.get("status")!=="fail"&&ee!=="0")?(async()=>{try{const resp=await fetch("/api/verify-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_no:L})});const resData=await resp.json();if(resData.success||resData.status==="approved"||resData.status==="success"){sr(\`🎉 পেমেন্ট সফল হয়েছে! ৳\${resData.amount||resData.finalCredit||200} টাকা যোগ করা হয়েছে।\`);Er(!0)}else{sr("পেমেন্ট সম্পন্ন হয়েছে।");Er(!0)}}catch(Te){console.error("Auto approve error:",Te)}})():(()=>{const cancelMsg="❌ পেমেন্ট বাতিল করা হয়েছে!\\n\\nআপনার ডিপোজিট রিকোয়েস্টটি সম্পন্ন করা যায়নি বা বাতিল করা হয়েছে।";sr(cancelMsg);Er(!0);Fe(cancelMsg);Je(!0)})();try{const W=new URL(window.location.href);W.searchParams.delete("order_no"),W.searchParams.delete("m"),window.history.replaceState({},document.title,W.toString())}catch(W){console.warn("URL replaceState failed:",W)}}},[gt.currentUser]);`;

  const replace2 = `R.useEffect(()=>{if(!gt.currentUser)return;const checkPendingAuto=()=>{if(!gt.currentUser)return;fetch("/api/auto-check-user-deposits",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({uid:gt.currentUser.uid})}).then(r=>r.json()).then(res=>{if(res&&res.success&&res.results&&res.results.length>0){const appItem=res.results.find(it=>it.result&&it.result.success);if(appItem){try{localStorage.removeItem("sn777_pending_order")}catch(e){}if(res.user){ss(prev=>prev?{...prev,balance:res.user.balance,totalDeposited:res.user.totalDeposited,approvedDepositsCount:res.user.approvedDepositsCount,adminApproved:res.user.adminApproved}:null)}sr(\`🎉 পেমেন্ট সফল হয়েছে! ৳\${appItem.result.finalCredit||appItem.result.amount||500} টাকা একাউন্টে যোগ করা হয়েছে।\`);Er(!0)}}}).catch(()=>{})};checkPendingAuto();const autoTimer=setInterval(checkPendingAuto,5000),handleFocus=()=>checkPendingAuto();window.addEventListener("focus",handleFocus);document.addEventListener("visibilitychange",handleFocus);const E=new URLSearchParams(window.location.search),L=E.get("order_no")||E.get("order_id")||E.get("ref"),ee=E.get("m");if(L&&(L.startsWith("deposit_")||L.startsWith("ORD"))){H("home");Ls(!1);(E.get("status")!=="cancel"&&E.get("status")!=="fail"&&ee!=="0")?(async()=>{try{const resp=await fetch("/api/verify-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_no:L})});const resData=await resp.json();try{localStorage.removeItem("sn777_pending_order")}catch(e){}if(resData.success||resData.status==="approved"||resData.status==="success"){sr(\`🎉 পেমেন্ট সফল হয়েছে! ৳\${resData.finalCredit||resData.amount||500} টাকা যোগ করা হয়েছে।\`);Er(!0);if(gt.currentUser){En(We(Ie,"users",gt.currentUser.uid)).then(uDoc=>{if(uDoc.exists()){const uD=uDoc.data();ss(prev=>prev?{...prev,balance:uD.balance,totalDeposited:uD.totalDeposited,approvedDepositsCount:uD.approvedDepositsCount}:null)}})}}else{sr("পেমেন্ট সম্পন্ন হয়েছে।");Er(!0)}}catch(Te){console.error("Auto approve error:",Te)}})():(()=>{const cancelMsg="❌ পেমেন্ট বাতিল করা হয়েছে!\\n\\nআপনার ডিপোজিট রিকোয়েস্টটি সম্পন্ন করা যায়নি বা বাতিল করা হয়েছে।";sr(cancelMsg);Er(!0);Fe(cancelMsg);Je(!0)})();try{const W=new URL(window.location.href);W.searchParams.delete("order_no");W.searchParams.delete("order_id");W.searchParams.delete("ref");W.searchParams.delete("m");window.history.replaceState({},document.title,W.toString())}catch(W){console.warn("URL replaceState failed:",W)}}return()=>{clearInterval(autoTimer);window.removeEventListener("focus",handleFocus);document.removeEventListener("visibilitychange",handleFocus)}},[gt.currentUser]);`;

  if (content.includes(target2)) {
    content = content.replace(target2, replace2);
    modified = true;
    console.log(`[${filePath}] Patched active background poller and instant auto-verifier`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully updated ${filePath}`);
  } else {
    console.log(`No changes made to ${filePath}`);
  }
}

patchFile('dist_backup/assets/index-CUhzlpga-v3.js');
patchFile('dist/assets/index-CUhzlpga-v3.js');
