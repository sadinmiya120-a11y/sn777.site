import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import admin from "firebase-admin";
import crypto from "crypto";
import cron from "node-cron";
import multer from "multer";
import fs from "fs";

const upload = multer();
const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    try {
      if (serviceAccountKey) {
        const serviceAccount = JSON.parse(serviceAccountKey);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized successfully with service account.");
      } else {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID || "xbet-mobcash"
        });
        console.log("Firebase Admin initialized with application default credentials.");
      }
    } catch (e: any) {
      console.error("Firebase Admin init error, trying fallback:", e);
      try {
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || "xbet-mobcash"
        });
        console.log("Firebase Admin initialized with projectId fallback.");
      } catch (e2: any) {
        console.error("Firebase Admin fallback init error:", e2);
        throw e;
      }
    }
  }
  return admin;
}

// Auth Proxy
app.all("/api/auth-proxy/:host/*", async (req, res) => {
  try {
    const { host } = req.params;
    const urlParts = req.url.split(`/api/auth-proxy/${host}/`);
    const pathAndQuery = urlParts[1] || "";
    const targetUrl = `https://${host}/${pathAndQuery}`;
    console.log(`[Auth Proxy] Forwarding request to: ${targetUrl}`);
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    for (const [key, value] of Object.entries(req.headers)) {
      if (["host", "connection", "content-length", "cookie", "origin", "referer", "accept-encoding"].includes(key.toLowerCase())) {
        continue;
      }
      if (typeof value === "string") {
        headers[key] = value;
      }
    }
    
    const hasBody = !["GET", "HEAD"].includes(req.method) && req.body && Object.keys(req.body).length > 0;
    const contentType = (headers["content-type"] || headers["Content-Type"] || "").toLowerCase();
    
    let bodyToSend: any = undefined;
    if (hasBody) {
      if (contentType.includes("application/x-www-form-urlencoded")) {
        bodyToSend = new URLSearchParams(req.body).toString();
      } else {
        bodyToSend = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      }
    }
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: bodyToSend
    });
    
    const bodyText = await response.text();
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!["content-encoding", "transfer-encoding", "connection", "content-security-policy", "access-control-allow-origin"].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    res.send(bodyText);
  } catch (err: any) {
    console.error("[Auth Proxy Error]:", err);
    res.status(500).json({ error: "Auth Proxy failed", message: err.message });
  }
});

app.get("/", (req, res, next) => {
  if (req.query.m === '1' && req.query.order_no) {
    return res.redirect(`/success?order_no=${req.query.order_no}`);
  }
  next();
});

app.post("/api/reset-password", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const { phone, newPassword, username } = req.body;
    if (!phone || !newPassword || !username) {
      return res.status(400).json({ error: "Missing phone, newPassword, or username" });
    }
    
    const formattedPhone = `+880 ${phone}`;
    const db = adminApp.firestore();
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("phone", "==", formattedPhone).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ error: "User not found with this phone number." });
    }
    
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    console.log(`Found user in Firestore with ID: ${userDoc.id}, phone: ${userData.phone}, username: ${userData.username}`);
    
    if (userData.username.toLowerCase() !== username.toLowerCase()) {
      console.log(`Username mismatch: Expected ${username}, Found ${userData.username}`);
      return res.status(400).json({ error: "ইউজারনেম এবং ফোন নাম্বার মিলছে না!" });
    }
    
    const userId = userDoc.id;
    console.log(`Attempting to update password for user ID: ${userId}`);
    
    let userRec;
    try {
      userRec = await adminApp.auth().getUser(userId);
      console.log(`User found in Auth: ${userId}, Email: ${userRec.email}`);
      await adminApp.auth().updateUser(userId, {
        password: newPassword
      });
      await adminApp.auth().revokeRefreshTokens(userId);
      await usersRef.doc(userId).update({
        password: newPassword
      });
      console.log(`Password updated in both Auth and Firestore for user ID: ${userId}`);
    } catch (e: any) {
      console.error(`Error updating user: ${e.message}`);
      throw e;
    }
    
    res.json({ success: true, message: "Password updated successfully!", email: userRec?.email });
  } catch (err: any) {
    console.error("Password reset error:", err);
    if (err.message?.includes("FIREBASE_SERVICE_ACCOUNT_KEY")) {
      return res.status(500).json({ error: "সিস্টেমটি সক্রিয় করতে অনুগ্রহ করে সেটিংস থেকে Service Account Key টি যুক্ত করুন।" });
    }
    res.status(500).json({ error: "পাসওয়ার্ড পরিবর্তন করতে সমস্যা হচ্ছে। পরে আবার চেষ্টা করুন।" });
  }
});

// Update Username
app.post("/api/update-username", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const { uid, newUsername } = req.body;
    if (!uid || !newUsername) {
      return res.status(400).json({ error: "Missing uid or newUsername" });
    }
    const newEmail = `${newUsername.toLowerCase()}@sn777.com`;
    console.log(`Attempting to update Auth email for user: ${uid} to ${newEmail}`);
    await adminApp.auth().updateUser(uid, {
      email: newEmail
    });
    res.json({ success: true, message: "Username (Auth email) updated successfully!" });
  } catch (err: any) {
    console.error("Username update error:", err);
    res.status(500).json({ error: "ইউজারনেম আপডেট করতে ব্যর্থ হয়েছে: " + err.message });
  }
});

// Helper to find a deposit document, checking both with and without hyphen in ID
async function findDepositDoc(db: admin.firestore.Firestore, order_no: string) {
  const cleanOrderNo = String(order_no).trim();
  
  // 1. Exact match first
  let depositRef = db.collection("deposits").doc(cleanOrderNo);
  let depositDoc = await depositRef.get();
  if (depositDoc.exists) {
    return { depositRef, depositDoc, matchedId: cleanOrderNo };
  }

  // 2. Try removing hyphen if present (e.g. "ORD-123" -> "ORD123")
  if (cleanOrderNo.includes("-")) {
    const strippedId = cleanOrderNo.replace(/-/g, "");
    depositRef = db.collection("deposits").doc(strippedId);
    depositDoc = await depositRef.get();
    if (depositDoc.exists) {
      return { depositRef, depositDoc, matchedId: strippedId };
    }
  } 
  // 3. Try adding hyphen if missing (e.g. "ORD123" -> "ORD-123")
  else if (cleanOrderNo.startsWith("ORD")) {
    const hyphenatedId = "ORD-" + cleanOrderNo.substring(3);
    depositRef = db.collection("deposits").doc(hyphenatedId);
    depositDoc = await depositRef.get();
    if (depositDoc.exists) {
      return { depositRef, depositDoc, matchedId: hyphenatedId };
    }
  }

  // Fallback to exact doc ref even if it doesn't exist
  return { depositRef: db.collection("deposits").doc(cleanOrderNo), depositDoc: null, matchedId: cleanOrderNo };
}

// Create Payment
app.post("/api/create-payment", async (req, res) => {
  try {
    const { uid, amount, method } = req.body;
    if (!uid || !amount || !method) return res.status(400).json({ error: "Missing parameters" });
    // Generate order_no without hyphen to prevent signature & callback issues with ProPay
    const order_no = "ORD" + Date.now();
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();
    await db.collection("deposits").doc(order_no).set({
      uid,
      amount: parseFloat(amount),
      method,
      status: "pending",
      createdAt: new Date().toISOString(),
      order_no
    });
    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");
    // Automatically use the current host domain to ensure callbacks work perfectly on any domain (Cloud Run or Custom)
    const appUrl = process.env.APP_URL || (host ? `${proto}://${host}` : "https://sn777.site");
    const gateway_url = method === "bkash" ? "https://checkout.propay.cyou/pay/Bkash.php" : "https://checkout.propay.cyou/pay/Nagad.php";
    const params = new URLSearchParams({
      api_key: process.env.PROPAY_API_KEY || "cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc",
      uid,
      amount: amount.toString(),
      order_no,
      return_url: `${appUrl}/success`,
      success_url: `${appUrl}/success`,
      cancel_url: `${appUrl}/fail`,
      pass_through_key: process.env.PROPAY_API_KEY || "cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc",
      pass_through_callback_url: `${appUrl}/api/propay-callback`
    });
    res.json({ redirect_url: `${gateway_url}?${params.toString()}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Verify Payment status
app.post("/api/verify-payment", async (req, res) => {
  try {
    const { order_no, transactionId } = req.body;
    if (!order_no) {
      return res.status(400).json({ error: "Missing order_no" });
    }
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();
    
    // Check if current order_no is approved or successful (handling hyphen robustly)
    const { depositDoc } = await findDepositDoc(db, order_no);
    
    let isApproved = false;
    let depositData = null;
    
    if (depositDoc && depositDoc.exists) {
      depositData = depositDoc.data();
      if (depositData?.status === "approved" || depositData?.status === "success") {
        isApproved = true;
      }
    }
    
    // If not approved, check if there is any other deposit with the given transactionId (externalTrxId or transactionId) that is approved/successful
    if (!isApproved && transactionId) {
      const trimmedTxId = String(transactionId).trim();
      const depositsRef = db.collection("deposits");
      
      // Query transactionId
      const q1 = await depositsRef
        .where("transactionId", "==", trimmedTxId)
        .where("status", "in", ["approved", "success"])
        .limit(1)
        .get();
        
      if (!q1.empty) {
        isApproved = true;
        depositData = q1.docs[0].data();
      } else {
        // Query externalTrxId
        const q2 = await depositsRef
          .where("externalTrxId", "==", trimmedTxId)
          .where("status", "in", ["approved", "success"])
          .limit(1)
          .get();
          
        if (!q2.empty) {
          isApproved = true;
          depositData = q2.docs[0].data();
        }
      }
    }
    
    res.json({
      success: isApproved,
      status: depositData?.status || "pending",
      amount: depositData?.amount || 0,
      finalCredit: depositData?.finalCredit || 0
    });
  } catch (err: any) {
    console.error("Payment verification endpoint error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Admin Approve Deposit Endpoint
app.post("/api/admin/approve-deposit", async (req, res) => {
  try {
    const { order_no, amount: reqAmount } = req.body;
    if (!order_no) {
      return res.status(400).json({ error: "Missing order_no" });
    }
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();

    const { depositRef, depositDoc, matchedId } = await findDepositDoc(db, order_no);
    const finalOrderNo = matchedId || order_no;

    if (!depositDoc || !depositDoc.exists) {
      return res.status(404).json({ error: "ডিপোজিট রিকোয়েস্ট পাওয়া যায়নি।" });
    }

    const depositData = depositDoc.data();
    const uid = depositData?.uid;
    if (!uid) {
      return res.status(400).json({ error: "ইউজার আইডি পাওয়া যায়নি।" });
    }

    if (depositData?.status === "approved" || depositData?.status === "success") {
      return res.json({ success: true, message: "এই ডিপোজিট ইতিমধ্যেই অ্যাপ্রুভ করা হয়েছে।" });
    }

    let depositAmount = Number(reqAmount) || Number(depositData?.amount) || 0;
    const finalCreditMap: Record<number, number> = {
      550: 1100,
      1000: 2000,
      1550: 3100,
      3000: 6000,
      5000: 10000,
      10000: 20000,
      20000: 40000,
      30000: 60000,
      50000: 100000
    };

    let creditAmount = depositData?.finalCredit && Number(depositData.finalCredit) > depositAmount
      ? Number(depositData.finalCredit)
      : (depositAmount === 550 ? 1100 : (finalCreditMap[depositAmount] || depositAmount));

    const userRef = db.collection("users").doc(uid);
    const txRef = db.collection("transactions").doc(finalOrderNo);
    const userHistoryRef = db.collection("users").doc(uid).collection("history").doc(finalOrderNo);

    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error("User document not found");
      }
      const uData = userDoc.data() || {};
      const currBal = parseFloat(uData.balance || "0");
      const newBal = (currBal + creditAmount).toFixed(2);
      const newTotalDep = (uData.totalDeposited || 0) + depositAmount;
      const newAppCount = (uData.approvedDepositsCount || 0) + 1;
      const isBonus = creditAmount > depositAmount;

      transaction.set(userRef, {
        balance: newBal,
        totalDeposited: newTotalDep,
        approvedDepositsCount: newAppCount,
        adminApproved: newTotalDep >= 550 ? true : uData.adminApproved || false,
        withdrawEnabled: newAppCount >= 2 ? true : uData.withdrawEnabled || false,
        giftCardRedeemed: isBonus || depositAmount === 550 ? true : uData.giftCardRedeemed || false,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      transaction.set(depositRef, {
        status: "approved",
        amount: depositAmount,
        finalCredit: creditAmount,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      transaction.set(txRef, {
        uid,
        type: "deposit",
        amount: depositAmount,
        finalCredit: creditAmount,
        status: "approved",
        description: isBonus ? `৳${depositAmount} ডিপোজিট সফলভাবে সম্পন্ন হয়েছে (বোনাস সহ মোট ৳${creditAmount})।` : `৳${depositAmount} ডিপোজিট সফলভাবে সম্পন্ন হয়েছে।`,
        processedAt: new Date().toISOString()
      }, { merge: true });

      transaction.set(userHistoryRef, {
        status: "approved",
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });

    res.json({
      success: true,
      message: `ডিপোজিট অ্যাপ্রুভ হয়েছে! ৳${depositAmount} টাকার ডিপোজিটের বিপরীতে ইউজারের ব্যালেন্সে ৳${creditAmount} যোগ করা হয়েছে।`
    });
  } catch (err: any) {
    console.error("[Admin Approve Deposit Error]:", err);
    res.status(500).json({ error: err.message || "ডিপোজিট অ্যাপ্রুভ করতে ব্যর্থ হয়েছে।" });
  }
});

// Admin Reject Deposit Endpoint
app.post("/api/admin/reject-deposit", async (req, res) => {
  try {
    const { order_no } = req.body;
    if (!order_no) {
      return res.status(400).json({ error: "Missing order_no" });
    }
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();

    const { depositRef, depositDoc, matchedId } = await findDepositDoc(db, order_no);
    const finalOrderNo = matchedId || order_no;

    if (!depositDoc || !depositDoc.exists) {
      return res.status(404).json({ error: "ডিপোজিট রিকোয়েস্ট পাওয়া যায়নি।" });
    }

    const depositData = depositDoc.data();
    const uid = depositData?.uid;

    await depositRef.set({ status: "rejected", updatedAt: new Date().toISOString() }, { merge: true });
    await db.collection("transactions").doc(finalOrderNo).set({ status: "rejected", processedAt: new Date().toISOString() }, { merge: true });
    if (uid) {
      await db.collection("users").doc(uid).collection("history").doc(finalOrderNo).set({ status: "rejected", updatedAt: new Date().toISOString() }, { merge: true });
    }

    res.json({ success: true, message: "ডিপোজিট রিজেক্ট করা হয়েছে।" });
  } catch (err: any) {
    console.error("[Admin Reject Deposit Error]:", err);
    res.status(500).json({ error: err.message || "ডিপোজিট রিজেক্ট করতে ব্যর্থ হয়েছে।" });
  }
});

// ProPay Callback Endpoint (Supports both GET and POST, body and query params)
app.all("/api/propay-callback", upload.none(), async (req, res) => {
  try {
    const payload = { ...(req.body || {}), ...(req.query || {}) };
    let order_no = payload.order_no || payload.order_id || payload.ref || payload.reference || payload.cust_order_id || payload.customer_order_id;
    const amount = payload.amount || payload.total_amount;
    const status = payload.status || payload.txn_status || payload.state;
    const signature = payload.signature || payload.hash || payload.sign || payload.secure_hash;

    console.log('[ProPay Callback] Received payload:', payload);
    const api_key = process.env.PROPAY_API_KEY || 'cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc';
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();

    // Log the callback to Firestore for debugging
    try {
       await db.collection("propay_logs").add({
          payload,
          timestamp: new Date().toISOString(),
          headers: req.headers,
          method: req.method
       });
    } catch(e) {}

    if (!order_no || !status) {
      console.error('[ProPay] Missing required parameters:', { order_no, status });
      return res.status(400).send("Missing parameters");
    }

    order_no = String(order_no).trim();

    // ProPay Signature Verification
    // Formula: hash_hmac('sha256', order_no + float(amount), api_key)
    if (signature) {
      const formattedAmount = parseFloat(amount).toString();
      const dataToHash = order_no + formattedAmount;
      const expectedSignature = crypto.createHmac('sha256', api_key).update(dataToHash).digest('hex');

      if (signature !== expectedSignature) {
        console.warn(`[ProPay Callback] Invalid signature. Expected: ${expectedSignature}, Received: ${signature}`);
        return res.status(403).send("Invalid Signature");
      }
    } else {
      // If signature is required by ProPay, we should ideally reject requests without it.
      // But for backward compatibility or testing, we might log a warning.
      console.warn(`[ProPay Callback] No signature provided in webhook.`);
    }

    // Robustly find the deposit document (with/without hyphen)
    const { depositRef, depositDoc, matchedId } = await findDepositDoc(db, order_no);
    const finalOrderNo = matchedId || order_no;

    if (!depositDoc || !depositDoc.exists) {
      console.error('[ProPay] Deposit document not found for order_no:', order_no);
      return res.status(404).send("Deposit not found");
    }

    const statusStr = String(status).toLowerCase();
    const isSuccess = ['success', 'completed', 'approved', '1', 'true'].includes(statusStr);

    if (!isSuccess) {
      try {
        if (depositRef) {
          await depositRef.update({ status: 'cancelled' });
        }
      } catch (e) {
        console.error("Error cancelling deposit:", e);
      }
      return res.send("Transaction not successful");
    }

    // Defensive Deduplication based on External TrxId (if ProPay sends it)
    const externalTrxId = payload.transaction_id || payload.trxId || payload.trx_id || payload.bank_trx_id || payload.TxID || null;

    if (externalTrxId) {
      const existing = await db.collection("deposits")
        .where("externalTrxId", "==", externalTrxId)
        .where("status", "in", ["approved", "success"])
        .limit(1)
        .get();
      if (!existing.empty) {
        console.warn(`[ProPay Callback] Prevented duplicate credit for externalTrxId: ${externalTrxId}`);
        return res.send("Already processed external transaction");
      }
    }

    // Atomic Processing
    await db.runTransaction(async (transaction) => {
      let externalTxRef = null;
      if (externalTrxId) {
         externalTxRef = db.collection("processed_txids").doc(String(externalTrxId));
         const externalTxDoc = await transaction.get(externalTxRef);
         if (externalTxDoc.exists) {
            throw new Error("Already processed external transaction");
         }
      }

      const txRef = db.collection("transactions").doc(finalOrderNo);
      const txDoc = await transaction.get(txRef);

      if (txDoc.exists && (txDoc.data()?.status === 'success' || txDoc.data()?.status === 'approved')) {
        throw new Error("Transaction already processed");
      }

      const finalDepositRef = depositRef || db.collection("deposits").doc(finalOrderNo);
      const finalDepositDoc = depositDoc || await transaction.get(finalDepositRef);

      if (!finalDepositDoc.exists) {
        throw new Error("Deposit not found");
      }

      const depositData = finalDepositDoc.data();
      const uid = depositData?.uid;

      if (depositData?.status === 'approved' || depositData?.status === 'success') {
        throw new Error("Transaction already processed");
      }

      if (!uid) throw new Error("UID missing in deposit document");

      const userRef = db.collection("users").doc(uid);
      const userDoc = await transaction.get(userRef);
      const uData = userDoc.data() || {};
      const currentBalance = parseFloat(uData.balance || "0");
      const depositAmount = Number(depositData?.amount) || parseFloat(amount || "0");

      const finalCreditMap: Record<number, number> = {
        550: 1100,
        1000: 2000,
        1550: 3100,
        3000: 6000,
        5000: 10000,
        10000: 20000,
        20000: 40000,
        30000: 60000,
        50000: 100000
      };

      let creditAmount = depositData?.finalCredit !== undefined && Number(depositData.finalCredit) > 0
        ? Number(depositData.finalCredit)
        : (depositAmount === 550 ? 1100 : (finalCreditMap[depositAmount] || depositAmount));

      const newBal = (currentBalance + creditAmount).toFixed(2);
      const newTotalDep = (uData.totalDeposited || 0) + depositAmount;
      const newAppCount = (uData.approvedDepositsCount || 0) + 1;
      const isBonus = creditAmount > depositAmount;

      transaction.set(userRef, {
        balance: newBal,
        totalDeposited: newTotalDep,
        approvedDepositsCount: newAppCount,
        adminApproved: newTotalDep >= 550 ? true : uData.adminApproved || false,
        withdrawEnabled: newAppCount >= 2 ? true : uData.withdrawEnabled || false,
        giftCardRedeemed: isBonus || depositAmount === 550 ? true : uData.giftCardRedeemed || false,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const userHistoryRef = db.collection("users").doc(uid).collection("history").doc(finalOrderNo);
      transaction.set(userHistoryRef, {
        status: "approved",
        updatedAt: new Date().toISOString()
      }, { merge: true });

      transaction.set(txRef, {
        uid,
        type: 'deposit',
        status: 'approved',
        amount: depositAmount,
        finalCredit: creditAmount,
        description: isBonus ? `৳${depositAmount} ডিপোজিট সফলভাবে সম্পন্ন হয়েছে (বোনাস সহ মোট ৳${creditAmount})।` : `৳${depositAmount} ডিপোজিট সফলভাবে সম্পন্ন হয়েছে।`,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const updateData: any = { 
        status: 'approved',
        finalCredit: creditAmount,
        updatedAt: new Date().toISOString()
      };
      if (externalTrxId) updateData.externalTrxId = externalTrxId;
      transaction.update(finalDepositRef, updateData);

      if (externalTxRef) {
         transaction.set(externalTxRef, {
            order_no: finalOrderNo,
            uid,
            amount: creditAmount,
            createdAt: new Date().toISOString()
         });
      }
    });

    console.log(`[ProPay] Payment success for order: ${finalOrderNo}`);
    res.send("Success");
  } catch (err: any) {
    console.error("Callback error:", err);
    if (err.message === "Transaction already processed") {
      return res.send("Already processed");
    }
    res.status(500).send(err.message);
  }
});


// Update Auth Profile
app.post("/api/update-auth", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const { uid, newUsername, newPassword, newPhone } = req.body;
    console.log(`DEBUG: /api/update-auth request body:`, { uid, newUsername, newPassword, newPhone });
    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }
    const authUpdate: any = {};
    const firestoreUpdate: any = {};
    const db = adminApp.firestore();
    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();
    let dbEmail = "";
    let dbUsername = "";
    if (userDoc.exists) {
      const data = userDoc.data() || {};
      dbEmail = data.email || "";
      dbUsername = data.username || "";
    }
    if (newUsername) {
      authUpdate.email = `${newUsername.toLowerCase().replace(/\s+/g, "")}@sn777.com`;
      firestoreUpdate.username = newUsername;
      firestoreUpdate.email = authUpdate.email;
    }
    if (newPassword) {
      authUpdate.password = newPassword;
      firestoreUpdate.password = newPassword;
    }
    if (newPhone) {
      firestoreUpdate.phone = `+880 ${newPhone}`;
    }
    if (newPassword) {
      console.log(`DEBUG: Updating Auth password for user ${uid}`);
      let success = false;
      let lastError = null;
      for (let i = 0; i < 3; i++) {
        try {
          await adminApp.auth().updateUser(uid, { password: newPassword, disabled: false });
          success = true;
          break;
        } catch (authErr: any) {
          if (authErr.code === "auth/user-not-found") {
            console.log(`[update-auth] User not found in Firebase Auth. Re-creating auth record for uid: ${uid}`);
            const targetEmail = dbEmail || authUpdate.email || `${(dbUsername || uid).toLowerCase().replace(/\s+/g, "")}@sn777.com`;
            try {
              await adminApp.auth().createUser({
                uid,
                email: targetEmail,
                password: newPassword,
                disabled: false
              });
              success = true;
              break;
            } catch (createErr: any) {
              if (createErr.code === "auth/email-already-exists") {
                console.log(`[update-auth] Email ${targetEmail} matches another user during creation. Cleaning up...`);
                try {
                  const conflictingUser = await adminApp.auth().getUserByEmail(targetEmail);
                  if (conflictingUser && conflictingUser.uid !== uid) {
                    await adminApp.auth().deleteUser(conflictingUser.uid);
                    await adminApp.auth().createUser({
                      uid,
                      email: targetEmail,
                      password: newPassword,
                      disabled: false
                    });
                    success = true;
                    break;
                  }
                } catch (cleanErr) {
                  console.error(`[update-auth] Conflicting creation cleanup failed:`, cleanErr);
                }
              }
              console.error(`[update-auth] Re-creation failed:`, createErr);
              lastError = createErr;
            }
          } else {
            lastError = authErr;
          }
          console.error(`DEBUG: Auth password update FAILED (attempt ${i + 1}) for user ${uid}:`, authErr);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      if (!success) {
        throw lastError;
      }
      await adminApp.auth().revokeRefreshTokens(uid);
      console.log(`DEBUG: Auth password updated successfully for user ${uid}`);
    }
    
    const otherAuthUpdate = { ...authUpdate };
    delete otherAuthUpdate.password;
    if (Object.keys(otherAuthUpdate).length > 0) {
      console.log(`DEBUG: Updating Auth for user ${uid} with data:`, otherAuthUpdate);
      try {
        await adminApp.auth().updateUser(uid, otherAuthUpdate);
      } catch (authErr: any) {
        if (authErr.code === "auth/user-not-found") {
          console.log(`[update-auth] User not found for other fields update. Re-creating auth record for uid: ${uid}`);
          const targetEmail = otherAuthUpdate.email || dbEmail || `${(dbUsername || uid).toLowerCase().replace(/\s+/g, "")}@sn777.com`;
          const targetPassword = newPassword || (userDoc.exists ? userDoc.data()?.password : undefined) || "123456";
          await adminApp.auth().createUser({
            uid,
            email: targetEmail,
            password: targetPassword,
            disabled: false
          });
        } else if (authErr.code === "auth/email-already-exists") {
          console.log(`[update-auth] Email ${otherAuthUpdate.email} matches another user during update. Cleaning up conflicting user...`);
          try {
            const conflictingUser = await adminApp.auth().getUserByEmail(otherAuthUpdate.email);
            if (conflictingUser && conflictingUser.uid !== uid) {
              console.log(`[update-auth] Deleting conflicting Auth user with UID: ${conflictingUser.uid}`);
              await adminApp.auth().deleteUser(conflictingUser.uid);
              await adminApp.auth().updateUser(uid, otherAuthUpdate);
            }
          } catch (cleanErr) {
            console.error(`[update-auth] Conflicting email cleanup during update failed:`, cleanErr);
            throw authErr;
          }
        } else {
          throw authErr;
        }
      }
    }
    
    if (Object.keys(firestoreUpdate).length > 0 && userDoc.exists) {
      console.log(`DEBUG: Updating Firestore for user ${uid} with data:`, { ...firestoreUpdate, password: "***" });
      await userDocRef.update(firestoreUpdate);
      console.log(`DEBUG: Firestore updated successfully for user ${uid}.`);
    }
    res.json({ success: true, message: "Profile updated successfully!" });
  } catch (err: any) {
    console.error("Auth update error:", err);
    res.status(500).json({ error: "প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে: " + err.message });
  }
});

// Debug Users
app.get("/api/debug-users", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const username = req.query.username as string;
    let authUser: any = null;
    try {
      if (username) {
        authUser = await adminApp.auth().getUserByEmail(`${username.toLowerCase().replace(/\s+/g, "")}@sn777.com`);
      } else {
        return res.json({ error: "provide username" });
      }
    } catch (e: any) {
      authUser = { error: e.message };
    }
    const snapshot = await adminApp.firestore().collection("users").where("username", "==", username).get();
    let firestoreData = null;
    if (!snapshot.empty) {
      firestoreData = snapshot.docs[0].data();
    }
    res.json({
      auth_user: authUser,
      firestore_data: firestoreData
    });
  } catch (e: any) {
    res.json({ error: e.message });
  }
});

// Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Debug Project
app.get("/api/debug-project", (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    res.json({ projectId: adminApp.app().options.projectId });
  } catch (e: any) {
    res.json({ error: e.message });
  }
});


// Callback / Webhook from ProPay handler is now merged into app.post("/api/propay-callback", ...)

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

app.get("/success", async (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="bn">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>পেমেন্ট সফল</title>
      <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #0b0f19; margin: 0; color: white; text-align: center; }
          .card { background: #14233c; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); max-width: 90%; width: 400px; }
          .icon { width: 80px; height: 80px; background: rgba(34, 197, 94, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #22c55e; font-size: 3rem; margin: 0 auto 1.5rem; }
          h1 { color: #22c55e; margin: 0 0 1rem; font-size: 1.5rem; font-weight: 800; }
          p { color: #94a3b8; margin: 0 0 2rem; font-size: 1rem; line-height: 1.5; }
          .spinner { margin: 0 auto 1.5rem; width: 40px; height: 40px; border: 4px solid rgba(34, 197, 94, 0.3); border-top-color: #22c55e; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
          a { display: block; background: #2563eb; color: white; text-decoration: none; padding: 1rem; border-radius: 1rem; font-weight: bold; transition: all 0.2s; cursor: pointer; border: none; width: 100%; font-size: 1rem; }
          a:hover { background: #1d4ed8; }
      </style>
  </head>
  <body>
      <div class="card">
          <div class="icon">✓</div>
          <h1>পেমেন্ট সফল হয়েছে!</h1>
          <div class="spinner"></div>
          <p>আপনার রিকোয়েস্ট প্রসেস করা হচ্ছে। অনুগ্রহ করে ধৈর্য ধরুন।<br><br>যদি ৫ সেকেন্ডের মধ্যে পেজটি স্বয়ংক্রিয়ভাবে বন্ধ না হয়, তবে দয়া করে নিচের বাটনে ক্লিক করুন।</p>
          <button onclick="closeOrRedirect()" style="display: block; background: #2563eb; color: white; text-decoration: none; padding: 1rem; border-radius: 1rem; font-weight: bold; transition: all 0.2s; cursor: pointer; border: none; width: 100%; font-size: 1rem;">গেমে ফিরে যান</button>
      </div>
      <script>
          function closeOrRedirect() {
              window.location.href = "/";
          }
          setTimeout(closeOrRedirect, 5000);
      </script>
  </body>
  </html>
  `);
});

app.get("/fail", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="bn">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>পেমেন্ট বাতিল</title>
      <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #0b0f19; margin: 0; color: white; text-align: center; }
          .card { background: #14233c; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); max-width: 90%; width: 400px; }
          .icon { width: 80px; height: 80px; background: rgba(239, 68, 68, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ef4444; font-size: 3rem; margin: 0 auto 1.5rem; }
          h1 { color: #ef4444; margin: 0 0 1rem; font-size: 1.5rem; font-weight: 800; }
          p { color: #94a3b8; margin: 0 0 2rem; font-size: 1rem; line-height: 1.5; }
          .spinner { margin: 0 auto 1.5rem; width: 40px; height: 40px; border: 4px solid rgba(239, 68, 68, 0.3); border-top-color: #ef4444; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
          a { display: block; background: #2563eb; color: white; text-decoration: none; padding: 1rem; border-radius: 1rem; font-weight: bold; transition: all 0.2s; cursor: pointer; border: none; width: 100%; font-size: 1rem; }
          a:hover { background: #1d4ed8; }
      </style>
  </head>
  <body>
      <div class="card">
          <div class="icon">✕</div>
          <h1>পেমেন্ট বাতিল করা হয়েছে!</h1>
          <div class="spinner"></div>
          <p>আপনার রিকোয়েস্ট প্রসেস করা হচ্ছে। অনুগ্রহ করে ধৈর্য ধরুন।<br><br>যদি ৫ সেকেন্ডের মধ্যে পেজটি স্বয়ংক্রিয়ভাবে বন্ধ না হয়, তবে দয়া করে নিচের বাটনে ক্লিক করুন।</p>
          <button onclick="closeOrRedirect()" style="display: block; background: #2563eb; color: white; text-decoration: none; padding: 1rem; border-radius: 1rem; font-weight: bold; transition: all 0.2s; cursor: pointer; border: none; width: 100%; font-size: 1rem;">হোম পেজে ফিরে যান</button>
      </div>
      <script>
          function closeOrRedirect() {
              window.location.href = "/";
          }
          setTimeout(closeOrRedirect, 5000);
      </script>
  </body>
  </html>
  `);
});

// Chat support widget
app.get("/chat", (req, res) => {
  const name = (req.query.name || "Guest").toString();
  const email = (req.query.email || `${name.toLowerCase()}@sn777.com`).toString();
  res.send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Live Chat Support</title>
    <link rel="dns-prefetch" href="https://embed.tawk.to">
    <link rel="dns-prefetch" href="https://va.tawk.to">
    <link rel="preconnect" href="https://embed.tawk.to" crossorigin>
    <link rel="preconnect" href="https://va.tawk.to" crossorigin>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #0b0f19;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            flex-direction: column;
        }
        #chat-wrapper {
            flex: 1;
            width: 100%;
            height: 100%;
            position: relative;
        }
        #tawk_chat_container {
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        }
        .loader-container {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background-color: #0b0f19;
            color: #94a3b8;
            z-index: 10;
            transition: opacity 0.5s ease;
        }
        .spinner {
            border: 4px solid rgba(255, 255, 255, 0.1);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border-left-color: #06b6d4;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        p {
            margin: 4px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="loader-container" id="loader">
        <div class="spinner"></div>
        <p>সাপোর্ট চ্যাট কানেক্ট হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
        <p style="font-size: 12px; color: #64748b;">ইউজারনেম: <strong>${name}</strong></p>
    </div>

    <div id="chat-wrapper">
        <div id="tawk_chat_container"></div>
    </div>

    <script type="text/javascript">
        var Tawk_API = Tawk_API || {};
        var Tawk_LoadStart = new Date();
        
        Tawk_API.visitor = {
            name: ${JSON.stringify(name)},
            email: ${JSON.stringify(email)}
        };

        Tawk_API.embedded = 'tawk_chat_container';

        Tawk_API.onLoad = function() {
            var loader = document.getElementById('loader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(function() {
                    loader.style.display = 'none';
                }, 500);
            }
        };
        
        setTimeout(function() {
            var loader = document.getElementById('loader');
            if (loader && loader.style.display !== 'none') {
                loader.style.opacity = '0';
                setTimeout(function() {
                    loader.style.display = 'none';
                }, 500);
            }
        }, 8000);

        (function(){
            var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
            s1.async = true;
            s1.src = 'https://embed.tawk.to/6a00124c06a7a01c3394a833/default';
            s1.charset = 'UTF-8';
            s1.setAttribute('crossorigin','*');
            s0.parentNode.insertBefore(s1, s0);
        })();
    </script>
</body>
</html>
  `);
});

setInterval(() => {
  console.log(`${new Date().toISOString()} - System Keep-Alive: OK`);
}, 15 * 60 * 1000);

function serveStatic() {
  const distPath = fs.existsSync(path.join(process.cwd(), "dist"))
    ? path.join(process.cwd(), "dist")
    : path.join(process.cwd(), "dist_backup");
  console.log(`Serving prebuilt static files from: ${distPath}`);
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

async function startServer() {
  const hasSrc = fs.existsSync(path.join(process.cwd(), "src")) && (fs.existsSync(path.join(process.cwd(), "index.html")) || fs.existsSync(path.join(process.cwd(), "src/main.tsx")));
  const useVite = process.env.NODE_ENV !== "production" && hasSrc;
  
  if (useVite) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
      console.log("Vite development server loaded in middleware mode.");
    } catch (err) {
      console.error("Vite failed to load, falling back to static files:", err);
      serveStatic();
    }
  } else {
    serveStatic();
  }
  
    cron.schedule("* * * * *", async () => {
      console.log("[Cron] Running auto-cancel check for pending deposits");
      const db = getFirebaseAdmin().firestore();
      const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      try {
        const pendingDeposits = await db.collection("deposits").where("status", "==", "pending").get();
        console.log(`[Cron] Found ${pendingDeposits.docs.length} pending deposits`);
        for (const doc of pendingDeposits.docs) {
          const data = doc.data();
          let createdDate = data.timestamp || data.createdAt;
          if (createdDate && typeof (createdDate as any).toDate === "function") {
            createdDate = (createdDate as any).toDate().toISOString();
          } else if (createdDate && typeof createdDate === "string") {
            // already string
          } else {
            continue;
          }
          if (createdDate && createdDate < sixtyMinutesAgo) {
            const depositId = doc.id;
            const uid = data.uid;
            await doc.ref.update({ status: "cancelled" });
            console.log(`[Cron] Auto-cancelled deposits/${depositId}`);
            try {
              await db.collection("transactions").doc(depositId).set({ status: "cancelled" }, { merge: true });
            } catch (txErr: any) {
              console.log(`[Cron] Transactions doc ${depositId} error:`, txErr.message);
            }
            if (uid) {
              try {
                await db.collection("users").doc(uid).collection("history").doc(depositId).set({ status: "cancelled" }, { merge: true });
              } catch (histErr: any) {
                console.log(`[Cron] History doc ${depositId} error:`, histErr.message);
              }
            }
          }
        }
      } catch (error) {
        console.error("[Cron] Error running auto-cancel check:", error);
      }
    });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
