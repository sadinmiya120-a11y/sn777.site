const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The marker where we will insert GOPay routes
const marker = '// ProPay Callback';
const gopayCode = `
// --- GOPay Integration ---

// GOPay Payment Initiation Route
app.all(["/gopay_pay.php", "/gopay_pay_bkash.php", "/api/gopay_pay", "/api/gopay-pay"], async (req, res) => {
  console.log(\`[GOPAY PAY] Request received:\`, {
    method: req.method,
    query: req.query,
    body: req.body
  });

  try {
    const uid = String(req.query.uid || req.body.uid || "");
    const amountStr = String(req.query.amount || req.body.amount || "");
    const methodStr = String(req.query.method || req.body.method || "bkash").toLowerCase();
    let order_no = String(req.query.order_no || req.body.order_no || "");

    const amount = Number(amountStr);
    if (!uid || isNaN(amount) || amount <= 0) {
      console.error("[GOPAY PAY] Missing or invalid UID/Amount:", { uid, amount });
      return res.status(400).send("<h3>Missing or invalid UID or Amount.</h3>");
    }

    const isBkash = methodStr.includes("bkash");
    const payName = isBkash ? "bKash" : "Nagad";
    
    // Generate Serial if not provided
    const now = new Date();
    const createdate = now.toISOString().replace(/T/, ' ').replace(/\\..+/, '');
    const serial = order_no || \`ORD\${now.getTime()}\${Math.floor(Math.random() * 1000)}\`;

    const origin = req.get("origin") || req.protocol + "://" + req.get("host");
    const jumpURL = \`\${origin}/?m=1&order_no=\${serial}\`;
    const notifyURL = \`\${origin}/pay1/gopay_notify.php\`;

    let finalCredit = amount;

    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const db = adminApp.firestore();
        const depositRef = db.collection("deposits").doc(serial);
        const record = {
          id: serial,
          order_no: serial,
          orderId: serial,
          depositNo: serial,
          serialNo: serial,
          uid,
          amount,
          finalCredit,
          method: isBkash ? "bkash" : "nagad",
          gateway: "gopay",
          status: "pending",
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          displayAmount: amount,
          description: \`ডিপোজিট রিকোয়েস্ট \${amount} টাকা (\${payName} GOPay)\`
        };
        saveLocalTransaction(record);
        await Promise.all([
          depositRef.set(record, { merge: true }),
          db.collection("transactions").doc(serial).set(record, { merge: true }),
          db.collection("users").doc(uid).collection("history").doc(serial).set(record, { merge: true })
        ]);
        console.log(\`[GOPAY PAY] Deposit pending record created in Firestore & Local with Order ID: \${serial}\`);
      }
    } catch (dbErr) {
      console.warn("[GOPAY PAY] DB record error:", dbErr);
    }

    const app_id = "GP_97386700";
    const secretKey = "87a89555480aae027ad84daf666602d7";
    const apiUrl = "https://mch.go-pay.cyou/pay.php";

    const candidatePayTypes = isBkash
      ? ["2202", "2200", "101", "201", "801", "901", "1001", "1101", "1201", "2001", "2101", "2301", "3001"]
      : ["2201", "102", "202", "802", "902", "1002", "1102", "1202", "2002", "2102", "2302", "3002"];
    let cashierUrl = "";
    let lastErrorMsg = "FAIL";
    let finalSuccessfulSerial = serial;

    for (let i = 0; i < candidatePayTypes.length; i++) {
      const pType = candidatePayTypes[i];
      const attemptSerial = i === 0 ? serial : \`\${serial}R\${i}\`;

      const postData: Record<string, string> = {
        version: "1.0",
        app_id,
        notify_url: notifyURL,
        page_url: jumpURL,
        mch_order_no: attemptSerial,
        pay_type: pType,
        trade_amount: String(amount),
        order_date: createdate,
        goods_name: payName,
        mch_return_msg: "OK"
      };

      const sortedKeys = Object.keys(postData).sort();
      let signStr = "";
      for (const k of sortedKeys) {
        const v = postData[k];
        if (v !== "" && v !== null && v !== undefined) {
          signStr += \`\${k}=\${v}&\`;
        }
      }
      signStr += \`key=\${secretKey}\`;
      postData.sign = crypto.createHash("md5").update(signStr).digest("hex");
      postData.sign_type = "MD5";

      try {
        console.log(\`[GOPAY PAY] Attempting gateway with pay_type=\${pType}, goods_name=\${payName}, order_no=\${attemptSerial}\`);
        const gopayRes = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(postData).toString()
        });

        const resJson: any = await gopayRes.json();
        console.log(\`[GOPAY PAY] Gateway response for pay_type=\${pType}:\`, resJson);

        if (resJson && resJson.respCode === "SUCCESS" && resJson.payInfo) {
          cashierUrl = resJson.payInfo;
          finalSuccessfulSerial = attemptSerial;
          break;
        } else if (resJson?.tradeMsg) {
          lastErrorMsg = resJson.tradeMsg;
        }
      } catch (postErr) {
        console.warn(\`[GOPAY PAY] Gateway attempt failed for \${pType}:\`, postErr);
      }
    }

    if (cashierUrl && finalSuccessfulSerial !== serial) {
      try {
        const adminApp = getFirebaseAdmin();
        if (adminApp) {
          const db = adminApp.firestore();
          const altRecord = {
            id: finalSuccessfulSerial,
            order_no: finalSuccessfulSerial,
            orderId: finalSuccessfulSerial,
            depositNo: finalSuccessfulSerial,
            serialNo: finalSuccessfulSerial,
            originalSerial: serial,
            uid,
            amount,
            finalCredit,
            method: isBkash ? "bkash" : "nagad",
            gateway: "gopay",
            status: "pending",
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            displayAmount: amount,
            description: \`ডিপোজিট রিকোয়েস্ট \${amount} টাকা (\${payName} GOPay)\`
          };
          saveLocalTransaction(altRecord);
          await Promise.all([
            db.collection("deposits").doc(finalSuccessfulSerial).set(altRecord, { merge: true }),
            db.collection("transactions").doc(finalSuccessfulSerial).set(altRecord, { merge: true }),
            db.collection("users").doc(uid).collection("history").doc(finalSuccessfulSerial).set(altRecord, { merge: true })
          ]);
        }
      } catch (e) {
        console.warn("[GOPAY PAY] Alt record save warning:", e);
      }
    }

    if (cashierUrl) {
      if (req.headers.accept?.includes("application/json") || req.xhr) {
        return res.json({ success: true, redirect_url: cashierUrl, payInfo: cashierUrl });
      }
      return res.redirect(cashierUrl);
    } else {
      return res.status(400).send(\`<h3>gopay API ERROR: \${lastErrorMsg}</h3>\`);
    }
  } catch (err: any) {
    console.error("[GOPAY PAY Error]:", err);
    return res.status(500).send(\`<h3>Server Error: \${err.message}</h3>\`);
  }
});

// GOPay Callback / Notify Route
app.all(["/pay1/gopay_notify.php", "/gopay_notify.php", "/api/gopay-notify"], async (req, res) => {
  console.log(\`[GOPAY NOTIFY] Received callback:\`, {
    method: req.method,
    query: req.query,
    body: req.body
  });

  try {
    const data = req.method === "POST" ? req.body : req.query;
    if (!data || Object.keys(data).length === 0) {
      console.error("[GOPAY NOTIFY] ERROR: Empty POST/GET data received.");
      return res.status(400).send("FAIL");
    }

    const {
      tradeResult,
      mch_order_no,
      trade_amount,
      sign
    } = data;

    const secretKey = "87a89555480aae027ad84daf666602d7";

    const sortedKeys = Object.keys(data).filter(k => k !== 'sign' && k !== 'sign_type').sort();
    let signStr = "";
    for (const k of sortedKeys) {
      const v = data[k];
      if (v !== "" && v !== null && v !== undefined) {
        signStr += \`\${k}=\${v}&\`;
      }
    }
    signStr += \`key=\${secretKey}\`;
    
    const localSign = crypto.createHash("md5").update(signStr).digest("hex");
    const gateSign = sign ? String(sign).toLowerCase() : "";

    if (localSign !== gateSign) {
      console.error(\`[GOPAY NOTIFY] SECURITY REJECTION: SIGN MISMATCH | Local: \${localSign} | Gateway: \${gateSign}\`);
      return res.send("SUCCESS"); 
    }

    console.log("[GOPAY NOTIFY] SIGNATURE VERIFIED SUCCESSFULLY");

    const amount = Number(trade_amount);
    if (!mch_order_no || isNaN(amount)) {
      console.error("[GOPAY NOTIFY] ERROR: Invalid order_no or trade_amount:", { mch_order_no, trade_amount });
      return res.send("SUCCESS");
    }

    if (String(tradeResult) === "1") {
      let depositRecord: any = null;
      let uid = "";
      
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const db = adminApp.firestore();
        
        try {
          const docRef = db.collection("deposits").doc(mch_order_no);
          const docSnap = await docRef.get();
          if (docSnap.exists) {
            depositRecord = docSnap.data();
            uid = depositRecord.uid;
          } else {
             // maybe check originalSerial if needed
          }
        } catch (dbErr) {
          console.warn("[GOPAY NOTIFY] Firestore read warning:", dbErr);
        }

        if (!depositRecord || !uid) {
          console.error(\`[GOPAY NOTIFY] SECURITY REJECTION: Order No \${mch_order_no} not found in Database.\`);
          return res.send("SUCCESS");
        }

        const currentStatus = depositRecord.status;
        if (currentStatus === "approved" || currentStatus === "success" || currentStatus === "completed") {
          console.log(\`[GOPAY NOTIFY] IDEMPOTENCY LOCK: Order No \${mch_order_no} is already processed & credited.\`);
          return res.send("SUCCESS");
        }

        const creditAmount = depositRecord.finalCredit || depositRecord.amount || amount;
        
        try {
          await db.runTransaction(async (t) => {
            const txDocRef = db.collection("deposits").doc(mch_order_no);
            const txSnap = await t.get(txDocRef);
            if (!txSnap.exists) throw new Error("Deposit disappeared during tx");
            
            const txData = txSnap.data();
            if (txData?.status === "approved" || txData?.status === "success") {
                console.log(\`[GOPAY NOTIFY] Transaction aborted: Order \${mch_order_no} already credited inside lock.\`);
                return;
            }

            const userRef = db.collection("users").doc(uid);
            const userSnap = await t.get(userRef);
            let currentBalance = 0;
            let totalDeposited = 0;
            if (userSnap.exists) {
               const uD = userSnap.data();
               currentBalance = Number(uD?.balance || 0);
               totalDeposited = Number(uD?.totalDeposited || 0);
            }
            
            t.update(userRef, {
                balance: currentBalance + creditAmount,
                totalDeposited: totalDeposited + creditAmount
            });
            
            t.update(txDocRef, {
                status: "approved",
                approvedAt: new Date().toISOString()
            });
            t.update(db.collection("transactions").doc(mch_order_no), {
                status: "approved",
                approvedAt: new Date().toISOString()
            });
            t.update(db.collection("users").doc(uid).collection("history").doc(mch_order_no), {
                status: "approved",
                approvedAt: new Date().toISOString()
            });
          });
        } catch (trxErr) {
          console.warn("[GOPAY NOTIFY] Firestore transaction error:", trxErr);
        }
        
        // Save locally just in case
        depositRecord.status = "approved";
        saveLocalTransaction(depositRecord);
        
        console.log(\`[GOPAY NOTIFY] SUCCESS: Verified balance credited for UID: \${uid} | Amount: \${creditAmount} | Order: \${mch_order_no}\`);
      }
    } else {
      console.log(\`[GOPAY NOTIFY] PAYMENT CANCELLED/FAILED: Gateway reported tradeResult=\${tradeResult} for Order: \${mch_order_no}\`);
    }

    return res.send("SUCCESS");

  } catch (err) {
    console.error("[GOPAY NOTIFY ERROR]:", err);
    return res.send("SUCCESS");
  }
});
`;

if (!code.includes('app.all(["/gopay_pay.php"')) {
  code = code.replace(marker, gopayCode + '\n' + marker);
  fs.writeFileSync('server.ts', code, 'utf8');
  console.log("Added GOPay routes back to server.ts");
} else {
  console.log("GOPay routes already exist");
}
