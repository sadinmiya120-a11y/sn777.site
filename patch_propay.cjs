const fs = require('fs');

let serverTs = fs.readFileSync('server.ts', 'utf8');

const propayCode = `
// --- ProPay Integration ---
app.post("/api/create-payment", async (req, res) => {
  try {
    const { uid, amount, method } = req.body;
    if (!uid || !amount || !method) return res.status(400).json({ error: "Missing parameters" });

    const host = req.get("host") || "sn777.site";
    const proto = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const origin = \`\${proto}://\${host}\`;

    const redirect_url = \`\${origin}/propay_pay.php?uid=\${encodeURIComponent(uid)}&amount=\${encodeURIComponent(amount)}&method=\${encodeURIComponent(method)}\`;
    res.json({ success: true, redirect_url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.all(["/propay_pay.php", "/api/propay-pay"], async (req, res) => {
  try {
    const { uid, amount, method } = req.query;
    if (!uid || !amount || !method) {
      return res.status(400).send("Missing parameters");
    }

    const host = req.get("host") || "sn777.site";
    const proto = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const origin = \`\${proto}://\${host}\`;

    const api_key = process.env.PROPAY_API_KEY || 'cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc';
    const order_no = 'ORD-' + Date.now();
    const return_url = \`\${origin}/success?order_no=\${order_no}\`;
    const pass_through_callback_url = \`\${origin}/api/propay-callback\`;

    const gateway_url = (method === 'bkash')
      ? 'https://checkout.propay.cyou/pay/Bkash.php'
      : 'https://checkout.propay.cyou/pay/Nagad.php';

    const params = new URLSearchParams({
      api_key,
      uid: String(uid),
      amount: Number(amount).toFixed(2),
      order_no,
      return_url,
      pass_through_key: api_key,
      pass_through_callback_url
    });

    const redirect_url = \`\${gateway_url}?\${params.toString()}\`;
    
    // Attempt to log pending deposit to DB
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const db = adminApp.firestore();
        await db.collection("deposits").doc(order_no).set({
          uid: String(uid),
          amount: Number(amount),
          finalCredit: Number(amount),
          method: String(method),
          status: "pending",
          timestamp: new Date().toISOString(),
          gateway: "propay",
          order_no
        });
      }
    } catch (dbErr) {
      console.error("[PROPAY PAY] DB record error:", dbErr);
    }

    res.redirect(redirect_url);
  } catch (err: any) {
    console.error("[PROPAY PAY] Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post(["/api/propay-callback", "/callback.php"], async (req, res) => {
  try {
    const signature = req.body.signature || req.query.signature;
    const order_no = req.body.order_no || req.query.order_no;
    const amount = req.body.amount || req.query.amount;
    const api_key = process.env.PROPAY_API_KEY || 'cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc';
    
    if (!signature || !order_no || !amount) {
      return res.status(400).send("Missing parameters");
    }

    const crypto = require("crypto");
    const formatted_amount = parseFloat(amount).toString();
    const expected_signature = crypto.createHmac('sha256', api_key).update(String(order_no) + formatted_amount).digest('hex');

    if (signature === expected_signature) {
      // Valid payment!
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const db = adminApp.firestore();
        const depositRef = db.collection("deposits").doc(order_no);
        const depSnap = await depositRef.get();
        
        let uid = "";
        let creditAmount = Number(amount);
        
        if (depSnap.exists) {
            uid = depSnap.data()?.uid || "";
            if (depSnap.data()?.status === "approved" || depSnap.data()?.credited === true) {
                return res.send("Success"); // Already processed
            }
        }
        
        // Use transaction to prevent race conditions
        await db.runTransaction(async (transaction: any) => {
            const doc = await transaction.get(depositRef);
            if (doc.exists && (doc.data()?.status === "approved" || doc.data()?.credited === true)) {
                return;
            }
            if (doc.exists) {
                transaction.update(depositRef, {
                    status: "approved",
                    credited: true,
                    updatedAt: new Date().toISOString()
                });
            } else {
                transaction.set(depositRef, {
                    status: "approved",
                    amount: creditAmount,
                    finalCredit: creditAmount,
                    credited: true,
                    gateway: "propay",
                    order_no,
                    updatedAt: new Date().toISOString()
                });
            }

            if (uid) {
                const userRef = db.collection('users').doc(uid);
                const userDoc = await transaction.get(userRef);
                if (userDoc.exists) {
                    const currentBalance = Number(userDoc.data()?.balance || 0);
                    const newBalance = currentBalance + creditAmount;
                    transaction.update(userRef, { balance: newBalance });
                }
                const userHistoryRef = db.collection('users').doc(uid).collection('history').doc(order_no);
                transaction.set(userHistoryRef, {
                    status: 'approved',
                    type: 'deposit',
                    amount: creditAmount,
                    timestamp: Date.now()
                }, { merge: true });
            }
        });
      }
      res.send("Success");
    } else {
      res.status(403).send("Invalid Signature");
    }
  } catch (err: any) {
    console.error("[PROPAY CALLBACK] Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// -- END PROPAY --
`;

const targetStr = "async function startServer() {";
const splitIdx = serverTs.indexOf(targetStr);

if (splitIdx !== -1) {
  serverTs = serverTs.slice(0, splitIdx) + propayCode + "\n" + serverTs.slice(splitIdx);
  fs.writeFileSync('server.ts', serverTs, 'utf8');
  console.log("Injected ProPay into server.ts");
} else {
  console.error("Could not find startServer");
}
