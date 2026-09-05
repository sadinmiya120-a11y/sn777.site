const fs = require("fs");
const files = ["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");
  
  // Replace the approve block
  const oldApprove = 'if(be==="approve"){try{await fetch("/api/admin/approve-withdrawal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:V.id,doc_id:V.id,withdrawNo:V.withdrawNo||V.serialNo||V.id,uid:V.uid})})}catch(e){}await Tn(je,{status:"approved",updatedAt:new Date().toISOString()}),await Ks(Ge,{uid:V.uid,type:"withdraw",amount:Number(V.amount),status:"approved",timestamp:V.timestamp||new Date().toISOString(),description:"উইথড্র সফলভাবে সম্পন্ন হয়েছে (সাকসেসফুল)",processedAt:new Date().toISOString()},{merge:!0}),alert("উইথড্র অ্যাপ্রুভ হয়েছে! ট্রানজেকশন রেকর্ড এখন সাকসেসফুল দেখাবে।");}';
  const newApprove = 'if(be==="approve"){try{const res=await fetch("/api/admin/approve-withdrawal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:V.id,doc_id:V.id,withdrawNo:V.withdrawNo||V.serialNo||V.id,uid:V.uid})});const data=await res.json();if(data.success){alert("উইথড্র অ্যাপ্রুভ হয়েছে!");}else{alert(data.error||"ব্যর্থ হয়েছে।");}}catch(e){alert("ব্যর্থ হয়েছে।");}}';
  
  // Replace the reject block
  const oldReject = 'else{if(V.status!=="rejected"){const _e=await En(ct);if(_e.exists()){const Y=parseFloat(_e.data().balance||"0"),G=V.amount,Ae=(Y+G).toFixed(2);await Tn(ct,{balance:Ae})}}try{await fetch("/api/admin/reject-withdrawal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:V.id,doc_id:V.id,withdrawNo:V.withdrawNo||V.serialNo||V.id,uid:V.uid,amount:Number(V.amount)})})}catch(e){}await Tn(je,{status:"rejected",updatedAt:new Date().toISOString()}),await Ks(Ge,{uid:V.uid,type:"withdraw",amount:Number(V.amount),status:"rejected",timestamp:V.timestamp||new Date().toISOString(),description:"আপনার উইথড্র রিকোয়েস্টটি বাতিল করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।",processedAt:new Date().toISOString()},{merge:!0}),alert("উইথড্র রিজেক্ট করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।");}';
  const newReject = 'else{try{const res=await fetch("/api/admin/reject-withdrawal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:V.id,doc_id:V.id,withdrawNo:V.withdrawNo||V.serialNo||V.id,uid:V.uid,amount:Number(V.amount)})});const data=await res.json();if(data.success){alert("উইথড্র রিজেক্ট করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।");}else{alert(data.error||"ব্যর্থ হয়েছে।");}}catch(e){alert("ব্যর্থ হয়েছে।");}}';

  code = code.replace(oldApprove, newApprove);
  code = code.replace(oldReject, newReject);
  fs.writeFileSync(file, code, "utf8");
}
console.log("Fixed Pt handler");
