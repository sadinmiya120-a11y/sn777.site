var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_cors = __toESM(require("cors"), 1);
var import_path = __toESM(require("path"), 1);
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_node_cron = __toESM(require("node-cron"), 1);
var import_multer = __toESM(require("multer"), 1);
var upload = (0, import_multer.default)();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use((req, res, next) => {
  console.log(`${(/* @__PURE__ */ new Date()).toISOString()} - ${req.method} ${req.url}`);
  next();
});
app.use((0, import_cors.default)());
app.use(import_express.default.json());
app.use(import_express.default.urlencoded({ extended: true }));
function getFirebaseAdmin() {
  if (import_firebase_admin.default.apps.length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}");
    try {
      import_firebase_admin.default.initializeApp({
        credential: import_firebase_admin.default.credential.cert(serviceAccount)
      });
    } catch (e) {
      console.error("Firebase Admin init error:", e);
    }
  }
  return import_firebase_admin.default;
}
app.all("/api/auth-proxy/:host/*", async (req, res) => {
  try {
    const { host } = req.params;
    const urlParts = req.url.split(`/api/auth-proxy/${host}/`);
    const pathAndQuery = urlParts[1] || "";
    const targetUrl = `https://${host}/${pathAndQuery}`;
    console.log(`[Auth Proxy] Forwarding request to: ${targetUrl}`);
    const headers = {
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
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body) : void 0
    });
    const bodyText = await response.text();
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!["content-encoding", "transfer-encoding", "connection", "content-security-policy", "access-control-allow-origin"].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    res.send(bodyText);
  } catch (err) {
    console.error("[Auth Proxy Error]:", err);
    res.status(500).json({ error: "Auth Proxy failed", message: err.message });
  }
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
      return res.status(400).json({ error: "\u0987\u0989\u099C\u09BE\u09B0\u09A8\u09C7\u09AE \u098F\u09AC\u0982 \u09AB\u09CB\u09A8 \u09A8\u09BE\u09AE\u09CD\u09AC\u09BE\u09B0 \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE!" });
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
    } catch (e) {
      console.error(`Error updating user: ${e.message}`);
      throw e;
    }
    res.json({ success: true, message: "Password updated successfully!", email: userRec?.email });
  } catch (err) {
    console.error("Password reset error:", err);
    console.error("Error stack:", err.stack);
    if (err.message.includes("FIREBASE_SERVICE_ACCOUNT_KEY")) {
      return res.status(500).json({ error: "\u09B8\u09BF\u09B8\u09CD\u099F\u09C7\u09AE\u099F\u09BF \u09B8\u0995\u09CD\u09B0\u09BF\u09DF \u0995\u09B0\u09A4\u09C7 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09B8\u09C7\u099F\u09BF\u0982\u09B8 \u09A5\u09C7\u0995\u09C7 Service Account Key \u099F\u09BF \u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09C1\u09A8\u0964" });
    }
    res.status(500).json({ error: "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8 \u0995\u09B0\u09A4\u09C7 \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE \u09B9\u099A\u09CD\u099B\u09C7\u0964 \u09AA\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09C1\u09A8\u0964" });
  }
});
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
  } catch (err) {
    console.error("Username update error:", err);
    res.status(500).json({ error: "\u0987\u0989\u099C\u09BE\u09B0\u09A8\u09C7\u09AE \u0986\u09AA\u09A1\u09C7\u099F \u0995\u09B0\u09A4\u09C7 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7: " + err.message });
  }
});
app.post("/api/create-payment", async (req, res) => {
  try {
    const { uid, amount, method } = req.body;
    if (!uid || !amount || !method) return res.status(400).json({ error: "Missing parameters" });
    const order_no = "ORD-" + Date.now();
    const adminApp = getFirebaseAdmin();
    const db = adminApp.firestore();
    await db.collection("deposits").doc(order_no).set({
      uid,
      amount: parseFloat(amount),
      method,
      status: "pending",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      order_no
    });
    const gateway_url = method === "bkash" ? "https://checkout.gopay.cyou/pay/Bkash.php" : "https://checkout.gopay.cyou/pay/Nagad.php";
    const params = new URLSearchParams({
      api_key: process.env.GOPAY_API_KEY,
      uid,
      amount: amount.toString(),
      order_no,
      return_url: `${process.env.APP_URL}/success`,
      pass_through_callback_url: `${process.env.APP_URL}/api/callback`
    });
    res.json({ redirect_url: `${gateway_url}?${params.toString()}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/update-auth", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const { uid, newUsername, newPassword, newPhone } = req.body;
    console.log(`DEBUG: /api/update-auth request body:`, { uid, newUsername, newPassword, newPhone });
    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }
    const authUpdate = {};
    const firestoreUpdate = {};
    if (newPassword) {
      console.log(`DEBUG: New password length: ${newPassword.length}`);
    }
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
        } catch (authErr) {
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
            } catch (createErr) {
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
          await new Promise((resolve) => setTimeout(resolve, 1e3));
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
      } catch (authErr) {
        if (authErr.code === "auth/user-not-found") {
          console.log(`[update-auth] User not found for other fields update. Re-creating auth record for uid: ${uid}`);
          const targetEmail = otherAuthUpdate.email || dbEmail || `${(dbUsername || uid).toLowerCase().replace(/\s+/g, "")}@sn777.com`;
          const targetPassword = newPassword || (userDoc.exists ? userDoc.data()?.password : void 0) || "123456";
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
  } catch (err) {
    console.error("Auth update error:", err);
    res.status(500).json({ error: "\u09AA\u09CD\u09B0\u09CB\u09AB\u09BE\u0987\u09B2 \u0986\u09AA\u09A1\u09C7\u099F \u0995\u09B0\u09A4\u09C7 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7: " + err.message });
  }
});
app.get("/api/debug-users", async (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    const username = req.query.username;
    let authUser = null;
    try {
      if (username) {
        authUser = await adminApp.auth().getUserByEmail(`${username.toLowerCase().replace(/\s+/g, "")}@sn777.com`);
      } else {
        return res.json({ error: "provide username" });
      }
    } catch (e) {
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
  } catch (e) {
    res.json({ error: e.message });
  }
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
app.get("/api/debug-project", (req, res) => {
  try {
    const adminApp = getFirebaseAdmin();
    res.json({ projectId: adminApp.app().options.projectId });
  } catch (e) {
    res.json({ error: e.message });
  }
});
app.post(["/api/callback", "/api/gopay-callback", "/callback.php"], async (req, res) => {
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
    const body = req.body && Object.keys(req.body).length > 0 ? req.body : req.query;
    const { signature, order_no, amount } = body;
    console.log(`[GOPay Callback] Extracted Data:`, { order_no, amount, signature });
    const api_key = process.env.GOPAY_API_KEY || "cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc";
    const formatted_amount = parseFloat(amount);
    const dataToSign = order_no + formatted_amount.toString();
    const hmac = import_crypto.default.createHmac("sha256", api_key);
    hmac.update(dataToSign);
    const expected_signature = hmac.digest("hex").toLowerCase();
    const received_signature = (signature || "").toString().trim().toLowerCase();
    console.log(`[GOPay Callback] VERIFICATION ATTEMPT:`, {
      order_no,
      received_signature,
      expected_signature,
      match: received_signature === expected_signature
    });
    if (signature && import_crypto.default.timingSafeEqual(Buffer.from(expected_signature), Buffer.from(received_signature))) {
      console.log(`[GOPay Callback] Signature VALID for order: ${order_no}`);
      const depositRef = db.collection("deposits").doc(order_no);
      const transactionRef = db.collection("transactions").doc(order_no);
      const depositDoc = await depositRef.get();
      if (depositDoc.exists) {
        const data = depositDoc.data();
        if (data?.status === "success" || data?.status === "approved") {
          return res.send("Already processed");
        }
        const uid = data?.uid;
        const amountToCredit = parseFloat(amount) || 0;
        if (uid && amountToCredit > 0) {
          const userRef = db.collection("users").doc(uid);
          try {
            await db.runTransaction(async (transaction) => {
              const txDepositDoc = await transaction.get(depositRef);
              const depData = txDepositDoc.data();
              if (!txDepositDoc.exists || depData?.status === "success" || depData?.status === "approved") {
                throw new Error("ALREADY_PROCESSED_OR_INVALID");
              }
              const finalCredit = Number(depData?.finalCredit || depData?.amount || amountToCredit);
              const originalAmount = Number(depData?.amount || amountToCredit);
              const txUserDoc = await transaction.get(userRef);
              const userData = txUserDoc.exists ? txUserDoc.data() : {};
              const currentBalance = Number(userData?.balance || 0);
              const currentApprovedCount = Number(userData?.approvedDepositsCount || 0);
              const currentTotalDeposited = Number(userData?.totalDeposited || 0);
              transaction.update(userRef, {
                balance: currentBalance + finalCredit,
                approvedDepositsCount: currentApprovedCount + 1,
                totalDeposited: currentTotalDeposited + originalAmount,
                withdrawEnabled: currentTotalDeposited + originalAmount >= 940 && currentApprovedCount + 1 >= 2
              });
              transaction.update(depositRef, {
                status: "approved",
                updatedAt: (/* @__PURE__ */ new Date()).toISOString()
              });
              transaction.update(transactionRef, {
                status: "approved",
                updatedAt: (/* @__PURE__ */ new Date()).toISOString()
              });
              const userHistoryRef = db.collection("users").doc(uid).collection("history").doc(order_no);
              transaction.set(userHistoryRef, {
                status: "approved"
              }, { merge: true });
            });
            console.log(`[GOPay Callback] Order ${order_no} processed. User ${uid} credited ${amountToCredit}`);
            res.send("Success");
          } catch (error) {
            console.error(`[GOPay Callback] Transaction error for ${order_no}:`, error);
            res.status(500).send("Transaction failed: " + error.message);
          }
        } else {
          res.status(400).send("Invalid UID or Amount");
        }
      } else {
        res.status(404).send("Order not found");
      }
    } else {
      console.error(`[GOPay Callback] Signature INVALID for order: ${order_no}`);
      await db.collection("webhook_logs").add({
        error: "Signature Mismatch",
        order: order_no
      });
      res.status(403).send("Invalid Signature");
    }
  } catch (e) {
    console.error(e);
    res.status(500).send("Error");
  }
});
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});
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
        <p>\u09B8\u09BE\u09AA\u09CB\u09B0\u09CD\u099F \u099A\u09CD\u09AF\u09BE\u099F \u0995\u09BE\u09A8\u09C7\u0995\u09CD\u099F \u09B9\u099A\u09CD\u099B\u09C7, \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u0985\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8...</p>
        <p style="font-size: 12px; color: #64748b;">\u0987\u0989\u099C\u09BE\u09B0\u09A8\u09C7\u09AE: <strong>${name}</strong></p>
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
setInterval(() => {
  console.log(`${(/* @__PURE__ */ new Date()).toISOString()} - System Keep-Alive: OK`);
}, 15 * 60 * 1e3);
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  import_node_cron.default.schedule("* * * * *", async () => {
    console.log("[Cron] Running auto-cancel check for pending deposits");
    const db = getFirebaseAdmin().firestore();
    const sevenMinutesAgo = new Date(Date.now() - 7 * 60 * 1e3).toISOString();
    try {
      const pendingDeposits = await db.collection("deposits").where("status", "==", "pending").get();
      console.log(`[Cron] Found ${pendingDeposits.docs.length} pending deposits`);
      for (const doc of pendingDeposits.docs) {
        const data = doc.data();
        console.log(`[Cron] Debug: Deposit ${doc.id} status: ${data.status}, timestamp type: ${typeof data.timestamp}`);
        let createdDate = data.timestamp;
        if (createdDate && typeof createdDate.toDate === "function") {
          createdDate = createdDate.toDate().toISOString();
        } else if (createdDate && typeof createdDate === "string") {
        } else {
          console.log(`[Cron] Debug: Deposit ${doc.id} has no valid timestamp`);
          continue;
        }
        console.log(`[Cron] Deposit ${doc.id} timestamp: ${createdDate}, Threshold: ${sevenMinutesAgo}`);
        if (createdDate && createdDate < sevenMinutesAgo) {
          const depositId = doc.id;
          const uid = data.uid;
          await doc.ref.update({ status: "cancelled" });
          console.log(`[Cron] Auto-cancelled deposits/${depositId}`);
          try {
            await db.collection("transactions").doc(depositId).update({ status: "cancelled" });
            console.log(`[Cron] Auto-cancelled transactions/${depositId}`);
          } catch (txErr) {
            console.log(`[Cron] Transactions doc ${depositId} could not be updated:`, txErr.message);
          }
          if (uid) {
            try {
              await db.collection("users").doc(uid).collection("history").doc(depositId).update({ status: "cancelled" });
              console.log(`[Cron] Auto-cancelled users/${uid}/history/${depositId}`);
            } catch (histErr) {
              console.log(`[Cron] History doc for user ${uid}, deposit ${depositId} could not be updated:`, histErr.message);
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
//# sourceMappingURL=server.cjs.map
