const fs = require("fs");

const files = ["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, "utf8");
    
    // Find the exact boundaries of Kr
    const startStr = 'Kr=async()=>{';
    const pStart = content.indexOf(startStr);
    
    if (pStart === -1) {
        console.log("Could not find start of Kr in " + file);
        continue;
    }
    
    const endStr = 'catch(e){window.location.href=Le}},';
    const pEnd = content.indexOf(endStr, pStart);
    
    if (pEnd === -1) {
        console.log("Could not find end of Kr in " + file);
        continue;
    }
    
    const originalKrBlock = content.substring(pStart, pEnd + endStr.length);
    
    // Construct the new Kr function that opens manual mode
    const newKr = `Kr=async()=>{
if(window._sn777_dep_submitting)return;
if(!gt.currentUser){Fe("অনুগ্রহ করে প্রথমে লগইন করুন।");Je(!0);return;}
const E=parseInt(Is||"0"),L=["usdt","usdterc20"].includes(Be),ee=L?500:200,W=L?5e5:25e3;
if(E<ee){L?(Fe("দুঃখিত! USDT-এর জন্য সর্বনিম্ন ডিপোজিট "+ee.toLocaleString()+" টাকা।"),Je(!0)):be(!0);return;}
if(E>W){Fe("সর্বোচ্চ ডিপোজিট "+W.toLocaleString()+" টাকা। অনুগ্রহ করে সঠিক এমাউন্ট লিখুন।"),Je(!0);return;}
if(!Be){Fe("অনুগ্রহ করে একটি মেথড নির্বাচন করুন।"),Je(!0);return;}
xe(!0);
window._sn777_dep_submitting=!0;
setTimeout(()=>{try{window._sn777_dep_submitting=!1;xe(!1)}catch(e){}},3000);

const Te="ORD"+Date.now();
const _nowIso=new Date().toISOString();
const _uName=(ve&&(ve.username||ve.name))||(gt.currentUser&&(gt.currentUser.displayName||gt.currentUser.email))||"User";
const _uPhone=(ve&&(ve.phone||ve.phoneNumber||ve.accountNumber))||(gt.currentUser&&gt.currentUser.phoneNumber)||"";
const _newDepTx={
  id:Te,order_no:Te,orderId:Te,depositNo:Te,serialNo:Te,
  uid:gt.currentUser.uid,username:_uName,phone:_uPhone,userPhone:_uPhone,accountNumber:_uPhone,
  type:"deposit",amount:E,finalCredit:E,method:Be,status:"pending",
  timestamp:_nowIso,createdAt:_nowIso,
  gateway:"manual",senderNumber:"Manual",transactionId:Te,displayAmount:E,
  description:"ডিপোজিট রিকোয়েস্ট "+E+" টাকা ("+Be.toUpperCase()+")"
};

try{if(navigator.sendBeacon){navigator.sendBeacon("/api/record-transaction",new Blob([JSON.stringify(_newDepTx)],{type:"application/json"}))}}catch(e){}
try{
  localStorage.setItem("sn777_pending_order",JSON.stringify({order_no:Te,amount:Number(E),time:Date.now()}));
  const _arr=JSON.parse(localStorage.getItem("sn777_tx_list_"+gt.currentUser.uid)||"[]");
  _arr.unshift(_newDepTx);
  localStorage.setItem("sn777_tx_list_"+gt.currentUser.uid,JSON.stringify(_arr));
  typeof gs=="function"&&gs(_arr);
}catch(e){}

try{await Promise.race([Ks(We(Ie,"deposits",Te),_newDepTx,{merge:!0}),new Promise(r=>setTimeout(r,600))])}catch(e){console.warn("Firestore deposits write:",e)}
try{await Promise.race([Ks(We(Ie,"transactions",Te),_newDepTx,{merge:!0}),new Promise(r=>setTimeout(r,300))])}catch(e){}
try{await fetch("/api/record-transaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(_newDepTx),keepalive:!0}).catch(()=>{})}catch(e){}
try{await new Promise(r=>setTimeout(r,300))}catch(e){}

try{
  window._sn777_dep_submitting=!1;
  xe(!1);
  qr(Te);
  Ls(!0);
}catch(e){}
},`;

    content = content.replace(originalKrBlock, newKr.replace(/\n/g, ""));
    fs.writeFileSync(file, content);
    console.log("Enabled manual payment gateway in " + file);
  }
}
