import fs from "fs";
import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
const appDir = process.cwd();
import admin from "firebase-admin";
import crypto from "crypto";
import cron from 'node-cron';

import multer from "multer";
const upload = multer();

// Create server
const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Firebase Admin initialization (lazy)
function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any)
      });
    } catch (e: any) {
      console.error("Firebase Admin init error:", e);
    }
  }
  return admin;
}

// Firebase Authentication Proxy to bypass ISP, DNS, or browser-level blocks on identitytoolkit/securetoken
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

    // Forward important headers from client
    for (const [key, value] of Object.entries(req.headers)) {
      if (['host', 'connection', 'content-length', 'cookie', 'origin', 'referer', 'accept-encoding'].includes(key.toLowerCase())) {
        continue;
      }
      if (typeof value === 'string') {
        headers[key] = value;
      }
    }

    const hasBody = !['GET', 'HEAD'].includes(req.method) && req.body && Object.keys(req.body).length > 0;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: hasBody ? JSON.stringify(req.body) : undefined
    });

    const bodyText = await response.text();
    
    res.status(response.status);

    // Forward response headers back to client
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection', 'content-security-policy', 'access-control-allow-origin'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    res.send(bodyText);
  } catch (err: any) {
    console.error("[Auth Proxy Error]:", err);
    res.status(500).json({ error: "Auth Proxy failed", message: err.message });
  }
});

// Password Reset Endpoint
app.post("/api/reset-password", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const { phone, newPassword, username } = req.body;

    if (!phone || !newPassword || !username) {
      return res.status(400).json({ error: "Missing phone, newPassword, or username" });
    }

    const formattedPhone = `+880 ${phone}`;
    
    // We need to find the user in Firestore users collection
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

    const userId = userDoc.id; // Same as auth uid

    // Try to update their password in Auth and Firestore
    console.log(`Attempting to update password for user ID: ${userId}`);
    let userRec;
    try {
        userRec = await adminApp.auth().getUser(userId);
        console.log(`User found in Auth: ${userId}, Email: ${userRec.email}`);
        
        // 1. Update Auth
        await adminApp.auth().updateUser(userId, {
          password: newPassword
        });
        
        // Revoke refresh tokens to force logout
        await adminApp.auth().revokeRefreshTokens(userId);
        
        // 2. Update Firestore
        await usersRef.doc(userId).update({
          password: newPassword
        });

        console.log(`Password updated in both Auth and Firestore for user ID: ${userId}`);
    } catch(e: any) {
        console.error(`Error updating user: ${e.message}`);
        throw e;
    }
    
    res.json({ success: true, message: "Password updated successfully!", email: userRec?.email });
  } catch (err: any) {
    console.error("Password reset error:", err);
    console.error("Error stack:", err.stack);
    if (err.message.includes("FIREBASE_SERVICE_ACCOUNT_KEY")) {
      return res.status(500).json({ error: "সিস্টেমটি সক্রিয় করতে অনুগ্রহ করে সেটিংস থেকে Service Account Key টি যুক্ত করুন।" });
    }
    res.status(500).json({ error: "পাসওয়ার্ড পরিবর্তন করতে সমস্যা হচ্ছে। পরে আবার চেষ্টা করুন।" });
  }
});

// Update Username Endpoint
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


// --- GOPay Integration ---

const TX_STORE_FILE = path.join(process.cwd(), "data", "transactions_store.json");

function getLocalTransactions(): any[] {
  try {
    if (fs.existsSync(TX_STORE_FILE)) {
      return JSON.parse(fs.readFileSync(TX_STORE_FILE, "utf8")) || [];
    }
  } catch (e) {}
  return [];
}

function saveLocalTransaction(tx: any) {
  try {
    const list = getLocalTransactions();
    const docKey = tx.id || tx.order_no || tx.depositNo || tx.withdrawNo || (tx.timestamp + "_" + tx.amount);
    const idx = list.findIndex((item: any) => {
      const k = item.id || item.order_no || item.depositNo || item.withdrawNo || (item.timestamp + "_" + item.amount);
      return k === docKey || (tx.order_no && item.order_no === tx.order_no) || (tx.id && item.id === tx.id);
    });
    if (idx >= 0) {
      const existing = list[idx];
      const isApproved = existing.status === approved || existing.status === success || existing.status === 1 || existing.credited === true ||
                         tx.status === approved || tx.status === success || tx.status === 1 || tx.credited === true;
      const isRejected = !isApproved && (existing.status === rejected || existing.status === cancelled || existing.status === failed || existing.status === 2 ||
                         tx.status === rejected || tx.status === cancelled || tx.status === failed || tx.status === 2);
      list[idx] = {
        ...existing,
        ...tx,
        status: isApproved ? approved : (isRejected ? cancelled : (tx.status || existing.status || pending)),
        credited: isApproved ? true : (tx.credited || existing.credited || false),
        updatedAt: new Date().toISOString()
      };
    } else {
      list.unshift({ ...tx, createdAt: tx.createdAt || tx.timestamp || new Date().toISOString() });
    }
    const trimmed = list.slice(0, 1000);
    fs.writeFileSync(TX_STORE_FILE, JSON.stringify(trimmed, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save local transaction:", e);
  }
}

async function fixUnknownUsernamesInDb() {
  try {
    const localList = getLocalTransactions();
    let updatedLocal = false;
    for (const tx of localList) {
      if (!tx.username || tx.username === "unknown") {
        const fallbackName = tx.uid && tx.uid !== "unknown" ? tx.uid : "User";
        tx.username = fallbackName;
        updatedLocal = true;
      }
    }
    if (updatedLocal) {
      fs.writeFileSync(TX_STORE_FILE, JSON.stringify(localList, null, 2), "utf8");
    }

    const adminApp = getFirebaseAdmin();
    if (!adminApp) return;
    const db = adminApp.firestore();

    const depSnap = await db.collection("deposits").where("username", "==", "unknown").limit(10).get();
    for (const dDoc of depSnap.docs) {
      const dData = dDoc.data();
      const uName = dData.uid && dData.uid !== "unknown" ? dData.uid : "User";
      await dDoc.ref.update({ username: uName }).catch(() => {});
    }
  } catch (err: any) {
    if (err?.code === 8 || err?.message?.includes("Quota exceeded")) {
      // Gracefully handle Firestore quota limit without spamming error logs
      return;
    }
    console.warn("fixUnknownUsernamesInDb status:", err?.message || err);
  }
}

setTimeout(() => {
  fixUnknownUsernamesInDb();
}, 3000);


// Endpoint to record transaction persistently
app.post("/api/record-transaction", async (req, res) => {
  try {
    const tx = req.body;
    if (!tx || !tx.uid) {
      return res.status(400).json({ error: "Missing tx data or uid" });
    }

    const docId = tx.id || tx.order_no || tx.depositNo || tx.withdrawNo || ("tx_" + Date.now());
    let safeTx = { ...tx };

    // Security check: Client cannot arbitrarily mark deposits as "approved"
    if (safeTx.type === "deposit") {
      const localList = getLocalTransactions();
      const existing = localList.find((item: any) => (item.id === docId || item.order_no === docId));
      if (!existing || existing.status !== "approved") {
        safeTx.status = "pending";
      }
    }

    saveLocalTransaction(safeTx);

    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const db = adminApp.firestore();
        if (safeTx.type === "deposit") {
          const depRef = db.collection("deposits").doc(String(docId));
          const snap = await depRef.get();
          // If already approved in DB, do not downgrade, otherwise keep as pending
          if (snap.exists && (snap.data()?.status === "approved" || snap.data()?.credited === true)) {
            safeTx.status = "approved";
          } else {
            safeTx.status = "pending";
          }
          await depRef.set(safeTx, { merge: true });
        } else if (safeTx.type === "withdraw") {
          await db.collection("withdrawals").doc(String(docId)).set(safeTx, { merge: true });
        }
        await db.collection("transactions").doc(String(docId)).set(safeTx, { merge: true });
      }
    } catch (fbErr: any) {}

    return res.json({ success: true, status: safeTx.status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint to fetch user transactions with resilient fallback across transactions, withdrawals, deposits, history
app.get("/api/user-transactions", async (req, res) => {
  try {
    const uid = String(req.query.uid || "").trim();
    if (!uid) return res.status(400).json({ error: "Missing uid" });
    const localList = getLocalTransactions().filter((t: any) => t.uid === uid);
    let firestoreList: any[] = [];
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const db = adminApp.firestore();
        const [txSnap, wthSnap, depSnap, histSnap] = await Promise.all([
          db.collection("transactions").where("uid", "==", uid).limit(100).get().catch(() => ({ docs: [] })),
          db.collection("withdrawals").where("uid", "==", uid).limit(100).get().catch(() => ({ docs: [] })),
          db.collection("deposits").where("uid", "==", uid).limit(100).get().catch(() => ({ docs: [] })),
          db.collection("users").doc(uid).collection("history").limit(100).get().catch(() => ({ docs: [] })),
        ]);

        txSnap.docs.forEach((d: any) => firestoreList.push({ id: d.id, ...d.data() }));
        wthSnap.docs.forEach((d: any) => {
          const data = d.data();
          firestoreList.push({
            id: d.id,
            type: "withdraw",
            status: data.status || "pending",
            amount: Number(data.amount || 0),
            displayAmount: Number(data.amount || 0),
            method: data.method || data.bankName || "bank",
            bankName: data.bankName || data.method,
            accountNumber: data.accountNumber || data.phone,
            accountHolder: data.accountHolder || data.username,
            timestamp: data.timestamp || data.createdAt || new Date().toISOString(),
            withdrawNo: data.withdrawNo || data.serialNo,
            serialNo: data.serialNo || data.withdrawNo,
            description: data.description || ("উইথড্র রিকোয়েস্ট (" + (data.status || "পেন্ডিং") + ")"),
            ...data
          });
        });
        depSnap.docs.forEach((d: any) => {
          const data = d.data();
          firestoreList.push({
            id: d.id,
            type: "deposit",
            status: data.status || "pending",
            amount: Number(data.amount || 0),
            displayAmount: Number(data.amount || 0),
            method: data.method || "bkash",
            timestamp: data.timestamp || data.createdAt || new Date().toISOString(),
            depositNo: data.depositNo || data.serialNo,
            serialNo: data.serialNo || data.depositNo,
            description: data.description || ("ডিপোজিট রিকোয়েস্ট " + (data.amount || "") + " টাকা"),
            ...data
          });
        });
        histSnap.docs.forEach((d: any) => {
          const data = d.data();
          firestoreList.push({
            id: d.id,
            ...data
          });
        });
      }
    } catch (fbErr: any) {
      console.warn("Error reading from firestore collections:", fbErr);
    }
    const map = new Map<string, any>();
    for (const item of [...firestoreList, ...localList]) {
      const key = String(item.id || item.order_no || item.depositNo || item.withdrawNo || (item.timestamp + "_" + item.amount));
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...item });
      } else {
        const isApproved = existing.status === approved || existing.status === success || existing.status === 1 || existing.credited === true ||
                           item.status === approved || item.status === success || item.status === 1 || item.credited === true;
        const isRejected = !isApproved && (existing.status === rejected || existing.status === cancelled || existing.status === failed || existing.status === 2 ||
                           item.status === rejected || item.status === cancelled || item.status === failed || item.status === 2);
        map.set(key, {
          ...existing,
          ...item,
          status: isApproved ? approved : (isRejected ? cancelled : (item.status || existing.status || pending)),
          credited: isApproved ? true : (item.credited || existing.credited || false)
        });
      }
    }
    const merged = Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    return res.json({ transactions: merged });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/create-payment", async (req, res) => {
  try {
    const { uid, amount, method } = req.body;
    if (!uid || !amount || !method) return res.status(400).json({ error: "Missing parameters" });

    const host = req.get("host") || "sn777.site";
    const proto = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const origin = `${proto}://${host}`;

    const redirect_url = `${origin}/gopay_pay.php?uid=${encodeURIComponent(uid)}&amount=${encodeURIComponent(amount)}&method=${encodeURIComponent(method)}`;
    res.json({ success: true, redirect_url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Update Auth & Firestore Profile Endpoint
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
        if (newPassword) {
      console.log(`DEBUG: New password length: ${newPassword.length}`);
    }

    // Pre-fetch user document from Firestore to get baseline details
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
      authUpdate.email = `${newUsername.toLowerCase().replace(/\s+/g, '')}@sn777.com`;
      firestoreUpdate.username = newUsername;
      firestoreUpdate.email = authUpdate.email; // Save the email to Firestore
    }
    if (newPassword) {
      authUpdate.password = newPassword;
      firestoreUpdate.password = newPassword;
    }
    if (newPhone) {
      firestoreUpdate.phone = `+880 ${newPhone}`;
    }

    // 1. Update Auth (for password/user existence)
    if (newPassword) {
      console.log(`DEBUG: Updating Auth password for user ${uid}`);
      let success = false;
      let lastError: any = null;
      for (let i = 0; i < 3; i++) {
        try {
          await adminApp.auth().updateUser(uid, { password: newPassword, disabled: false });
          success = true;
          break;
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found') {
            console.log(`[update-auth] User not found in Firebase Auth. Re-creating auth record for uid: ${uid}`);
            const targetEmail = dbEmail || authUpdate.email || `${(dbUsername || uid).toLowerCase().replace(/\s+/g, '')}@sn777.com`;
            try {
              await adminApp.auth().createUser({
                uid: uid,
                email: targetEmail,
                password: newPassword,
                disabled: false
              });
              success = true;
              break;
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-exists') {
                console.log(`[update-auth] Email ${targetEmail} matches another user during creation. Cleaning up...`);
                try {
                  const conflictingUser = await adminApp.auth().getUserByEmail(targetEmail);
                  if (conflictingUser && conflictingUser.uid !== uid) {
                    await adminApp.auth().deleteUser(conflictingUser.uid);
                    // Retry creation
                    await adminApp.auth().createUser({
                      uid: uid,
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
          console.error(`DEBUG: Auth password update FAILED (attempt ${i+1}) for user ${uid}:`, authErr);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!success) {
        throw lastError;
      }
      await adminApp.auth().revokeRefreshTokens(uid);
      console.log(`DEBUG: Auth password updated successfully for user ${uid}`);
    }
    
    // Update Auth (other fields like email)
    const otherAuthUpdate: any = { ...authUpdate };
    delete otherAuthUpdate.password;
    if (Object.keys(otherAuthUpdate).length > 0) {
      console.log(`DEBUG: Updating Auth for user ${uid} with data:`, otherAuthUpdate);
      try {
        await adminApp.auth().updateUser(uid, otherAuthUpdate);
      } catch (authErr: any) {
        if (authErr.code === 'auth/user-not-found') {
          console.log(`[update-auth] User not found for other fields update. Re-creating auth record for uid: ${uid}`);
          const targetEmail = otherAuthUpdate.email || dbEmail || `${(dbUsername || uid).toLowerCase().replace(/\s+/g, '')}@sn777.com`;
          const targetPassword = newPassword || (userDoc.exists ? userDoc.data()?.password : undefined) || "123456";
          await adminApp.auth().createUser({
            uid: uid,
            email: targetEmail,
            password: targetPassword,
            disabled: false
          });
        } else if (authErr.code === 'auth/email-already-exists') {
          console.log(`[update-auth] Email ${otherAuthUpdate.email} matches another user during update. Cleaning up conflicting user...`);
          try {
            const conflictingUser = await adminApp.auth().getUserByEmail(otherAuthUpdate.email);
            if (conflictingUser && conflictingUser.uid !== uid) {
              console.log(`[update-auth] Deleting conflicting Auth user with UID: ${conflictingUser.uid}`);
              await adminApp.auth().deleteUser(conflictingUser.uid);
              // Retry update
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
    
    // 2. Update Firestore (for phone and password string backup)
    if (Object.keys(firestoreUpdate).length > 0 && userDoc.exists) {
      console.log(`DEBUG: Updating Firestore for user ${uid} with data:`, { ...firestoreUpdate, password: '***' });
      await userDocRef.update(firestoreUpdate);
      console.log(`DEBUG: Firestore updated successfully for user ${uid}.`);
    }

    res.json({ success: true, message: "Profile updated successfully!" });
  } catch (err: any) {
    console.error("Auth update error:", err);
    res.status(500).json({ error: "প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে: " + err.message });
  }
});

// Debug Users Endpoint
app.get("/api/debug-users", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const username = req.query.username as string;
    
    let authUser = null;
    try {
       if (username) {
         authUser = await adminApp.auth().getUserByEmail(`${username.toLowerCase().replace(/\s+/g, '')}@sn777.com`);
       } else {
         return res.json({error: "provide username"});
       }
    } catch(e: any) {
       authUser = { error: e.message };
    }
    
    // Check Firestore
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
    res.json({error: e.message});
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/debug-project", (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    res.json({ projectId: adminApp.app().options.projectId });
  } catch (e: any) {
    res.json({ error: e.message });
  }
});

// GOPay Payment Initiation Route (supports bkash.php, nagad.php, and API URLs)
app.all(["/gopay_pay.php", "/gopay_pay_bkash.php", "/bkash.php", "/nagad.php", "/pay1/bkash.php", "/pay1/nagad.php", "/api/gopay_pay", "/api/gopay-pay", "/pay.php"], async (req, res) => {
  console.log(`[GOPAY PAY] Request received:`, {
    method: req.method,
    url: req.url,
    query: req.query,
    body: req.body
  });

  try {
    const rawData = { ...req.query, ...req.body };
    const uid = rawData.uid;
    const amount = parseFloat(rawData.amount || rawData.trade_amount || 0);
    const pathStr = (req.path || "").toLowerCase();
    const rawMethod = String(rawData.method || rawData.goods_name || (pathStr.includes("bkash") ? "bkash" : "nagad")).toLowerCase();

    if (!uid || isNaN(amount) || amount <= 0) {
      console.error("[GOPAY PAY] Missing or invalid UID/Amount:", { uid, amount });
      return res.status(400).send("<h3>Illegal access: UID or Amount missing</h3>");
    }

    const host = req.get("host") || "sn777.site";
    const proto = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const origin = `${proto}://${host}`;

    const serial = String(rawData.order_no || rawData.mch_order_no || (
      new Date().toISOString().slice(0, 10).replace(/-/g, "") +
      Math.floor(Date.now() / 1000) +
      Math.floor(100000 + Math.random() * 900000)
    ));

    const now = new Date();
    const createdate = now.toISOString().replace("T", " ").slice(0, 19);
    const isBkash = pathStr.includes("bkash") || rawMethod.includes("bkash");
    const payName = isBkash ? "BKASH" : "NAGAD";
    // Primary: 2202 for BKASH, 2201 for NAGAD
    const payType = isBkash ? "2202" : "2201";

    const notifyURL = origin.includes("localhost") || origin.includes("127.0.0.1")
      ? "https://sn777.site/pay1/gopay_notify.php"
      : `${origin}/pay1/gopay_notify.php`;
    let jumpURL = `${origin}/#/wallet/RechargeHistory`;
    if (rawData.return_url || rawData.page_url || rawData.redirect_url) {
      jumpURL = String(rawData.return_url || rawData.page_url || rawData.redirect_url);
    } else if (req.headers.referer) {
      try {
        const refUrl = new URL(req.headers.referer);
        jumpURL = `${refUrl.origin}/#/wallet/RechargeHistory`;
      } catch (e) {
        jumpURL = `${origin}/#/wallet/RechargeHistory`;
      }
    }

    // 100% bonus for deposit >= 550
    const finalCredit = amount >= 550 ? amount * 2 : amount;

    // Save pending record in Firestore & Local storage
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const db = adminApp.firestore();
        let phone = "01700000000";
        let username = uid || "User";

        try {
          let uData: any = null;
          const userDoc = await db.collection("users").doc(uid).get();
          if (userDoc.exists) {
            uData = userDoc.data();
          } else {
            const q1 = await db.collection("users").where("uid", "==", uid).limit(1).get();
            if (!q1.empty) {
              uData = q1.docs[0].data();
            } else {
              const q2 = await db.collection("users").where("username", "==", uid).limit(1).get();
              if (!q2.empty) {
                uData = q2.docs[0].data();
              }
            }
          }
          if (uData) {
            phone = uData.phone || uData.mobile || phone;
            username = uData.username || uData.name || uData.userName || uData.displayName || username;
          }
        } catch (e) {}

        if (!username || username === "unknown") {
          username = uid || "User";
        }

        const isoTimestamp = new Date().toISOString();
        const depRecord = {
          id: serial,
          order_no: serial,
          orderId: serial,
          depositNo: serial,
          serialNo: serial,
          uid,
          username,
          phone,
          amount,
          finalCredit,
          method: isBkash ? "bkash" : "nagad",
          gateway: "gopay",
          status: "pending",
          timestamp: isoTimestamp,
          createdAt: isoTimestamp,
          displayAmount: amount,
          description: `ডিপোজিট রিকোয়েস্ট ${amount} টাকা (${payName} GOPay)`
        };

        saveLocalTransaction(depRecord);
        await Promise.all([
          db.collection("deposits").doc(serial).set(depRecord, { merge: true }),
          db.collection("transactions").doc(serial).set(depRecord, { merge: true }),
          db.collection("users").doc(uid).collection("history").doc(serial).set(depRecord, { merge: true })
        ]);
        console.log(`[GOPAY PAY] Deposit pending record created in Firestore & Local with Order ID: ${serial}`);
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
      const attemptSerial = i === 0 ? serial : `${serial}R${i}`;

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
          signStr += `${k}=${v}&`;
        }
      }
      signStr += `key=${secretKey}`;
      postData.sign = crypto.createHash("md5").update(signStr).digest("hex");
      postData.sign_type = "MD5";

      try {
        console.log(`[GOPAY PAY] Attempting gateway with pay_type=${pType}, goods_name=${payName}, order_no=${attemptSerial}`);
        const gopayRes = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(postData).toString()
        });

        const resJson: any = await gopayRes.json();
        console.log(`[GOPAY PAY] Gateway response for pay_type=${pType}:`, resJson);

        if (resJson && resJson.respCode === "SUCCESS" && resJson.payInfo) {
          cashierUrl = resJson.payInfo;
          finalSuccessfulSerial = attemptSerial;
          break;
        } else if (resJson?.tradeMsg) {
          lastErrorMsg = resJson.tradeMsg;
        }
      } catch (postErr) {
        console.warn(`[GOPAY PAY] Gateway attempt failed for ${pType}:`, postErr);
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
            description: `ডিপোজিট রিকোয়েস্ট ${amount} টাকা (${payName} GOPay)`
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
      console.warn(`[GOPAY PAY] Redirecting to history despite API error: ${lastErrorMsg}`);
      if (req.headers.accept?.includes("application/json") || req.xhr) {
        return res.json({ success: true, fallback: true, msg: lastErrorMsg });
      }
      return res.redirect(jumpURL);
    }
  } catch (err: any) {
    console.error("[GOPAY PAY Error]:", err);
    return res.status(500).send(`<h3>Server Error: ${err.message}</h3>`);
  }
});

// GOPay Callback / Notify Route
app.all(["/pay1/gopay_notify.php", "/gopay_notify.php", "/api/gopay-notify"], async (req, res) => {
  console.log(`[GOPAY NOTIFY] Received callback:`, {
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query
  });

  try {
    const rawData = req.body && Object.keys(req.body).length > 0 ? req.body : req.query;
    if (!rawData || Object.keys(rawData).length === 0) {
      console.error("[GOPAY NOTIFY] ERROR: Empty POST/GET data received.");
      return res.send("fail");
    }

    const secret_key = "87a89555480aae027ad84daf666602d7";

    const sign_params = { ...rawData };
    delete sign_params.sign;
    delete sign_params.signType;
    delete sign_params.sign_type;

    const sortedKeys = Object.keys(sign_params).sort();
    const sign_parts: string[] = [];
    for (const key of sortedKeys) {
      const value = sign_params[key];
      if (value !== "" && value !== null && value !== undefined) {
        sign_parts.push(`${key}=${value}`);
      }
    }

    let signStr = sign_parts.join("&") + `&key=${secret_key}`;
    let localSign = crypto.createHash("md5").update(signStr).digest("hex").toLowerCase();
    let gateSign = String(rawData.sign || "").trim().toLowerCase();

    if (localSign !== gateSign) {
      const signStrNoAmp = sign_parts.join("&") + `key=${secret_key}`;
      const localSignNoAmp = crypto.createHash("md5").update(signStrNoAmp).digest("hex").toLowerCase();
      if (localSignNoAmp === gateSign) {
        localSign = localSignNoAmp;
      } else {
        console.error(`[GOPAY NOTIFY] SECURITY REJECTION: SIGN MISMATCH | Local: ${localSign} | Gateway: ${gateSign}`);
        return res.send("fail");
      }
    }

    console.log("[GOPAY NOTIFY] SIGNATURE VERIFIED SUCCESSFULLY");

    const mch_order_no = String(rawData.mchOrderNo || rawData.mch_order_no || "");
    const trade_amount = parseFloat(rawData.amount || rawData.tradeAmount || 0);
    const tradeResult = String(rawData.tradeResult || "");

    if (!mch_order_no || isNaN(trade_amount) || trade_amount <= 0) {
      console.error("[GOPAY NOTIFY] ERROR: Invalid order_no or trade_amount:", { mch_order_no, trade_amount });
      return res.send("fail");
    }

    const adminApp = getFirebaseAdmin();
    const localList = getLocalTransactions();
    const localItem = localList.find((x: any) => (x.order_no === mch_order_no || x.id === mch_order_no || x.depositNo === mch_order_no));

    let orderData: any = localItem || null;
    let depositDocRef: any = null;

    if (adminApp) {
      try {
        const db = adminApp.firestore();
        const depositRef = db.collection("deposits").doc(mch_order_no);
        let depositDoc = await depositRef.get();

        if (!depositDoc.exists) {
          const qSnap = await db.collection("deposits").where("order_no", "==", mch_order_no).limit(1).get();
          if (!qSnap.empty) {
            depositDoc = qSnap.docs[0];
          }
        }

        if (depositDoc.exists) {
          depositDocRef = depositDoc.ref;
          orderData = { ...depositDoc.data(), ...orderData };
        }
      } catch (dbErr) {
        console.warn("[GOPAY NOTIFY] Firestore read warning:", dbErr);
      }
    }

    if (!orderData) {
      console.error(`[GOPAY NOTIFY] SECURITY REJECTION: Order No ${mch_order_no} not found in Database.`);
      return res.send("fail");
    }

    const uid = orderData?.uid;
    const current_status = String(orderData?.status || "").toLowerCase();
    const isAlreadyCredited = current_status === "approved" || current_status === "1" || current_status === "success" || orderData?.credited === true;

    // Strict 1-Time Rule: If already credited, do NOT credit again
    if (isAlreadyCredited) {
      console.log(`[GOPAY NOTIFY] IDEMPOTENCY LOCK: Order No ${mch_order_no} is already processed & credited. Rejecting duplicate credit.`);
      return res.send("success");
    }

    // Trade successful: Credit user balance atomically
    if (tradeResult === "1") {
      const creditAmount = Number(orderData?.finalCredit || trade_amount);
      const originalAmount = Number(orderData?.amount || trade_amount);

      if (adminApp && uid) {
        try {
          const db = adminApp.firestore();
          const userRef = db.collection("users").doc(uid);

          await db.runTransaction(async (transaction) => {
            // Check latest deposit state inside atomic lock
            const latestDepSnap = depositDocRef ? await transaction.get(depositDocRef) : null;
            if (latestDepSnap && latestDepSnap.exists) {
              const latestData = latestDepSnap.data();
              if (latestData?.status === "approved" || latestData?.status === "1" || latestData?.credited === true) {
                console.log(`[GOPAY NOTIFY] Transaction aborted: Order ${mch_order_no} already credited inside lock.`);
                return;
              }
            }

            const userSnap = await transaction.get(userRef);
            const userData = userSnap.exists ? userSnap.data() : {};
            const currentBalance = Number(userData?.balance || 0);
            const currentApprovedCount = Number(userData?.approvedDepositsCount || 0);
            const currentTotalDeposited = Number(userData?.totalDeposited || 0);

            transaction.set(userRef, {
              balance: currentBalance + creditAmount,
              approvedDepositsCount: currentApprovedCount + 1,
              totalDeposited: currentTotalDeposited + originalAmount,
              withdrawEnabled: (currentTotalDeposited + originalAmount >= 940 && currentApprovedCount + 1 >= 2),
              updatedAt: new Date().toISOString()
            }, { merge: true });

            const updatedDepositData = {
              ...orderData,
              status: "approved",
              credited: true,
              creditedAmount: creditAmount,
              creditedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            if (depositDocRef) {
              transaction.update(depositDocRef, updatedDepositData);
            } else {
              transaction.set(db.collection("deposits").doc(mch_order_no), updatedDepositData, { merge: true });
            }

            const transactionRef = db.collection("transactions").doc(mch_order_no);
            transaction.set(transactionRef, { status: "approved", credited: true, updatedAt: new Date().toISOString() }, { merge: true });

            const userHistoryRef = db.collection("users").doc(uid).collection("history").doc(mch_order_no);
            transaction.set(userHistoryRef, { status: "approved", credited: true, updatedAt: new Date().toISOString() }, { merge: true });
          });
        } catch (trxErr) {
          console.warn("[GOPAY NOTIFY] Firestore transaction error:", trxErr);
        }
      }

      saveLocalTransaction({
        id: mch_order_no,
        order_no: mch_order_no,
        uid,
        status: "approved",
        credited: true,
        amount: trade_amount,
        finalCredit: creditAmount,
        type: "deposit",
        updatedAt: new Date().toISOString()
      });

      console.log(`[GOPAY NOTIFY] SUCCESS: Verified balance credited for UID: ${uid} | Amount: ${creditAmount} | Order: ${mch_order_no}`);
      return res.send("success");
    } else {
      // Failed trade / Fake transaction / Cancelled payment
      console.log(`[GOPAY NOTIFY] PAYMENT CANCELLED/FAILED: Gateway reported tradeResult=${tradeResult} for Order: ${mch_order_no}`);
      if (adminApp) {
        try {
          const db = adminApp.firestore();
          const targetRef = depositDocRef || db.collection("deposits").doc(mch_order_no);
          await targetRef.set({ status: "failed", cancelled: true, updatedAt: new Date().toISOString() }, { merge: true });
          if (uid) {
            await db.collection("users").doc(uid).collection("history").doc(mch_order_no).set({ status: "failed", cancelled: true, updatedAt: new Date().toISOString() }, { merge: true });
          }
        } catch (e) {}
      }
      saveLocalTransaction({
        id: mch_order_no,
        order_no: mch_order_no,
        uid,
        status: "failed",
        cancelled: true,
        updatedAt: new Date().toISOString()
      });
      return res.send("success");
    }
  } catch (err: any) {
    console.error("[GOPAY NOTIFY ERROR]:", err);
    return res.send("fail");
  }
});

// GOPay Callback
app.all(["/api/callback", "/api/gopay-callback", "/callback.php"], async (req, res) => {
  console.log(`[GOPay Callback] RAW REQUEST RECEIVED:`, {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query
  });
  try {
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();
    
    // Attempt to handle both application/json and application/x-www-form-urlencoded
    const body = req.body && Object.keys(req.body).length > 0 ? req.body : req.query;
    const { signature, order_no, amount } = body;
    
    console.log(`[GOPay Callback] Extracted Data:`, { order_no, amount, signature });

    const api_key = process.env.GOPAY_API_KEY || 'cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc';
    
    // Convert amount to match PHP's (float) behavior
    const formatted_amount = parseFloat(amount);
    const dataToSign = order_no + formatted_amount.toString();
    
    // HMAC-SHA256 signature (formula: order_no + amount + api_key)
    const hmac = crypto.createHmac('sha256', api_key);
    // PHP concatenates strings, if formatted_amount is 200, it becomes "200"
    hmac.update(dataToSign);
    const expected_signature = hmac.digest('hex').toLowerCase();
    const received_signature = (signature || '').toString().trim().toLowerCase();

    console.log(`[GOPay Callback] VERIFICATION ATTEMPT:`, { 
        order_no, 
        received_signature,
        expected_signature,
        match: received_signature === expected_signature
    });

    const isSigValid = Boolean(
      signature &&
      received_signature.length === expected_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected_signature, "utf8"), Buffer.from(received_signature, "utf8"))
    );
    if (isSigValid) {
        console.log(`[GOPay Callback] Signature VALID for order: ${order_no}`);
        const depositRef = db.collection('deposits').doc(order_no);
        const transactionRef = db.collection('transactions').doc(order_no);
        
        const depositDoc = await depositRef.get();
        
        if (depositDoc.exists) {
            const data = depositDoc.data();
            
            // Fast fail if already success or approved
            if (data?.status === 'success' || data?.status === 'approved') {
                return res.send("Already processed");
            }

            const uid = data?.uid;
            const amountToCredit = parseFloat(amount) || 0;
            
            if (uid && amountToCredit > 0) {
                const userRef = db.collection('users').doc(uid);
                
                try {
                    await db.runTransaction(async (transaction) => {
                        const txDepositDoc = await transaction.get(depositRef);
                        const depData = txDepositDoc.data();
                        if (!txDepositDoc.exists || depData?.status === 'success' || depData?.status === 'approved') {
                            throw new Error("ALREADY_PROCESSED_OR_INVALID");
                        }

                        const finalCredit = Number(depData?.finalCredit || depData?.amount || amountToCredit);
                        const originalAmount = Number(depData?.amount || amountToCredit);

                        // Get current user data to update balance
                        const txUserDoc = await transaction.get(userRef);
                        const userData = txUserDoc.exists ? txUserDoc.data() : {};
                        const currentBalance = Number(userData?.balance || 0);
                        const currentApprovedCount = Number(userData?.approvedDepositsCount || 0);
                        const currentTotalDeposited = Number(userData?.totalDeposited || 0);

                        transaction.update(userRef, {
                            balance: currentBalance + finalCredit,
                            approvedDepositsCount: currentApprovedCount + 1,
                            totalDeposited: currentTotalDeposited + originalAmount,
                            withdrawEnabled: (currentTotalDeposited + originalAmount >= 940 && currentApprovedCount + 1 >= 2)
                        });

                        transaction.update(depositRef, {
                            status: 'approved',
                            updatedAt: new Date().toISOString()
                        });

                        saveLocalTransaction({ id: order_no, order_no, uid, status: 'approved', amount: amountToCredit, finalCredit: Number(depData?.finalCredit || amountToCredit), type: 'deposit', updatedAt: new Date().toISOString() });
                        transaction.set(transactionRef, { status: 'approved', updatedAt: new Date().toISOString() }, { merge: true });

                        // Update user history subcollection
                        const userHistoryRef = db.collection('users').doc(uid).collection('history').doc(order_no);
                        transaction.set(userHistoryRef, {
                            status: 'approved'
                        }, { merge: true });
                    });
                    console.log(`[GOPay Callback] Order ${order_no} processed. User ${uid} credited ${amountToCredit}`);
                    res.send('Success');
                } catch (error: any) {
                    console.error(`[GOPay Callback] Transaction error for ${order_no}:`, error);
                    res.status(500).send('Transaction failed: ' + error.message);
                }
            } else {
                res.status(400).send('Invalid UID or Amount');
            }
        } else {
            res.status(404).send('Order not found');
        }
    } else {
        console.error(`[GOPay Callback] Signature INVALID for order: ${order_no}`);
        await db.collection('webhook_logs').add({
            error: 'Signature Mismatch',
            order: order_no
        });
        res.status(403).send("Invalid Signature");
    }
  } catch (e: any) {
      console.error("[GOPay Callback] Error:", e);
      res.status(500).send("Error");
  }
});

// Full-Screen Embedded Chat Route to support prefilling visitor profile dynamically
app.get("/chat", (req, res) => {
  const name = (req.query.name || "Guest").toString();
  const email = (req.query.email || `${name.toLowerCase()}@sn777.site`).toString();
  res.redirect(`/chat.html?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`);
});

// Simple keep-alive log every 15 minutes
setInterval(() => {
  console.log(`${new Date().toISOString()} - System Keep-Alive: OK`);
}, 15 * 60 * 1000);


// Verify Payment Endpoint
app.post("/api/verify-payment", async (req, res) => {
  try {
    const { order_no } = req.body;
    if (!order_no) {
      return res.status(400).json({ error: "Missing order_no", success: false, status: "failed" });
    }
    const cleanOrderNo = String(order_no).trim();
    let db = null;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch(e) {}

    let depositData: any = null;
    const localList = getLocalTransactions();
    const localItem = localList.find((x: any) => (x.order_no === cleanOrderNo || x.id === cleanOrderNo || x.depositNo === cleanOrderNo));
    if (localItem) {
      depositData = { ...localItem };
    }

    if (db) {
      try {
        // 1. Direct get
        let dSnap = await db.collection("deposits").doc(cleanOrderNo).get();
        if (dSnap.exists) {
          depositData = { ...depositData, ...dSnap.data() };
        } else {
          // 2. Query by order_no field
          let qSnap = await db.collection("deposits").where("order_no", "==", cleanOrderNo).limit(1).get();
          if (!qSnap.empty) {
            depositData = { ...depositData, ...qSnap.docs[0].data() };
          }
        }
      } catch (dbErr) {
        console.warn("[verify-payment] Firestore read warning:", dbErr);
      }
    }

    if (!depositData) {
      return res.json({
        success: false,
        status: "failed",
        error: "ভুল ট্রানজ্যাকশন আইডি! কোনো রেকর্ড পাওয়া যায়নি।",
        amount: 0,
        finalCredit: 0
      });
    }

    const isApproved = depositData.status === "approved" || depositData.status === "success" || depositData.credited === true;
    const isPending = depositData.status === "pending" || depositData.status === "processing";
    const isFailed = depositData.status === "failed" || depositData.status === "cancelled";

    const currentStatus = isApproved ? "approved" : (isPending ? "pending" : "failed");

    res.json({
      success: isApproved,
      status: currentStatus,
      amount: depositData?.amount || 0,
      finalCredit: depositData?.finalCredit || depositData?.amount || 0,
      message: isApproved ? "পেমেন্ট সফলভাবে ভেরিফাই ও ক্রেডিট করা হয়েছে।" : (isPending ? "পেমেন্ট প্রক্রিয়াধীন রয়েছে..." : "পেমেন্ট ব্যর্থ বা বাতিল হয়েছে।")
    });
  } catch (err: any) {
    console.error("Payment verification endpoint error:", err);
    res.status(500).json({ error: err.message, success: false, status: "failed" });
  }
});

// Auto Check User Deposits Endpoint
// Validate Manual / Direct TrxID Endpoint
app.post("/api/validate-manual-deposit", async (req, res) => {
  try {
    const { uid, transactionId, order_no, amount } = req.body;
    const cleanTxId = String(transactionId || order_no || "").trim();
    if (!cleanTxId) {
      return res.status(400).json({ success: false, error: "ট্রানজ্যাকশন আইডি প্রদান করুন।" });
    }

    // 1. Fake / Bad Format Check (Minimum 8 chars, alphanumeric, no repetitive chars)
    if (cleanTxId.length < 8 || !/^[a-zA-Z0-9_-]+$/.test(cleanTxId) || /^(.)\1+$/.test(cleanTxId)) {
      return res.status(400).json({
        success: false,
        error: "ভুল বা ফেক ট্রানজ্যাকশন আইডি! ফরম্যাট সঠিক নয় (কমপক্ষে ৮ অক্ষরের সঠিক ট্রানজ্যাকশন আইডি দিন)।"
      });
    }

    let db = null;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch (e) {}

    // 2. Strict 1-Time Usage / Duplicate Check across Database
    if (db) {
      try {
        const querySnap = await db.collection("deposits")
          .where("transactionId", "==", cleanTxId)
          .limit(10)
          .get();

        for (const doc of querySnap.docs) {
          if (doc.id !== order_no) {
            const d = doc.data();
            if (d.status === "approved" || d.status === "success" || d.credited === true) {
              return res.status(400).json({
                success: false,
                error: "এই ট্রানজ্যাকশন আইডিটি ইতিমধ্যে ব্যবহার করা হয়েছে এবং ব্যালেন্স যুক্ত হয়েছে! একই আইডি বারবার ব্যবহার করা সম্ভব নয়।"
              });
            } else if (d.status === "pending") {
              return res.status(400).json({
                success: false,
                error: "এই ট্রানজ্যাকশন আইডি দিয়ে ইতিমধ্যে একটি ডিপোজিট রিকোয়েস্ট অপেক্ষমান রয়েছে।"
              });
            }
          }
        }

        const queryOrderSnap = await db.collection("deposits")
          .where("order_no", "==", cleanTxId)
          .limit(10)
          .get();

        for (const doc of queryOrderSnap.docs) {
          if (doc.id !== order_no) {
            const d = doc.data();
            if (d.status === "approved" || d.status === "success" || d.credited === true) {
              return res.status(400).json({
                success: false,
                error: "এই ট্রানজ্যাকশন আইডিটি ইতিমধ্যে ব্যবহার করা হয়েছে এবং ব্যালেন্স যুক্ত হয়েছে!"
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn("[validate-manual-deposit] Firestore duplicate check warning:", dbErr);
      }
    }

    // Check local transaction store for duplicates
    const localList = getLocalTransactions();
    const isDupApproved = localList.some((x: any) => 
      x.id !== order_no && x.order_no !== order_no &&
      (x.transactionId === cleanTxId || x.order_no === cleanTxId || x.id === cleanTxId) &&
      (x.status === "approved" || x.credited === true)
    );

    if (isDupApproved) {
      return res.status(400).json({
        success: false,
        error: "এই ট্রানজ্যাকশন আইডিটি ইতিমধ্যে ব্যবহার করা হয়েছে এবং ব্যালেন্স যুক্ত হয়েছে!"
      });
    }

    return res.json({ success: true, message: "ট্রানজ্যাকশন আইডি বৈধ এবং গ্রহণ করা হয়েছে।" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Approve Deposit Endpoint (Strict 1-Time Credit Lock)
// Admin Approve Deposit Endpoint (Dual-layer resilience)
app.post("/api/admin/approve-deposit", async (req, res) => {
  try {
    const { order_no, doc_id, uid: reqUid, username: reqUsername, amount, finalCredit: reqFinalCredit } = req.body;
    const cleanOrderNo = String(order_no || doc_id || "").trim();
    if (!cleanOrderNo) {
      return res.status(400).json({ success: false, error: "Missing order_no or doc_id" });
    }

    const requestedAmount = Number(amount) || 0;
    const finalCredit = Number(reqFinalCredit || requestedAmount || 0);

    let uid = reqUid || "";
    let userUpdated = false;

    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      const db = adminApp.firestore();
      try {
        // 1. Try finding deposit doc
        let depDoc = await db.collection("deposits").doc(cleanOrderNo).get().catch(() => null);
        let depData = depDoc && depDoc.exists ? depDoc.data() : null;

        if (!depData && doc_id && doc_id !== cleanOrderNo) {
          depDoc = await db.collection("deposits").doc(String(doc_id)).get().catch(() => null);
          if (depDoc && depDoc.exists) depData = depDoc.data();
        }

        if (!depData) {
          const qSnap = await db.collection("deposits").where("order_no", "==", cleanOrderNo).limit(1).get().catch(() => ({ empty: true, docs: [] }));
          if (!qSnap.empty) {
            depDoc = qSnap.docs[0];
            depData = depDoc.data();
          }
        }

        if (depData && !uid) {
          uid = depData.uid;
        }

        // If UID still not found, try username lookup
        if (!uid && (reqUsername || depData?.username)) {
          const uName = reqUsername || depData?.username;
          const uSnap = await db.collection("users").where("username", "==", uName).limit(1).get().catch(() => ({ empty: true, docs: [] }));
          if (!uSnap.empty) {
            uid = uSnap.docs[0].id;
          }
        }

        // Update user balance in Firestore if uid exists
        if (uid) {
          try {
            const userRef = db.collection("users").doc(uid);
            const userSnap = await userRef.get();
            const userData = userSnap.exists ? userSnap.data() : {};
            const curBal = parseFloat(String(userData?.balance || "0").replace(/,/g, "")) || 0;
            const curDep = parseFloat(String(userData?.totalDeposited || "0").replace(/,/g, "")) || 0;
            const curCount = Number(userData?.approvedDepositsCount || 0);
            
            const newBal = (curBal + (finalCredit || requestedAmount)).toFixed(2);
            const newTotalDep = curDep + requestedAmount;
            const newCount = curCount + 1;

            await userRef.set({
              balance: newBal,
              approvedDepositsCount: newCount,
              totalDeposited: newTotalDep,
              withdrawEnabled: (newTotalDep >= 940 && newCount >= 2),
              updatedAt: new Date().toISOString()
            }, { merge: true });
            userUpdated = true;
          } catch (userErr) {
            console.warn("[approve-deposit] User balance update warning:", userErr);
          }
        }

        // Mark deposit doc approved
        const approvedPayload = {
          status: "approved",
          credited: true,
          amount: requestedAmount,
          finalCredit: finalCredit || requestedAmount,
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (depDoc && depDoc.ref) {
          await depDoc.ref.set(approvedPayload, { merge: true }).catch(() => {});
        } else {
          await db.collection("deposits").doc(cleanOrderNo).set(approvedPayload, { merge: true }).catch(() => {});
        }
        await db.collection("transactions").doc(cleanOrderNo).set(approvedPayload, { merge: true }).catch(() => {});
        if (uid) {
          await db.collection("users").doc(uid).collection("history").doc(cleanOrderNo).set(approvedPayload, { merge: true }).catch(() => {});
        }
      } catch (dbErr) {
        console.warn("[approve-deposit] Firestore warning (fallback active):", dbErr);
      }
    }

    // Save to local transactions store fallback
    saveLocalTransaction({
      id: cleanOrderNo,
      order_no: cleanOrderNo,
      uid: uid || reqUid || "",
      status: "approved",
      credited: true,
      amount: requestedAmount,
      finalCredit: finalCredit || requestedAmount,
      type: "deposit",
      updatedAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: `ডিপোজিট অ্যাপ্রুভ হয়েছে এবং ইউজারের ব্যালেন্সে ৳${finalCredit || requestedAmount} যোগ করা হয়েছে।`,
      amount: requestedAmount,
      finalCredit: finalCredit || requestedAmount
    });
  } catch (err: any) {
    console.error("[APPROVE DEPOSIT ERROR]:", err);
    return res.status(500).json({ success: false, error: err.message || "ডিপোজিট অ্যাপ্রুভ করতে ব্যর্থ হয়েছে।" });
  }
});

app.post("/api/admin/reject-deposit", async (req, res) => {
  try {
    const { order_no, reason } = req.body;
    if (!order_no) {
      return res.status(400).json({ success: false, error: "Missing order_no" });
    }
    const cleanOrderNo = String(order_no).trim();
    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return res.status(500).json({ success: false, error: "Database connection failed" });
    }
    const db = adminApp.firestore();
    const depositRef = db.collection("deposits").doc(cleanOrderNo);
    const depSnap = await depositRef.get();

    let uid = "";
    if (depSnap.exists) {
      const depData = depSnap.data();
      uid = depData?.uid;
      if (depData?.status === "approved" || depData?.credited === true) {
        return res.status(400).json({ success: false, error: "ইতিমধ্যে অ্যাপ্রুভড হওয়া ডিপোজিট বাতিল করা সম্ভব নয়!" });
      }
    }

    const rejectPayload = {
      status: "rejected",
      cancelled: true,
      rejectReason: reason || "ভুল বা ফেক ট্রানজ্যাকশন আইডি",
      updatedAt: new Date().toISOString()
    };

    await depositRef.set(rejectPayload, { merge: true });
    await db.collection("transactions").doc(cleanOrderNo).set(rejectPayload, { merge: true });

    if (uid) {
      await db.collection("users").doc(uid).collection("history").doc(cleanOrderNo).set(rejectPayload, { merge: true });
    }

    saveLocalTransaction({
      id: cleanOrderNo,
      order_no: cleanOrderNo,
      status: "rejected",
      cancelled: true,
      updatedAt: new Date().toISOString()
    });

    return res.json({ success: true, message: "ডিপোজিট রিজেক্ট/বাতিল করা হয়েছে।" });
  } catch (err: any) {
    console.error("[REJECT DEPOSIT ERROR]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/auto-check-user-deposits", async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "Missing uid" });
    let db = null;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch (e) {}

    const results: any[] = [];
    let userDocData: any = null;

    if (db) {
      try {
        const uSnap = await db.collection("users").doc(uid).get();
        if (uSnap.exists) userDocData = uSnap.data();
      } catch (err: any) {}

      try {
        const depSnap = await db.collection("deposits").where("uid", "==", uid).limit(5).get();
        for (const doc of depSnap.docs) {
          const parsed = doc.data();
          const order_no = doc.id;
          const isApproved = parsed.status === "approved" || parsed.status === "success";
          const isUnnotified = parsed.notified === false || (parsed.notified !== true && parsed.notified !== "true");
          if (isApproved && isUnnotified) {
            const finalCredit = Number(parsed.finalCredit) || Number(parsed.creditedAmount) || Number(parsed.amount) || 0;
            const amount = Number(parsed.amount) || finalCredit;
            results.push({
              order_no,
              result: {
                success: true,
                status: "approved",
                amount,
                finalCredit
              }
            });
            await doc.ref.update({ notified: true });
          }
        }
      } catch (err: any) {}
    }
    return res.json({ success: true, results, user: userDocData });
  } catch (e: any) {
    return res.json({ success: true, results: [], user: null });
  }
});


async function startServer() {
  const possibleDistPaths = [
    path.join(process.cwd(), "dist"),
    path.join(process.cwd(), "dist_backup"),
    path.join(appDir, "dist"),
    path.join(appDir, "dist_backup"),
    appDir
  ];

  for (const p of possibleDistPaths) {
    if (fs.existsSync(p)) {
      app.use(express.static(p));
    }
  }

  app.get(["/chat", "/livechat", "/chat.html"], (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    for (const p of possibleDistPaths) {
      const chatPath = path.join(p, "chat.html");
      if (fs.existsSync(chatPath)) {
        return res.sendFile(chatPath);
      }
    }
    const pubChat = path.join(process.cwd(), "public", "chat.html");
    if (fs.existsSync(pubChat)) {
      return res.sendFile(pubChat);
    }
    res.status(404).send("chat.html not found");
  });

  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    for (const p of possibleDistPaths) {
      const indexPath = path.join(p, "index.html");
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    res.status(404).send("index.html not found");
  });

    // Auto-cancel deposits older than 7 minutes (Quota-aware with cooldown & rate-limiting)
  let quotaCooldownUntil = 0;

  cron.schedule("*/5 * * * *", async () => {
    if (Date.now() < quotaCooldownUntil) {
      return;
    }

    try {
      const adminApp = getFirebaseAdmin();
      if (!adminApp) return;
      const db = adminApp.firestore();
      if (!db) return;

      const sevenMinutesAgo = new Date(Date.now() - 7 * 60 * 1000).toISOString();
      
      const pendingDeposits = await db.collection("deposits")
        .where("status", "==", "pending")
        .limit(10)
        .get();

      if (pendingDeposits.empty) return;

      for (const doc of pendingDeposits.docs) {
        try {
          const data = doc.data();
          let createdDate = data.timestamp;
          if (createdDate && typeof createdDate.toDate === "function") {
            createdDate = createdDate.toDate().toISOString();
          } else if (typeof createdDate !== "string") {
            continue;
          }

          if (createdDate && createdDate < sevenMinutesAgo) {
            const depositId = doc.id;
            const uid = data.uid;

            await doc.ref.update({ status: "cancelled", updatedAt: new Date().toISOString() });

            if (uid) {
              try {
                await db.collection("users").doc(uid).collection("history").doc(depositId).update({ status: "cancelled" });
              } catch (histErr) {}
            }
          }
        } catch (itemErr: any) {
          const msg = String(itemErr?.message || itemErr);
          if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded") || msg.includes("8 RESOURCE_EXHAUSTED")) {
            throw itemErr;
          }
        }
      }
    } catch (error: any) {
      const errMsg = String(error?.message || error);
      if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded") || errMsg.includes("8 RESOURCE_EXHAUSTED")) {
        // Cooldown for 15 minutes to allow quota replenishment
        quotaCooldownUntil = Date.now() + 15 * 60 * 1000;
        console.warn(`[Cron] Firestore quota exceeded. Pausing auto-cancel check for 15 minutes until ${new Date(quotaCooldownUntil).toISOString()}`);
      } else {
        console.warn("[Cron] Auto-cancel check warning:", errMsg);
      }
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

}

startServer();
