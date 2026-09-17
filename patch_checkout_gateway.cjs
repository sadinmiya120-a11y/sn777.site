const fs = require("fs");
const acorn = require("acorn");
const esbuild = require("esbuild");

const files = [
  "dist/assets/index-sn777-v5.js",
  "dist_backup/assets/index-sn777-v5.js"
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  let code = fs.readFileSync(file, "utf8");

  // 1. Update preset amounts array to include 100
  const oldYa = 'ya=[{amount:"200",displayOrig:"200",total:"200",bonusPercent:""}';
  const newYa = 'ya=[{amount:"100",displayOrig:"100",total:"100",bonusPercent:""},{amount:"200",displayOrig:"200",total:"200",bonusPercent:""}';
  if (code.includes(oldYa)) {
    code = code.replace(oldYa, newYa);
  }

  // 2. Update limit label
  code = code.replace(/সীমা: ৳২০০ - ৳২৫,০০০/g, "সীমা: ৳১০০ - ৳২৫,০০০");

  // 3. Update ProPay texts to Checkout / Nagorik Gateway
  code = code.replace(/"ProPay"/g, '"NagorikPay"');
  code = code.replace(/"\(অটো গেটওয়ে\)"/g, '"(স্বয়ংক্রিয় গেটওয়ে)"');

  // 4. Update the warning text safely
  const oldWarnPart = " কোনো দায়ভার নিবে না। যারা ৫০০ টাকার নিচে ডিপোজিট করতে চাচ্ছেন তাদের অনেক সময় সমস্যা হতে পারে কারণ ProPay গেটের সমস্যার কারণে অনেক সময় ৫০০ টাকা নিচে এমাউন্ট দিলে মেনটেনিস লেখা আছে যদি এটা লেখা আসে তাহলে ৫০০ টাকা বা ৫০০ টাকার উপরে ডিপোজিট করার চেষ্টা করবেন দেয়ার সমস্যা হবে না";
  const newWarnPart = " কোনো দায়ভার নিবে না। পেমেন্ট সম্পন্ন হলে আপনার একাউন্টে স্বয়ংক্রিয়ভাবে ব্যালেন্স যুক্ত হয়ে যাবে।";
  if (code.includes(oldWarnPart)) {
    code = code.replaceAll(oldWarnPart, newWarnPart);
  }

  // 5. Update Kr function (Deposit submit handler)
  const startStr = "Kr=async()=>{";
  const pStart = code.indexOf(startStr);
  if (pStart !== -1) {
    const endMarker = ",[zs,lo]=";
    const pEnd = code.indexOf(endMarker, pStart);
    if (pEnd !== -1) {
      const newKr = `Kr=async()=>{if(window._sn777_dep_submitting)return;if(!gt.currentUser){Fe("অনুগ্রহ করে প্রথমে লগইন করুন।");Je(!0);return;}const E=parseInt(Is||"0"),L=["usdt","usdterc20"].includes(Be),ee=L?500:100,W=L?5e5:25e3;if(E<ee){L?(Fe("দুঃখিত! USDT-এর জন্য সর্বনিম্ন ডিপোজিট "+ee.toLocaleString()+" টাকা।"),Je(!0)):(Fe("সর্বনিম্ন ডিপোজিট "+ee+" টাকা।"),Je(!0));return;}if(E>W){Fe("সর্বোচ্চ ডিপোজিট "+W.toLocaleString()+" টাকা। অনুগ্রহ করে সঠিক এমাউন্ট লিখুন।"),Je(!0);return;}if(!Be){Fe("অনুগ্রহ করে একটি পেমেন্ট মেথড (bKash অথবা Nagad) নির্বাচন করুন।"),Je(!0);return;}xe(!0);window._sn777_dep_submitting=!0;setTimeout(()=>{try{window._sn777_dep_submitting=!1;xe(!1)}catch(e){}},6000);const Te="ORD"+Date.now();const _nowIso=new Date().toISOString();const _uName=(ve&&(ve.username||ve.name))||(gt.currentUser&&(gt.currentUser.displayName||gt.currentUser.email))||"Customer";const _uPhone=(ve&&(ve.phone||ve.phoneNumber||ve.accountNumber))||(gt.currentUser&&gt.currentUser.phoneNumber)||"";const _uEmail=(gt.currentUser&&gt.currentUser.email)||(_uName.toLowerCase().replace(/[^a-z0-9]/g,"")+"@gmail.com");const _newDepTx={id:Te,order_no:Te,orderId:Te,depositNo:Te,serialNo:Te,uid:gt.currentUser.uid,username:_uName,phone:_uPhone,userPhone:_uPhone,accountNumber:_uPhone,type:"deposit",amount:E,finalCredit:E,method:Be,status:"pending",timestamp:_nowIso,createdAt:_nowIso,gateway:"sn777_checkout",senderNumber:Be.toUpperCase()+" Gateway",transactionId:Te,displayAmount:E,description:"ডিপোজিট "+E+" টাকা ("+Be.toUpperCase()+")"};try{if(navigator.sendBeacon){navigator.sendBeacon("/api/record-transaction",new Blob([JSON.stringify(_newDepTx)],{type:"application/json"}))}}catch(e){}try{localStorage.setItem("sn777_pending_order",JSON.stringify({order_no:Te,amount:Number(E),time:Date.now()}));const _arr=JSON.parse(localStorage.getItem("sn777_tx_list_"+gt.currentUser.uid)||"[]");_arr.unshift(_newDepTx);localStorage.setItem("sn777_tx_list_"+gt.currentUser.uid,JSON.stringify(_arr));typeof gs=="function"&&gs(_arr);}catch(e){}try{await Promise.race([Ks(We(Ie,"deposits",Te),_newDepTx,{merge:!0}),new Promise(r=>setTimeout(r,500))])}catch(e){console.warn("Firestore deposits write:",e)}try{await Promise.race([Ks(We(Ie,"transactions",Te),_newDepTx,{merge:!0}),new Promise(r=>setTimeout(r,300))])}catch(e){}try{await fetch("/api/record-transaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(_newDepTx),keepalive:!0}).catch(()=>{})}catch(e){}let _payUrl="https://checkout.sn777.site/api/payment/create/api/execute/"+encodeURIComponent(Te)+"?method="+encodeURIComponent(Be)+"&acc_tp=agent&amount="+encodeURIComponent(E);try{const _res=await fetch("/api/create-payment",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({uid:gt.currentUser.uid,amount:E,method:Be,order_no:Te,username:_uName,phone:_uPhone,email:_uEmail})}).then(r=>r.json()).catch(()=>null);if(_res&&(_res.payment_url||_res.url||_res.redirect_url)){_payUrl=_res.payment_url||_res.url||_res.redirect_url;}}catch(err){console.error("Create payment error:",err);}try{window._sn777_dep_submitting=!1;xe(!1);if(window.top&&window.top!==window)window.top.location.href=_payUrl;else window.location.href=_payUrl;}catch(e){window.location.href=_payUrl;}}`;
      code = code.substring(0, pStart) + newKr.replace(/\n/g, "") + code.substring(pEnd);
    }
  }

  // Validate syntax
  try {
    acorn.parse(code, { ecmaVersion: 2020 });
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(file, code, "utf8");
    console.log("Successfully patched checkout gateway & deposit page in " + file);
  } catch (err) {
    console.error("Syntax validation error in " + file + ":", err.message);
    process.exit(1);
  }
}
