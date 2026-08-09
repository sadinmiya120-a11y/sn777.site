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


async function approveDepositHelper(db: any, order_no: string, reqAmount?: number) {
  const { depositRef, depositDoc, matchedId } = await findDepositDoc(db, order_no);
  const finalOrderNo = matchedId || order_no;
  if (!depositDoc || !depositDoc.exists) {
    return { success: false, message: "ডিপোজিট রিকোয়েস্ট পাওয়া যায়নি।" };
  }
  const depositData = depositDoc.data();
  const uid = depositData?.uid;
  if (!uid) {
    return { success: false, message: "ইউজার আইডি পাওয়া যায়নি।" };
  }
  if (depositData?.status === "approved" || depositData?.status === "success") {
    return { success: true, message: "এই ডিপোজিট ইতিমধ্যেই অ্যাপ্রুভ করা হয়েছে।", status: "approved", amount: depositData?.amount || 0, finalCredit: depositData?.finalCredit || depositData?.amount || 0 };
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
  let creditAmount = depositData?.finalCredit !== undefined && Number(depositData.finalCredit) > 0
    ? Number(depositData.finalCredit)
    : (depositAmount === 550 ? 1100 : (finalCreditMap[depositAmount] || depositAmount));

  const userRef = db.collection("users").doc(uid);
  const txRef = db.collection("transactions").doc(finalOrderNo);
  const userHistoryRef = db.collection("users").doc(uid).collection("history").doc(finalOrderNo);
  const finalDepositRef = depositRef || db.collection("deposits").doc(finalOrderNo);

  await db.runTransaction(async (transaction: any) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new Error("User document not found");
    }
    const uData = userDoc.data() || {};
    const currBal = parseFloat(uData.balance || "0.00");
    const newBal = (currBal + creditAmount).toFixed(2);
    const currTotalDep = uData.totalDeposited || 0;
    const newTotalDep = currTotalDep + depositAmount;
    const currAppCount = uData.approvedDepositsCount || 0;
    const newAppCount = currAppCount + 1;
    const isBonus = creditAmount > depositAmount;

    transaction.update(userRef, {
      balance: newBal,
      totalDeposited: newTotalDep,
      approvedDepositsCount: newAppCount,
      adminApproved: newTotalDep >= 550 ? true : (uData.adminApproved || false),
      withdrawEnabled: newAppCount >= 2 ? true : (uData.withdrawEnabled || false),
      giftCardRedeemed: isBonus || depositAmount >= 550 ? true : (uData.giftCardRedeemed || false)
    });

    transaction.set(finalDepositRef, {
      status: "approved",
      approvedAt: new Date().toISOString(),
      creditedAmount: creditAmount
    }, { merge: true });

    transaction.set(txRef, {
      uid,
      username: uData.username || depositData.username || "",
      amount: depositAmount,
      finalCredit: creditAmount,
      status: "approved",
      type: "deposit",
      method: depositData.method || "online",
      updatedAt: new Date().toISOString()
    }, { merge: true });

    transaction.set(userHistoryRef, {
      status: "approved",
      approvedAt: new Date().toISOString(),
      creditedAmount: creditAmount
    }, { merge: true });
  });

  return { success: true, message: "ডিপোজিট অ্যাপ্রুভ হয়েছে!", status: "approved", amount: depositAmount, finalCredit: creditAmount };
}


// Create Payment
app.post("/api/create-payment", async (req, res) => {
  try {
    const { uid, amount, method } = req.body;
    if (!uid || !amount || !method) return res.status(400).json({ error: "Missing parameters" });
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
    const appUrl = process.env.APP_URL || (host ? `${proto}://${host}` : "https://sn777.site");
    const gateway_url = method === "bkash" ? "https://checkout.propay.cyou/pay/Bkash.php" : "https://checkout.propay.cyou/pay/Nagad.php";
    const callbackUrl = `${appUrl}/api/propay-callback`;
    const params = new URLSearchParams({
      api_key: process.env.PROPAY_API_KEY || "cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc",
      uid,
      amount: amount.toString(),
      order_no,
      return_url: `${appUrl}/success?m=1&order_no=${order_no}`,
      success_url: `${appUrl}/success?m=1&order_no=${order_no}`,
      cancel_url: `${appUrl}/fail`,
      callback_url: callbackUrl,
      webhook_url: callbackUrl,
      ipn_url: callbackUrl,
      pass_through_key: process.env.PROPAY_API_KEY || "cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc",
      pass_through_callback_url: callbackUrl
    });
    res.json({ redirect_url: `${gateway_url}?${params.toString()}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Payment status
app.post("/api/verify-payment", async (req, res) => {
  try {
    const { order_no } = req.body;
    if (!order_no) {
      return res.status(400).json({ error: "Missing order_no" });
    }
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();
    
    const result = await approveDepositHelper(db, order_no);
    if (result.success) {
      return res.json({
        success: true,
        status: "approved",
        amount: result.amount || 0,
        finalCredit: result.finalCredit || 0,
        message: result.message
      });
    }

    const { depositDoc } = await findDepositDoc(db, order_no);
    const depositData = depositDoc?.exists ? depositDoc.data() : null;

    res.json({
      success: depositData?.status === "approved" || depositData?.status === "success",
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
    const result = await approveDepositHelper(db, order_no, reqAmount);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json(result);
  } catch (err: any) {
    console.error("Admin approve deposit error:", err);
    return res.status(500).json({ error: err.message });
  }
});


// Admin Toggle User Status (Disable / Enable)
app.post("/api/admin/toggle-user-status", async (req, res) => {
  try {
    const { uid, status } = req.body; // status: 'disabled' | 'active'
    if (!uid || !status) {
      return res.status(400).json({ error: "Missing uid or status" });
    }
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();
    const isDisabled = status === "disabled";

    // Update Firestore
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "ইউজার পাওয়া যায়নি।" });
    }

    await userRef.update({
      status,
      disabledAt: isDisabled ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString()
    });

    // Disable in Firebase Auth to immediately invalidate auth tokens
    try {
      await adminApp.auth().updateUser(uid, { disabled: isDisabled });
      if (isDisabled) {
        await adminApp.auth().revokeRefreshTokens(uid);
      }
    } catch (authErr: any) {
      console.warn("[toggle-user-status] Auth update warning:", authErr.message);
    }

    res.json({
      success: true,
      message: isDisabled ? "ইউজার সফলভাবে ব্লক/ডিজেবল করা হয়েছে!" : "ইউজার সফলভাবে পুনরায় সক্রিয়/এনাবল করা হয়েছে!",
      status
    });
  } catch (err: any) {
    console.error("Toggle user status error:", err);
    res.status(500).json({ error: err.message });
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

app.get('/api/debug-logs', async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();
    const snap = await db.collection('propay_logs').orderBy('timestamp', 'desc').limit(20).get();
    const logs = [];
    snap.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
    res.json(logs);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});


app.get('/api/check-user/:username', async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();
    const q = await db.collection('users').where('username', '==', req.params.username).get();
    if (q.empty) return res.status(404).json({ error: 'User not found' });
    const userDoc = q.docs[0];
    res.json({ uid: userDoc.id, ...userDoc.data() });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.all("/api/propay-callback", upload.none(), async (req, res) => {
  try {
    const payload = { ...(req.body || {}), ...(req.query || {}) };
    let order_no = payload.order_no || payload.order_id || payload.ref || payload.reference || payload.cust_order_id || payload.customer_order_id;
    const amount = payload.amount || payload.total_amount;
    const status = payload.status || payload.txn_status || payload.state || "success";

    console.log('[ProPay Callback] Received payload:', payload);

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

    if (!order_no) {
      console.error('[ProPay] Missing order_no parameter:', payload);
      return res.status(400).send("Missing order_no");
    }

    order_no = String(order_no).trim();
    const statusStr = String(status).toLowerCase();
    const isSuccess = ['success', 'completed', 'approved', '1', 'true', 'ok'].includes(statusStr);

    if (!isSuccess) {
      console.log('[ProPay Callback] Payment status is not success:', statusStr);
      try {
        const { depositRef } = await findDepositDoc(db, order_no);
        if (depositRef) {
          await depositRef.update({ status: 'cancelled' });
        }
      } catch (e) {}
      return res.send("Transaction not successful");
    }

    // Call unified approveDepositHelper
    const result = await approveDepositHelper(db, order_no, Number(amount) || undefined);
    console.log('[ProPay Callback] Approval result for order', order_no, result);

    return res.status(200).send("SUCCESS");
  } catch (err: any) {
    console.error('[ProPay Callback Error]:', err);
    return res.status(500).send(err.message);
  }
});

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

app.get("/success", async (req, res) => {
  const order_no = req.query.order_no || req.query.order_id || req.query.ref;
  if (order_no) {
    try {
      const adminApp = getFirebaseAdmin();
      const db = adminApp.firestore();
      await approveDepositHelper(db, String(order_no).trim());
    } catch (e) {
      console.error("/success auto-approve error:", e);
    }
  }

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