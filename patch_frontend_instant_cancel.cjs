const fs = require("fs");
const files = ["dist/assets/index-sn777-v5.js", "dist_backup/assets/index-sn777-v5.js"];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, "utf8");

  // In xe (deposit handler):
  // When approve: update H immediately
  // When reject: update H immediately with cancelled
  // Look for xe definition
  const xeIndex = code.indexOf("const xe=async(V,be,je)=>");
  if (xeIndex > -1) {
    const xeEnd = code.indexOf("finally{F(!1)}", xeIndex);
    if (xeEnd > -1) {
      const oldXe = code.substring(xeIndex, xeEnd + "finally{F(!1)}}".length);
      const newXe = `const xe=async(V,be,je)=>{try{F(!0);const orderNo=V.order_no||V.id;if(be==="delete"){if(!confirm("আপনি কি নিশ্চিতভাবে এই রিকোয়েস্টটি ডিলিট করতে চান?")){F(!1);return}try{await Ab(We(Ie,"deposits",V.id))}catch(e){}H(prev=>(prev||[]).filter(d=>d.id!==V.id&&d.order_no!==orderNo));alert("ডিপোজিট রিকোয়েস্ট ডিলিট করা হয়েছে।");return}if(be==="approve"){let De=je!==void 0?je:Number(V.amount);if(De===0){const gn=prompt("ডিপোজিটের পরিমাণ লিখুন:");gn&&(De=Number(gn))}H(prev=>(prev||[]).map(d=>(d.id===V.id||d.order_no===orderNo)?{...d,status:"approved",credited:true}:d));const res=await fetch("/api/admin/approve-deposit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_no:orderNo,doc_id:V.id,uid:V.uid,amount:De})});const resData=await res.json();if(res.ok&&resData.success){alert(\`ডিপোজিট অ্যাপ্রুভ হয়েছে! \${resData.amount||De} টাকার ডিপোজিটের বিপরীতে ইউজারের ব্যালেন্সে ৳\${resData.finalCredit||resData.amount||De} যোগ করা হয়েছে।\`)}else{alert(resData.error||resData.message||"ডিপোজিট অ্যাপ্রুভ করতে সমস্যা হয়েছে।")}}else if(be==="reject"){H(prev=>(prev||[]).map(d=>(d.id===V.id||d.order_no===orderNo)?{...d,status:"cancelled",cancelled:true}:d));const res=await fetch("/api/admin/reject-deposit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_no:orderNo,doc_id:V.id,uid:V.uid})});const resData=await res.json();if(res.ok&&resData.success){alert("ডিপোজিট রিজেক্ট/বাতিল করা হয়েছে।")}else{alert(resData.error||resData.message||"ডিপোজিট রিজেক্ট করতে সমস্যা হয়েছে।")}}}catch(ct){console.error("Error updating deposit:",ct),alert("ডিপোজিট আপডেট করতে সমস্যা হয়েছে।")}finally{F(!1)}}`;
      code = code.replace(oldXe, newXe);
    }
  }

  // In Pt (withdrawal handler):
  const ptIndex = code.indexOf(",Pt=async(V,be)=>");
  if (ptIndex > -1) {
    const ptEnd = code.indexOf("finally{F(!1)}", ptIndex);
    if (ptEnd > -1) {
      const oldPt = code.substring(ptIndex, ptEnd + "finally{F(!1)}}".length);
      const newPt = `,Pt=async(V,be)=>{try{F(!0);const cleanId=V.withdrawNo||V.serialNo||V.id;if(be==="delete"){if(!confirm("আপনি কি নিশ্চিতভাবে এই রিকোয়েস্টটি ডিলিট করতে চান?")){F(!1);return}try{await Ab(We(Ie,"withdrawals",V.id))}catch(e){}D(prev=>(prev||[]).filter(d=>d.id!==V.id&&d.withdrawNo!==cleanId));alert("উইথড্র রিকোয়েস্ট ডিলিট করা হয়েছে।");return}if(be==="approve"){D(prev=>(prev||[]).map(d=>(d.id===V.id||d.withdrawNo===cleanId)?{...d,status:"approved"}:d));const res=await fetch("/api/admin/approve-withdrawal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:V.id,doc_id:V.id,withdrawNo:cleanId,uid:V.uid})});const data=await res.json();if(data.success){alert("উইথড্র অ্যাপ্রুভ হয়েছে!");}else{alert(data.error||"ব্যর্থ হয়েছে।");}}else if(be==="reject"){D(prev=>(prev||[]).map(d=>(d.id===V.id||d.withdrawNo===cleanId)?{...d,status:"cancelled",cancelled:true}:d));const res=await fetch("/api/admin/reject-withdrawal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:V.id,doc_id:V.id,withdrawNo:cleanId,uid:V.uid,amount:Number(V.amount)})});const data=await res.json();if(data.success){alert("উইথড্র রিজেক্ট করা হয়েছে এবং ব্যালেন্স ফেরত দেওয়া হয়েছে।");}else{alert(data.error||"ব্যর্থ হয়েছে।");}}}catch(e){alert("ব্যর্থ হয়েছে।");}finally{F(!1)}}`;
      code = code.replace(oldPt, newPt);
    }
  }

  // In refreshUserTx: ensure key maps by order_no || depositNo || withdrawNo || id
  code = code.replace(
    /const k=String\(it\.id\|\|it\.order_no\|\|it\.depositNo\|\|it\.withdrawNo\|\|\(it\.timestamp\+"_"\+it\.amount\)\);/g,
    'const k=String(it.order_no||it.depositNo||it.withdrawNo||it.id||(it.timestamp+"_"+it.amount));'
  );

  fs.writeFileSync(file, code, "utf8");
}
console.log("Successfully patched frontend instant cancel/approve in both dist and dist_backup!");
