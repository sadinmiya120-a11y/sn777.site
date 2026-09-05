const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

const oldLogic = `        if (depData && !uid) {
          uid = depData.uid;
        }

        // If UID still not found, try username lookup`;

const newLogic = `        if (depData) {
          if (depData.status === "approved" || depData.credited === true) {
             return res.status(400).json({ success: false, error: "এই ট্রানজ্যাকশনটি ইতিমধ্যেই অ্যাপ্রুভ করা হয়েছে এবং ব্যালেন্স যুক্ত হয়েছে! একই ট্রানজ্যাকশন দুইবার অ্যাপ্রুভ করা সম্ভব নয়।" });
          }
          if (depData.status === "rejected" || depData.cancelled === true) {
             return res.status(400).json({ success: false, error: "এই ট্রানজ্যাকশনটি বাতিল (রিজেক্ট) করা হয়েছে। রিজেক্ট হওয়া ট্রানজ্যাকশন অ্যাপ্রুভ করা সম্ভব নয়।" });
          }
          if (!uid) uid = depData.uid;
        }

        // Also check if any other deposit has the same transactionId and is already approved
        let trxIdToCheck = depData?.transactionId || req.body?.transactionId || "";
        trxIdToCheck = String(trxIdToCheck).trim();
        if (trxIdToCheck && trxIdToCheck !== cleanOrderNo && !trxIdToCheck.startsWith("ORD")) {
           const dupSnap = await db.collection("deposits").where("transactionId", "==", trxIdToCheck).where("status", "==", "approved").limit(1).get().catch(() => ({ empty: true, docs: [] }));
           if (!dupSnap.empty) {
              return res.status(400).json({ success: false, error: "এই ট্রানজ্যাকশন আইডিটি (" + trxIdToCheck + ") অন্য একটি ডিপোজিটে ইতিমধ্যেই অ্যাপ্রুভ করা হয়েছে! একই আইডি বারবার ব্যবহার করা অবৈধ।" });
           }
        }

        // If UID still not found, try username lookup`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync("server.ts", code, "utf8");
console.log("Patched approve-deposit");
