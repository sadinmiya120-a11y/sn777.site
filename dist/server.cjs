"use strict";
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
var import_fs = __toESM(require("fs"), 1);
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path = __toESM(require("path"), 1);
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_node_cron = __toESM(require("node-cron"), 1);
var import_multer = __toESM(require("multer"), 1);
var appDir = process.cwd();
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
var TX_STORE_FILE = import_path.default.join(process.cwd(), "data", "transactions_store.json");
function getLocalTransactions() {
  try {
    if (import_fs.default.existsSync(TX_STORE_FILE)) {
      return JSON.parse(import_fs.default.readFileSync(TX_STORE_FILE, "utf8")) || [];
    }
  } catch (e) {
  }
  return [];
}
function saveLocalTransaction(tx) {
  try {
    const list = getLocalTransactions();
    const docKey = tx.id || tx.order_no || tx.depositNo || tx.withdrawNo || tx.timestamp + "_" + tx.amount;
    const idx = list.findIndex((item) => {
      const k = item.id || item.order_no || item.depositNo || item.withdrawNo || item.timestamp + "_" + item.amount;
      return k === docKey || tx.order_no && item.order_no === tx.order_no;
    });
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...tx, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    } else {
      list.unshift({ ...tx, createdAt: tx.createdAt || tx.timestamp || (/* @__PURE__ */ new Date()).toISOString() });
    }
    const trimmed = list.slice(0, 1e3);
    import_fs.default.writeFileSync(TX_STORE_FILE, JSON.stringify(trimmed, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save local transaction:", e);
  }
}
app.post("/api/record-transaction", async (req, res) => {
  try {
    const tx = req.body;
    if (!tx || !tx.uid) {
      return res.status(400).json({ error: "Missing tx data or uid" });
    }
    const docId = tx.id || tx.order_no || tx.depositNo || tx.withdrawNo || "tx_" + Date.now();
    let safeTx = { ...tx };
    if (safeTx.type === "deposit") {
      const localList = getLocalTransactions();
      const existing = localList.find((item) => item.id === docId || item.order_no === docId);
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
    } catch (fbErr) {
    }
    return res.json({ success: true, status: safeTx.status });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/user-transactions", async (req, res) => {
  try {
    const uid = String(req.query.uid || "").trim();
    if (!uid) return res.status(400).json({ error: "Missing uid" });
    const localList = getLocalTransactions().filter((t) => t.uid === uid);
    let firestoreList = [];
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const db = adminApp.firestore();
        const [txSnap, wthSnap, depSnap, histSnap] = await Promise.all([
          db.collection("transactions").where("uid", "==", uid).limit(100).get().catch(() => ({ docs: [] })),
          db.collection("withdrawals").where("uid", "==", uid).limit(100).get().catch(() => ({ docs: [] })),
          db.collection("deposits").where("uid", "==", uid).limit(100).get().catch(() => ({ docs: [] })),
          db.collection("users").doc(uid).collection("history").limit(100).get().catch(() => ({ docs: [] }))
        ]);
        txSnap.docs.forEach((d) => firestoreList.push({ id: d.id, ...d.data() }));
        wthSnap.docs.forEach((d) => {
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
            timestamp: data.timestamp || data.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
            withdrawNo: data.withdrawNo || data.serialNo,
            serialNo: data.serialNo || data.withdrawNo,
            description: data.description || "\u0989\u0987\u09A5\u09A1\u09CD\u09B0 \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F (" + (data.status || "\u09AA\u09C7\u09A8\u09CD\u09A1\u09BF\u0982") + ")",
            ...data
          });
        });
        depSnap.docs.forEach((d) => {
          const data = d.data();
          firestoreList.push({
            id: d.id,
            type: "deposit",
            status: data.status || "pending",
            amount: Number(data.amount || 0),
            displayAmount: Number(data.amount || 0),
            method: data.method || "bkash",
            timestamp: data.timestamp || data.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
            depositNo: data.depositNo || data.serialNo,
            serialNo: data.serialNo || data.depositNo,
            description: data.description || "\u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F " + (data.amount || "") + " \u099F\u09BE\u0995\u09BE",
            ...data
          });
        });
        histSnap.docs.forEach((d) => {
          const data = d.data();
          firestoreList.push({
            id: d.id,
            ...data
          });
        });
      }
    } catch (fbErr) {
      console.warn("Error reading from firestore collections:", fbErr);
    }
    const map = /* @__PURE__ */ new Map();
    for (const item of [...firestoreList, ...localList]) {
      const key = String(item.id || item.order_no || item.depositNo || item.withdrawNo || item.timestamp + "_" + item.amount);
      map.set(key, { ...map.get(key), ...item });
    }
    const merged = Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    return res.json({ transactions: merged });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/create-payment", async (req, res) => {
  try {
    const { uid, amount, method } = req.body;
    if (!uid || !amount || !method) return res.status(400).json({ error: "Missing parameters" });
    const order_no = "ORD-" + Date.now();
    saveLocalTransaction({ id: order_no, order_no, uid, amount: parseFloat(amount), method, type: "deposit", status: "pending", createdAt: (/* @__PURE__ */ new Date()).toISOString() });
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
      api_key: process.env.GOPAY_API_KEY || "",
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
app.all(["/gopay_pay.php", "/api/gopay_pay", "/api/gopay-pay", "/pay.php"], async (req, res) => {
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
    const rawMethod = String(rawData.method || rawData.goods_name || "nagad").toLowerCase();
    if (!uid || isNaN(amount) || amount <= 0) {
      console.error("[GOPAY PAY] Missing or invalid UID/Amount:", { uid, amount });
      return res.status(400).send("<h3>Illegal access: UID or Amount missing</h3>");
    }
    const host = req.get("host") || "ais-dev-sxllemqiu46rogxyb2cm6w-552213914579.asia-east1.run.app";
    const proto = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const origin = `${proto}://${host}`;
    const serial = String(rawData.order_no || rawData.mch_order_no || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "") + Math.floor(Date.now() / 1e3) + Math.floor(1e5 + Math.random() * 9e5));
    const now = /* @__PURE__ */ new Date();
    const createdate = now.toISOString().replace("T", " ").slice(0, 19);
    const isBkash = rawMethod.includes("bkash");
    const payName = isBkash ? "BKASH" : "NAGAD";
    const payType = isBkash ? "2202" : "2201";
    const notifyURL = "https://sn777.site/pay1/gopay_notify.php";
    let jumpURL = "https://sn777.site/#/wallet/RechargeHistory";
    if (rawData.return_url || rawData.page_url || rawData.redirect_url) {
      jumpURL = String(rawData.return_url || rawData.page_url || rawData.redirect_url);
    }
    const finalCredit = amount >= 550 ? amount * 2 : amount;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const db = adminApp.firestore();
        let phone = "01700000000";
        let username = "unknown";
        try {
          const userDoc = await db.collection("users").doc(uid).get();
          if (userDoc.exists) {
            const uData = userDoc.data();
            phone = uData?.phone || phone;
            username = uData?.username || username;
          }
        } catch (e) {
        }
        const isoTimestamp = (/* @__PURE__ */ new Date()).toISOString();
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
          description: `\u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F ${amount} \u099F\u09BE\u0995\u09BE (${payName} GOPay)`
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
    const candidatePayTypes = ["2201", "2202", "1001", "1002"];
    let cashierUrl = "";
    let lastErrorMsg = "FAIL";
    for (const pType of candidatePayTypes) {
      const postData = {
        version: "1.0",
        app_id,
        notify_url: notifyURL,
        page_url: jumpURL,
        mch_order_no: serial,
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
        if (v !== "" && v !== null && v !== void 0) {
          signStr += `${k}=${v}&`;
        }
      }
      signStr += `key=${secretKey}`;
      postData.sign = import_crypto.default.createHash("md5").update(signStr).digest("hex");
      postData.sign_type = "MD5";
      try {
        console.log(`[GOPAY PAY] Attempting gateway with pay_type=${pType}, goods_name=${payName}`);
        const gopayRes = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(postData).toString()
        });
        const resJson = await gopayRes.json();
        console.log(`[GOPAY PAY] Gateway response for pay_type=${pType}:`, resJson);
        if (resJson && resJson.respCode === "SUCCESS" && resJson.payInfo) {
          cashierUrl = resJson.payInfo;
          break;
        } else if (resJson?.tradeMsg) {
          lastErrorMsg = resJson.tradeMsg;
        }
      } catch (postErr) {
        console.warn(`[GOPAY PAY] Gateway attempt failed for ${pType}:`, postErr);
      }
    }
    if (cashierUrl) {
      if (req.headers.accept?.includes("application/json") || req.xhr) {
        return res.json({ success: true, redirect_url: cashierUrl, payInfo: cashierUrl });
      }
      return res.redirect(cashierUrl);
    } else {
      return res.status(400).send(`<h3>gopay API ERROR: ${lastErrorMsg}</h3>`);
    }
  } catch (err) {
    console.error("[GOPAY PAY Error]:", err);
    return res.status(500).send(`<h3>Server Error: ${err.message}</h3>`);
  }
});
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
    const sign_parts = [];
    for (const key of sortedKeys) {
      const value = sign_params[key];
      if (value !== "" && value !== null && value !== void 0) {
        sign_parts.push(`${key}=${value}`);
      }
    }
    let signStr = sign_parts.join("&") + `&key=${secret_key}`;
    let localSign = import_crypto.default.createHash("md5").update(signStr).digest("hex").toLowerCase();
    let gateSign = String(rawData.sign || "").trim().toLowerCase();
    if (localSign !== gateSign) {
      const signStrNoAmp = sign_parts.join("&") + `key=${secret_key}`;
      const localSignNoAmp = import_crypto.default.createHash("md5").update(signStrNoAmp).digest("hex").toLowerCase();
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
    const localItem = localList.find((x) => x.order_no === mch_order_no || x.id === mch_order_no || x.depositNo === mch_order_no);
    let orderData = localItem || null;
    let depositDocRef = null;
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
    if (isAlreadyCredited) {
      console.log(`[GOPAY NOTIFY] IDEMPOTENCY LOCK: Order No ${mch_order_no} is already processed & credited. Rejecting duplicate credit.`);
      return res.send("success");
    }
    if (tradeResult === "1") {
      const creditAmount = Number(orderData?.finalCredit || trade_amount);
      const originalAmount = Number(orderData?.amount || trade_amount);
      if (adminApp && uid) {
        try {
          const db = adminApp.firestore();
          const userRef = db.collection("users").doc(uid);
          await db.runTransaction(async (transaction) => {
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
              withdrawEnabled: currentTotalDeposited + originalAmount >= 940 && currentApprovedCount + 1 >= 2,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            }, { merge: true });
            const updatedDepositData = {
              ...orderData,
              status: "approved",
              credited: true,
              creditedAmount: creditAmount,
              creditedAt: (/* @__PURE__ */ new Date()).toISOString(),
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
            if (depositDocRef) {
              transaction.update(depositDocRef, updatedDepositData);
            } else {
              transaction.set(db.collection("deposits").doc(mch_order_no), updatedDepositData, { merge: true });
            }
            const transactionRef = db.collection("transactions").doc(mch_order_no);
            transaction.set(transactionRef, { status: "approved", credited: true, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
            const userHistoryRef = db.collection("users").doc(uid).collection("history").doc(mch_order_no);
            transaction.set(userHistoryRef, { status: "approved", credited: true, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
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
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log(`[GOPAY NOTIFY] SUCCESS: Verified balance credited for UID: ${uid} | Amount: ${creditAmount} | Order: ${mch_order_no}`);
      return res.send("success");
    } else {
      console.log(`[GOPAY NOTIFY] PAYMENT CANCELLED/FAILED: Gateway reported tradeResult=${tradeResult} for Order: ${mch_order_no}`);
      if (adminApp) {
        try {
          const db = adminApp.firestore();
          const targetRef = depositDocRef || db.collection("deposits").doc(mch_order_no);
          await targetRef.set({ status: "failed", cancelled: true, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
          if (uid) {
            await db.collection("users").doc(uid).collection("history").doc(mch_order_no).set({ status: "failed", cancelled: true, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
          }
        } catch (e) {
        }
      }
      saveLocalTransaction({
        id: mch_order_no,
        order_no: mch_order_no,
        uid,
        status: "failed",
        cancelled: true,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      return res.send("success");
    }
  } catch (err) {
    console.error("[GOPAY NOTIFY ERROR]:", err);
    return res.send("fail");
  }
});
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
    const isSigValid = Boolean(
      signature && received_signature.length === expected_signature.length && import_crypto.default.timingSafeEqual(Buffer.from(expected_signature, "utf8"), Buffer.from(received_signature, "utf8"))
    );
    if (isSigValid) {
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
              saveLocalTransaction({ id: order_no, order_no, uid, status: "approved", amount: amountToCredit, finalCredit: Number(depData?.finalCredit || amountToCredit), type: "deposit", updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
              transaction.set(transactionRef, { status: "approved", updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, { merge: true });
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
    console.error("[GOPay Callback] Error:", e);
    res.status(500).send("Error");
  }
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
    } catch (e) {
    }
    let depositData = null;
    const localList = getLocalTransactions();
    const localItem = localList.find((x) => x.order_no === cleanOrderNo || x.id === cleanOrderNo || x.depositNo === cleanOrderNo);
    if (localItem) {
      depositData = { ...localItem };
    }
    if (db) {
      try {
        let dSnap = await db.collection("deposits").doc(cleanOrderNo).get();
        if (dSnap.exists) {
          depositData = { ...depositData, ...dSnap.data() };
        } else {
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
        error: "\u09AD\u09C1\u09B2 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF! \u0995\u09CB\u09A8\u09CB \u09B0\u09C7\u0995\u09B0\u09CD\u09A1 \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF\u0964",
        amount: 0,
        finalCredit: 0
      });
    }
    const isApproved = depositData.status === "approved" || depositData.status === "success" || depositData.credited === true;
    const isPending = depositData.status === "pending" || depositData.status === "processing";
    const isFailed = depositData.status === "failed" || depositData.status === "cancelled";
    const currentStatus = isApproved ? "approved" : isPending ? "pending" : "failed";
    res.json({
      success: isApproved,
      status: currentStatus,
      amount: depositData?.amount || 0,
      finalCredit: depositData?.finalCredit || depositData?.amount || 0,
      message: isApproved ? "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09AD\u09C7\u09B0\u09BF\u09AB\u09BE\u0987 \u0993 \u0995\u09CD\u09B0\u09C7\u09A1\u09BF\u099F \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964" : isPending ? "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09AF\u09BC\u09BE\u09A7\u09C0\u09A8 \u09B0\u09AF\u09BC\u09C7\u099B\u09C7..." : "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09AC\u09BE \u09AC\u09BE\u09A4\u09BF\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964"
    });
  } catch (err) {
    console.error("Payment verification endpoint error:", err);
    res.status(500).json({ error: err.message, success: false, status: "failed" });
  }
});
app.post("/api/validate-manual-deposit", async (req, res) => {
  try {
    const { uid, transactionId, order_no, amount } = req.body;
    const cleanTxId = String(transactionId || order_no || "").trim();
    if (!cleanTxId) {
      return res.status(400).json({ success: false, error: "\u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF \u09AA\u09CD\u09B0\u09A6\u09BE\u09A8 \u0995\u09B0\u09C1\u09A8\u0964" });
    }
    let db = null;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch (e) {
    }
    if (db) {
      try {
        const querySnap = await db.collection("deposits").where("transactionId", "==", cleanTxId).limit(10).get();
        for (const doc of querySnap.docs) {
          const d = doc.data();
          if (d.status === "approved" || d.status === "success" || d.credited === true) {
            return res.status(400).json({
              success: false,
              error: "\u098F\u0987 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AF\u09C1\u0995\u09CD\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7!"
            });
          }
        }
        const queryOrderSnap = await db.collection("deposits").where("order_no", "==", cleanTxId).limit(10).get();
        for (const doc of queryOrderSnap.docs) {
          const d = doc.data();
          if (d.status === "approved" || d.status === "success" || d.credited === true) {
            return res.status(400).json({
              success: false,
              error: "\u098F\u0987 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7 \u098F\u09AC\u0982 \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u09AF\u09C1\u0995\u09CD\u09A4 \u09B9\u09DF\u09C7\u099B\u09C7!"
            });
          }
        }
      } catch (dbErr) {
        console.warn("[validate-manual-deposit] Firestore duplicate check warning:", dbErr);
      }
    }
    const localList = getLocalTransactions();
    const isDup = localList.some(
      (x) => (x.transactionId === cleanTxId || x.order_no === cleanTxId || x.id === cleanTxId) && (x.status === "approved" || x.credited === true)
    );
    if (isDup) {
      return res.status(400).json({
        success: false,
        error: "\u098F\u0987 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF\u099F\u09BF \u0987\u09A4\u09BF\u09AE\u09A7\u09CD\u09AF\u09C7 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7!"
      });
    }
    if (cleanTxId.length < 8 || !/^[a-zA-Z0-9_-]+$/.test(cleanTxId)) {
      return res.status(400).json({
        success: false,
        error: "\u09AD\u09C1\u09B2 \u09AC\u09BE \u0985\u09AC\u09C8\u09A7 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF! \u09A1\u09BF\u09AA\u09CB\u099C\u09BF\u099F \u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09BE \u09B9\u09B2\u09CB\u0964"
      });
    }
    return res.json({ success: true, message: "\u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8 \u0986\u0987\u09A1\u09BF \u0997\u09CD\u09B0\u09B9\u09A3 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7, \u09AF\u09BE\u099A\u09BE\u0987\u0995\u09B0\u09A3 \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09AF\u09BC\u09BE\u09A7\u09C0\u09A8\u0964" });
  } catch (err) {
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
    } catch (e) {
    }
    const results = [];
    let userDocData = null;
    if (db) {
      try {
        const uSnap = await db.collection("users").doc(uid).get();
        if (uSnap.exists) userDocData = uSnap.data();
      } catch (err) {
      }
      try {
        const depSnap = await db.collection("deposits").where("uid", "==", uid).limit(5).get();
        for (const doc of depSnap.docs) {
          const parsed = doc.data();
          const order_no = doc.id;
          const isApproved = parsed.status === "approved" || parsed.status === "success";
          const isUnnotified = parsed.notified === false || parsed.notified !== true && parsed.notified !== "true";
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
      } catch (err) {
      }
    }
    return res.json({ success: true, results, user: userDocData });
  } catch (e) {
    return res.json({ success: true, results: [], user: null });
  }
});
async function startServer() {
  const possibleDistPaths = [
    import_path.default.join(process.cwd(), "dist"),
    import_path.default.join(process.cwd(), "dist_backup"),
    import_path.default.join(appDir, "dist"),
    import_path.default.join(appDir, "dist_backup"),
    appDir
  ];
  for (const p of possibleDistPaths) {
    if (import_fs.default.existsSync(p)) {
      app.use(import_express.default.static(p));
    }
  }
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    for (const p of possibleDistPaths) {
      const indexPath = import_path.default.join(p, "index.html");
      if (import_fs.default.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    res.status(404).send("index.html not found");
  });
  let quotaCooldownUntil = 0;
  import_node_cron.default.schedule("*/5 * * * *", async () => {
    if (Date.now() < quotaCooldownUntil) {
      return;
    }
    try {
      const adminApp = getFirebaseAdmin();
      if (!adminApp) return;
      const db = adminApp.firestore();
      if (!db) return;
      const sevenMinutesAgo = new Date(Date.now() - 7 * 60 * 1e3).toISOString();
      const pendingDeposits = await db.collection("deposits").where("status", "==", "pending").limit(10).get();
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
            await doc.ref.update({ status: "cancelled", updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
            if (uid) {
              try {
                await db.collection("users").doc(uid).collection("history").doc(depositId).update({ status: "cancelled" });
              } catch (histErr) {
              }
            }
          }
        } catch (itemErr) {
          const msg = String(itemErr?.message || itemErr);
          if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded") || msg.includes("8 RESOURCE_EXHAUSTED")) {
            throw itemErr;
          }
        }
      }
    } catch (error) {
      const errMsg = String(error?.message || error);
      if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded") || errMsg.includes("8 RESOURCE_EXHAUSTED")) {
        quotaCooldownUntil = Date.now() + 15 * 60 * 1e3;
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
