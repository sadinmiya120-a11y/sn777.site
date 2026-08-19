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


// --- ProPay Integration ---
app.post("/api/create-payment", async (req, res) => {
  try {
    const { uid, amount, method } = req.body;
    if (!uid || !amount || !method) return res.status(400).json({ error: "Missing parameters" });

    const order_no = 'ORD-' + Date.now();
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();

    // Create pending deposit
    await db.collection('deposits').doc(order_no).set({
        uid,
        amount: parseFloat(amount),
        method,
        status: 'pending',
        createdAt: new Date().toISOString(),
        order_no
    });

    const gateway_url = (method === 'bkash') 
               ? 'https://checkout.propay.cyou/pay/Bkash.php' 
               : 'https://checkout.propay.cyou/pay/Nagad.php';

    const params = new URLSearchParams({
        api_key: process.env.PROPAY_API_KEY!,
        uid: uid,
        amount: amount.toString(),
        order_no: order_no,
        return_url: `${process.env.APP_URL}/success`,
        pass_through_callback_url: `${process.env.APP_URL}/api/callback`
    });

    res.json({ redirect_url: `${gateway_url}?${params.toString()}` });
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

// ProPay Callback
app.post(["/api/callback", "/api/propay-callback", "/callback.php"], async (req, res) => {
  console.log(`[ProPay Callback] RAW REQUEST RECEIVED:`, {
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
    
    console.log(`[ProPay Callback] Extracted Data:`, { order_no, amount, signature });

    const api_key = process.env.PROPAY_API_KEY || 'cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc';
    
    // Convert amount to match PHP's (float) behavior
    const formatted_amount = parseFloat(amount);
    const dataToSign = order_no + formatted_amount.toString();
    
    // HMAC-SHA256 signature (formula: order_no + amount + api_key)
    const hmac = crypto.createHmac('sha256', api_key);
    // PHP concatenates strings, if formatted_amount is 200, it becomes "200"
    hmac.update(dataToSign);
    const expected_signature = hmac.digest('hex').toLowerCase();
    const received_signature = (signature || '').toString().trim().toLowerCase();

    console.log(`[ProPay Callback] VERIFICATION ATTEMPT:`, { 
        order_no, 
        received_signature,
        expected_signature,
        match: received_signature === expected_signature
    });

    if (signature && crypto.timingSafeEqual(Buffer.from(expected_signature), Buffer.from(received_signature))) {
        console.log(`[ProPay Callback] Signature VALID for order: ${order_no}`);
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

                        transaction.update(transactionRef, {
                            status: 'approved',
                            updatedAt: new Date().toISOString()
                        });

                        // Update user history subcollection
                        const userHistoryRef = db.collection('users').doc(uid).collection('history').doc(order_no);
                        transaction.set(userHistoryRef, {
                            status: 'approved'
                        }, { merge: true });
                    });
                    console.log(`[ProPay Callback] Order ${order_no} processed. User ${uid} credited ${amountToCredit}`);
                    res.send('Success');
                } catch (error: any) {
                    console.error(`[ProPay Callback] Transaction error for ${order_no}:`, error);
                    res.status(500).send('Transaction failed: ' + error.message);
                }
            } else {
                res.status(400).send('Invalid UID or Amount');
            }
        } else {
            res.status(404).send('Order not found');
        }
    } else {
        console.error(`[ProPay Callback] Signature INVALID for order: ${order_no}`);
        await db.collection('webhook_logs').add({
            error: 'Signature Mismatch',
            order: order_no
        });
        res.status(403).send("Invalid Signature");
    }
  } catch (e: any) {
      console.error(e);
      res.status(500).send("Error");
  }
});

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

// Full-Screen Embedded Chat Route to support prefilling visitor profile dynamically
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
    <!-- DNS and Connection preloading for maximum loading speed -->
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

    <!-- Start of Tawk.to Script -->
    <script type="text/javascript">
        var Tawk_API = Tawk_API || {};
        var Tawk_LoadStart = new Date();
        
        // Define visitor attributes on initialize to guarantee they are passed during handshake
        Tawk_API.visitor = {
            name: ${JSON.stringify(name)},
            email: ${JSON.stringify(email)}
        };

        // Render widget inline in our full-screen container
        Tawk_API.embedded = 'tawk_chat_container';

        Tawk_API.onLoad = function() {
            // Hide the loader once Tawk loads
            var loader = document.getElementById('loader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(function() {
                    loader.style.display = 'none';
                }, 500);
            }
        };
        
        // Safety timeout to hide loader if loading takes too long or script fails
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
    <!-- End of Tawk.to Script -->
</body>
</html>
  `);
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
      return res.status(400).json({ error: "Missing order_no" });
    }
    const cleanOrderNo = String(order_no).trim();
    let db = null;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch(e) {}

    let depositData = null;
    let docRef = null;

    if (db) {
      // 1. Direct get
      let dSnap = await db.collection("deposits").doc(cleanOrderNo).get();
      if (dSnap.exists) {
        depositData = dSnap.data();
        docRef = dSnap.ref;
      } else {
        // 2. Query by order_no field
        let qSnap = await db.collection("deposits").where("order_no", "==", cleanOrderNo).limit(1).get();
        if (!qSnap.empty) {
          depositData = qSnap.docs[0].data();
          docRef = qSnap.docs[0].ref;
        }
      }

      if (depositData && depositData.status === "pending") {
        // Auto approve if valid
        const uid = depositData.uid;
        const amount = Number(depositData.finalCredit || depositData.amount || 0);
        await docRef.update({ status: "approved", updatedAt: new Date().toISOString() });
        if (uid && amount > 0) {
          const userRef = db.collection("users").doc(uid);
          const uSnap = await userRef.get();
          if (uSnap.exists) {
            const uData = uSnap.data();
            const currentBal = Number(uData.balance || 0);
            const totalDep = Number(uData.totalDeposited || 0);
            const depCount = Number(uData.approvedDepositsCount || 0);
            await userRef.update({
              balance: (currentBal + amount).toFixed(2),
              totalDeposited: (totalDep + amount).toFixed(2),
              approvedDepositsCount: depCount + 1,
              updatedAt: new Date().toISOString()
            });
          }
        }
        depositData.status = "approved";
      }
    }

    res.json({
      success: depositData?.status === "approved" || depositData?.status === "success",
      status: depositData?.status || "approved",
      amount: depositData?.amount || 0,
      finalCredit: depositData?.finalCredit || depositData?.amount || 0
    });
  } catch (err: any) {
    console.error("Payment verification endpoint error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Auto Check User Deposits Endpoint
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

  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    for (const p of possibleDistPaths) {
      const indexPath = path.join(p, "index.html");
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    res.status(404).send("index.html not found");
  });

  // Auto-cancel deposits older than 7 minutes
  cron.schedule('* * * * *', async () => {
    console.log('[Cron] Running auto-cancel check for pending deposits');
    const db = getFirebaseAdmin().firestore();
    const sevenMinutesAgo = new Date(Date.now() - 7 * 60 * 1000).toISOString();
    
    try {
        const pendingDeposits = await db.collection('deposits')
            .where('status', '==', 'pending')
            .get();
        
        console.log(`[Cron] Found ${pendingDeposits.docs.length} pending deposits`);

        for (const doc of pendingDeposits.docs) {
            const data = doc.data();
            console.log(`[Cron] Debug: Deposit ${doc.id} status: ${data.status}, timestamp type: ${typeof data.timestamp}`);
            let createdDate = data.timestamp;
            if (createdDate && typeof createdDate.toDate === 'function') {
                createdDate = createdDate.toDate().toISOString();
            } else if (createdDate && typeof createdDate === 'string') {
                // Already string, nothing to do
            } else {
                console.log(`[Cron] Debug: Deposit ${doc.id} has no valid timestamp`);
                continue;
            }
            
            console.log(`[Cron] Deposit ${doc.id} timestamp: ${createdDate}, Threshold: ${sevenMinutesAgo}`);

            if (createdDate && createdDate < sevenMinutesAgo) {
                const depositId = doc.id;
                const uid = data.uid;

                // 1. Update deposits document
                await doc.ref.update({ status: 'cancelled' });
                console.log(`[Cron] Auto-cancelled deposits/${depositId}`);

                // 2. Update transactions document
                try {
                    await db.collection('transactions').doc(depositId).update({ status: 'cancelled' });
                    console.log(`[Cron] Auto-cancelled transactions/${depositId}`);
                } catch (txErr: any) {
                    console.log(`[Cron] Transactions doc ${depositId} could not be updated:`, txErr.message);
                }

                // 3. Update users/{uid}/history/{depositId} document if uid exists
                if (uid) {
                    try {
                        await db.collection('users').doc(uid).collection('history').doc(depositId).update({ status: 'cancelled' });
                        console.log(`[Cron] Auto-cancelled users/${uid}/history/${depositId}`);
                    } catch (histErr: any) {
                        console.log(`[Cron] History doc for user ${uid}, deposit ${depositId} could not be updated:`, histErr.message);
                    }
                }
            }
        }
    } catch (error) {
        console.error('[Cron] Error running auto-cancel check:', error);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

}

startServer();
