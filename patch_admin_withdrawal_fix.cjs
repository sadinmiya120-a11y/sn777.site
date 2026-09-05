const fs = require("fs");

const files = ["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");
  let modified = false;

  // Enhance Pt (withdrawal approval & rejection in Admin panel) to call API endpoints too
  const oldPtMarker = 'if(be==="approve")await Tn(je,{status:"approved",updatedAt:new Date().toISOString()}),await Ks(Ge,{uid:V.uid,type:"withdraw",amount:Number(V.amount),status:"approved",timestamp:V.timestamp||new Date().toISOString(),description:"উইথড্র সফলভাবে সম্পন্ন হয়েছে (সাকসেসফুল)",processedAt:new Date().toISOString()},{merge:!0}),alert("উইথড্র অ্যাপ্রুভ হয়েছে! ট্রানজেকশন রেকর্ড এখন সাকসেসফুল দেখাবে।");else{if(V.status!=="rejected"){const _e=await En(ct);if(_e.exists()){const Y=parseFloat(_e.data().balance||"0"),G=V.amount,Ae=(Y+G).toFixed(2);await Tn(ct,{balance:Ae})}}await Tn(je,{status:"rejected",updatedAt:new Date().toISOString()}),await Ks(Ge,{uid:V.uid,type:"withdraw",amount:Number(V.amount),status:"rejected",timestamp:V.timestamp||new Date().toISOString(),description:"আপনার উইথড্র রিকোয়েস্টটি বাতিল করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।",processedAt:new Date().toISOString()},{merge:!0}),alert("উইথড্র রিজেক্ট করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।")}';

  if (code.includes(oldPtMarker)) {
    const newPtCode = 'if(be==="approve"){try{await fetch("/api/admin/approve-withdrawal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:V.id,doc_id:V.id,withdrawNo:V.withdrawNo||V.serialNo||V.id,uid:V.uid})})}catch(e){}await Tn(je,{status:"approved",updatedAt:new Date().toISOString()}),await Ks(Ge,{uid:V.uid,type:"withdraw",amount:Number(V.amount),status:"approved",timestamp:V.timestamp||new Date().toISOString(),description:"উইথড্র সফলভাবে সম্পন্ন হয়েছে (সাকসেসফুল)",processedAt:new Date().toISOString()},{merge:!0}),alert("উইথড্র অ্যাপ্রুভ হয়েছে! ট্রানজেকশন রেকর্ড এখন সাকসেসফুল দেখাবে।");}else{if(V.status!=="rejected"){const _e=await En(ct);if(_e.exists()){const Y=parseFloat(_e.data().balance||"0"),G=V.amount,Ae=(Y+G).toFixed(2);await Tn(ct,{balance:Ae})}}try{await fetch("/api/admin/reject-withdrawal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:V.id,doc_id:V.id,withdrawNo:V.withdrawNo||V.serialNo||V.id,uid:V.uid,amount:Number(V.amount)})})}catch(e){}await Tn(je,{status:"rejected",updatedAt:new Date().toISOString()}),await Ks(Ge,{uid:V.uid,type:"withdraw",amount:Number(V.amount),status:"rejected",timestamp:V.timestamp||new Date().toISOString(),description:"আপনার উইথড্র রিকোয়েস্টটি বাতিল করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।",processedAt:new Date().toISOString()},{merge:!0}),alert("উইথড্র রিজেক্ট করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।");}';

    code = code.replace(oldPtMarker, newPtCode);
    modified = true;
    console.log(`[${file}] Enhanced Pt withdrawal handler in Admin Panel`);
  }

  if (modified) {
    fs.writeFileSync(file, code, "utf8");
    console.log(`Successfully updated ${file}`);
  } else {
    console.log(`No changes needed for ${file}`);
  }
}
