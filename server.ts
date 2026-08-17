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

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const COUNTER_FILE = path.join(process.cwd(), "data", "global_counters.json");

function getLocalCounters() {
  try {
    if (fs.existsSync(COUNTER_FILE)) {
      return JSON.parse(fs.readFileSync(COUNTER_FILE, "utf8"));
    }
  } catch (e) {}
  return { deposit_serial: 144, withdraw_serial: 100 };
}

function saveLocalCounters(data: any) {
  try {
    if (!fs.existsSync(path.dirname(COUNTER_FILE))) {
      fs.mkdirSync(path.dirname(COUNTER_FILE), { recursive: true });
    }
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {}
}

async function getAndIncrementCounter(type: "deposit" | "withdraw"): Promise<number> {
  const local = getLocalCounters();
  const key = `${type}_serial`;
  let currentVal = Number(local[key]) || (type === "deposit" ? 143 : 99);
  
  try {
    const doc = await getFirestoreDocRest("system", "counters");
    if (doc && doc.data && doc.data[key]) {
      const fsVal = Number(doc.data[key]);
      if (fsVal > currentVal) {
        currentVal = fsVal;
      }
    }
  } catch (e) {}

  const nextVal = currentVal + 1;
  local[key] = nextVal;
  saveLocalCounters(local);

  try {
    await patchFirestoreDocRest("system/counters", {
      [key]: nextVal,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {}

  return nextVal;
}


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

app.get("/", async (req, res, next) => {
  const order_no = req.query.order_no || req.query.order_id || req.query.ref || req.query.cust_order_id;
  if (order_no) {
    try {
      await approveDepositHelper(null, String(order_no).trim());
    } catch (e) {
      console.error("[Root Auto-Approve Error]:", e);
    }
    return res.redirect(`/success?order_no=${order_no}`);
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

// Firestore REST API Helpers
const FIRESTORE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "xbet-mobcash";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents`;

function parseFirestoreDoc(docData: any) {
  if (!docData || !docData.fields) return null;
  const obj: any = {};
  for (const [key, val] of Object.entries<any>(docData.fields)) {
    if (val.stringValue !== undefined) obj[key] = val.stringValue;
    else if (val.integerValue !== undefined) obj[key] = Number(val.integerValue);
    else if (val.doubleValue !== undefined) obj[key] = Number(val.doubleValue);
    else if (val.booleanValue !== undefined) obj[key] = val.booleanValue;
    else if (val.timestampValue !== undefined) obj[key] = val.timestampValue;
  }
  return obj;
}

function toFirestoreFields(obj: any) {
  const fields: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (typeof val === "boolean") fields[key] = { booleanValue: val };
    else if (typeof val === "number") {
      if (Number.isInteger(val)) fields[key] = { integerValue: val.toString() };
      else fields[key] = { doubleValue: val };
    }
    else fields[key] = { stringValue: val.toString() };
  }
  return fields;
}

async function getFirestoreDocRest(collection: string, docId: string) {
  try {
    const url = `${FIRESTORE_BASE_URL}/${collection}/${docId}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return { id: docId, exists: true, data: parseFirestoreDoc(data) };
  } catch (e) {
    console.error(`getFirestoreDocRest error for ${collection}/${docId}:`, e);
    return null;
  }
}

async function patchFirestoreDocRest(collectionPath: string, dataObj: any) {
  try {
    const fields = toFirestoreFields(dataObj);
    const keys = Object.keys(fields);
    if (keys.length === 0) return true;
    const fieldMask = keys.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
    const url = `${FIRESTORE_BASE_URL}/${collectionPath}?${fieldMask}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });
    return res.ok;
  } catch (e) {
    console.error(`patchFirestoreDocRest error for ${collectionPath}:`, e);
    return false;
  }
}

// Helper to find a deposit document
async function findDepositDoc(db: any, order_no: string) {
  const cleanOrderNo = String(order_no).trim();
  
  let docRest = await getFirestoreDocRest("deposits", cleanOrderNo);
  if (docRest) return { depositRef: db ? db.collection("deposits").doc(cleanOrderNo) : null, depositDoc: docRest, matchedId: cleanOrderNo };

  if (cleanOrderNo.includes("-")) {
    const strippedId = cleanOrderNo.replace(/-/g, "");
    docRest = await getFirestoreDocRest("deposits", strippedId);
    if (docRest) return { depositRef: db ? db.collection("deposits").doc(strippedId) : null, depositDoc: docRest, matchedId: strippedId };
  } else if (cleanOrderNo.startsWith("ORD")) {
    const hyphenatedId = "ORD-" + cleanOrderNo.substring(3);
    docRest = await getFirestoreDocRest("deposits", hyphenatedId);
    if (docRest) return { depositRef: db ? db.collection("deposits").doc(hyphenatedId) : null, depositDoc: docRest, matchedId: hyphenatedId };
  }

  if (db) {
    try {
      let depositRef = db.collection("deposits").doc(cleanOrderNo);
      let depositDoc = await depositRef.get();
      if (depositDoc.exists) return { depositRef, depositDoc: { id: cleanOrderNo, exists: true, data: () => depositDoc.data() }, matchedId: cleanOrderNo };
    } catch(e) {}
  }

  return { depositRef: db ? db.collection("deposits").doc(cleanOrderNo) : null, depositDoc: null, matchedId: cleanOrderNo };
}


async function approveDepositHelper(db: any, order_no: string, reqAmount?: number) {
  const cleanOrderNo = String(order_no).trim();
  console.log(`[approveDepositHelper] Processing order: ${cleanOrderNo}`);

  let depositDoc = await getFirestoreDocRest("deposits", cleanOrderNo);
  let finalOrderNo = cleanOrderNo;

  if (!depositDoc) {
    if (cleanOrderNo.includes("-")) {
      const stripped = cleanOrderNo.replace(/-/g, "");
      depositDoc = await getFirestoreDocRest("deposits", stripped);
      if (depositDoc) finalOrderNo = stripped;
    } else if (cleanOrderNo.startsWith("ORD")) {
      const hyphenated = "ORD-" + cleanOrderNo.substring(3);
      depositDoc = await getFirestoreDocRest("deposits", hyphenated);
      if (depositDoc) finalOrderNo = hyphenated;
    }
  }

  if (!depositDoc && db) {
    try {
      const { depositDoc: adminDoc, matchedId } = await findDepositDoc(db, cleanOrderNo);
      if (adminDoc && adminDoc.exists) {
        depositDoc = { id: matchedId, exists: true, data: typeof adminDoc.data === "function" ? adminDoc.data() : adminDoc.data };
        finalOrderNo = matchedId;
      }
    } catch(e) {}
  }

  if (!depositDoc || !depositDoc.data) {
    console.error(`[approveDepositHelper] Deposit doc not found for: ${cleanOrderNo}`);
    return { success: false, message: "ডিপোজিট রিকোয়েস্ট পাওয়া যায়নি।" };
  }

  const depositData = depositDoc.data;
  const uid = depositData.uid;
  if (!uid) {
    return { success: false, message: "ইউজার আইডি পাওয়া যায়নি।" };
  }

  if (depositData.status === "approved" || depositData.status === "success") {
    return {
      success: true,
      message: "এই ডিপোজিট ইতিমধ্যেই অ্যাপ্রুভ করা হয়েছে।",
      status: "approved",
      amount: Number(depositData.amount) || 0,
      finalCredit: Number(depositData.finalCredit) || Number(depositData.amount) || 0
    };
  }

  let depositAmount = Number(reqAmount) || Number(depositData.amount) || 0;
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
  let creditAmount = depositData.finalCredit !== undefined && Number(depositData.finalCredit) > 0
    ? Number(depositData.finalCredit)
    : (depositAmount === 550 ? 1100 : (finalCreditMap[depositAmount] || depositAmount));

  let userDocData = (await getFirestoreDocRest("users", uid))?.data;
  if (!userDocData && db) {
    try {
      const uSnap = await db.collection("users").doc(uid).get();
      if (uSnap.exists) userDocData = uSnap.data();
    } catch(e) {}
  }

  if (!userDocData) {
    return { success: false, message: "ইউজার ডেটা পাওয়া যায়নি।" };
  }

  const currBal = parseFloat(userDocData.balance || "0.00");
  const newBal = (currBal + creditAmount).toFixed(2);
  const currTotalDep = Number(userDocData.totalDeposited) || 0;
  const newTotalDep = currTotalDep + depositAmount;
  const currAppCount = Number(userDocData.approvedDepositsCount) || 0;
  const newAppCount = currAppCount + 1;
  const isBonus = creditAmount > depositAmount;

  // Check approved deposits to verify withdrawal qualification (>= 550 for 1st deposit, >= 390 for 2nd deposit)
  let isQualifiedForWithdraw = false;
  try {
    const approvedAmts: number[] = [];
    const runQuery = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "deposits" }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                { fieldFilter: { field: { fieldPath: "uid" }, op: "EQUAL", value: { stringValue: uid } } },
                { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "approved" } } }
              ]
            }
          }
        }
      })
    });
    if (runQuery.ok) {
      const qDocs = await runQuery.json();
      if (Array.isArray(qDocs)) {
        qDocs.forEach((item: any) => {
          if (item.document) {
            const parsed = parseFirestoreDoc(item.document);
            const amt = Number(parsed?.amount || 0);
            if (!isNaN(amt) && amt > 0) approvedAmts.push(amt);
          }
        });
      }
    }
    if (depositAmount > 0) approvedAmts.push(depositAmount);
    approvedAmts.sort((a, b) => b - a);
    if (approvedAmts.length >= 2 && approvedAmts[0] >= 550 && approvedAmts[1] >= 390) {
      isQualifiedForWithdraw = true;
    }
  } catch (err) {
    console.error("Error evaluating withdrawal qualification:", err);
  }

  // Update via REST
  await patchFirestoreDocRest(`users/${uid}`, {
    balance: newBal,
    totalDeposited: newTotalDep,
    approvedDepositsCount: newAppCount,
    adminApproved: newTotalDep >= 550 ? true : (userDocData.adminApproved || false),
    withdrawEnabled: isQualifiedForWithdraw || (userDocData.withdrawEnabled === true),
    giftCardRedeemed: isBonus || depositAmount >= 550 ? true : (userDocData.giftCardRedeemed || false)
  });

  await patchFirestoreDocRest(`deposits/${finalOrderNo}`, {
    status: "approved",
    approvedAt: new Date().toISOString(),
    creditedAmount: creditAmount
  });

  await patchFirestoreDocRest(`transactions/${finalOrderNo}`, {
    uid,
    username: userDocData.username || depositData.username || "",
    amount: depositAmount,
    finalCredit: creditAmount,
    depositNo: depositData.depositNo || depositData.serialNo || undefined,
    serialNo: depositData.serialNo || depositData.depositNo || undefined,
    status: "approved",
    type: "deposit",
    method: depositData.method || "online",
    updatedAt: new Date().toISOString()
  });

  await patchFirestoreDocRest(`users/${uid}/history/${finalOrderNo}`, {
    status: "approved",
    approvedAt: new Date().toISOString(),
    creditedAmount: creditAmount
  });

  console.log(`[approveDepositHelper] Successfully approved order ${finalOrderNo} and credited ${creditAmount} to user ${uid}!`);
  return { success: true, message: "ডিপোজিট অ্যাপ্রুভ হয়েছে!", status: "approved", amount: depositAmount, finalCredit: creditAmount };
}


// Create Payment

app.post("/api/next-serial", async (req, res) => {
  try {
    const type = req.body?.type === "withdraw" ? "withdraw" : "deposit";
    const serial = await getAndIncrementCounter(type);
    res.json({ success: true, type, serial });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/current-counters", async (req, res) => {
  try {
    const local = getLocalCounters();
    res.json({ success: true, counters: local });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/create-payment", async (req, res) => {
  try {
    const { uid, amount, method } = req.body;
    if (!uid || !amount || !method) return res.status(400).json({ error: "Missing parameters" });
    const order_no = "ORD" + Date.now();
    const parsedAmount = parseFloat(amount);
    const finalCreditMap: Record<number, number> = {
      550: 1100,
      1000: 2000,
      2000: 4000,
      5000: 10000,
      10000: 20000,
      30000: 60000,
      50000: 100000
    };
    const finalCredit = parsedAmount === 550 ? 1100 : (finalCreditMap[parsedAmount] || parsedAmount);

    const depositSerial = await getAndIncrementCounter("deposit");
    const depositObj: any = {
      depositNo: depositSerial,
      serialNo: depositSerial,
      uid,
      amount: parsedAmount,
      finalCredit,
      method,
      status: "approved",
      createdAt: new Date().toISOString(),
      order_no
    };

    // Fetch user info to populate username/phone in deposit doc
    const userDoc = await getFirestoreDocRest("users", uid);
    if (userDoc?.data) {
      if (userDoc.data.username) depositObj.username = userDoc.data.username;
      if (userDoc.data.phone) depositObj.phone = userDoc.data.phone;
    }

    await patchFirestoreDocRest(`deposits/${order_no}`, depositObj);

    // Also attempt Firebase Admin if available
    try {
      const adminApp = getFirebaseAdmin();
      const db = adminApp.firestore();
      await db.collection("deposits").doc(order_no).set(depositObj, { merge: true });
    try { const adminApp = getFirebaseAdmin(); if (adminApp) { await approveDepositHelper(adminApp.firestore(), order_no); } } catch(err) { console.error("Auto approve deposit error:", err); }

    } catch(e) {}

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
    let db: any = null;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch (e) {}

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

    let depositData: any = null;
    const docRest = await getFirestoreDocRest("deposits", String(order_no).trim());
    if (docRest?.data) {
      depositData = docRest.data;
    } else if (db) {
      try {
        const { depositDoc } = await findDepositDoc(db, order_no);
        if (depositDoc?.exists) depositData = typeof depositDoc.data === "function" ? depositDoc.data() : depositDoc.data;
      } catch(e) {}
    }

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
app.post("/api/register-user-profile", async (req, res) => {
  try {
    const { uid, username, email, phone, password, parentId, deviceId, lastIp } = req.body;
    if (!uid || !username) {
      return res.status(400).json({ error: "Missing uid or username" });
    }

    const cleanUsername = username.trim();
    const userEmail = email || `${cleanUsername.toLowerCase().replace(/\s+/g, "")}@sn777.com`;
    const userPhone = phone ? (phone.startsWith("+880") ? phone : `+880 ${phone.replace(/^0+/, "")}`) : "+880 1XXXXXXXXX";

    const adminApp = getFirebaseAdmin();
    if (!adminApp) return res.status(500).json({ error: "Firebase admin unavailable" });
    const db = adminApp.firestore();

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    const existing = snap.exists ? snap.data() : {};

    const generateInviteCode = () => "sn_" + Math.random().toString(36).substring(2, 9).toUpperCase();

    const profileData = {
      username: cleanUsername,
      email: userEmail,
      phone: userPhone,
      password: password || existing?.password || "",
      balance: existing?.balance || "777.00",
      totalDeposited: existing?.totalDeposited || 0,
      approvedDepositsCount: existing?.approvedDepositsCount || 0,
      parentId: parentId || existing?.parentId || "",
      rewardTier: (parentId || existing?.parentId) ? 1 : 0,
      inviteCode: existing?.inviteCode || generateInviteCode(),
      referralEarnings: existing?.referralEarnings || 0,
      totalReferrals: existing?.totalReferrals || 0,
      personalWinRate: 50,
      role: cleanUsername.toLowerCase() === "admin" ? "admin" : "user",
      status: existing?.status || "active",
      isBlocked: existing?.isBlocked || false,
      registrationDate: existing?.registrationDate || new Date().toISOString(),
      deviceId: deviceId || existing?.deviceId || "",
      lastIp: lastIp || existing?.lastIp || "",
      lastActive: new Date().toISOString()
    };

    await userRef.set(profileData, { merge: true });
    console.log(`[register-user-profile] Profile saved for UID: ${uid}, username: ${cleanUsername}`);
    return res.json({ success: true, profile: profileData });
  } catch (err: any) {
    console.error("[register-user-profile] Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/repair-user-profile", async (req, res) => {
  try {
    const { uid, username, password } = req.body;
    if (!uid) return res.status(400).json({ error: "Missing uid" });

    const adminApp = getFirebaseAdmin();
    if (!adminApp) return res.status(500).json({ error: "Firebase admin unavailable" });
    const db = adminApp.firestore();

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "User doc not found" });
    }

    const data = snap.data() || {};
    const needsRepair = !data.username || data.username === "User" || data.username === "ব্যবহারকারী" || !data.phone;

    if (!needsRepair) {
      return res.json({ success: true, repaired: false, profile: data });
    }

    let authEmail = data.email || "";
    if (!authEmail) {
      try {
        const authUser = await adminApp.auth().getUser(uid);
        authEmail = authUser.email || "";
      } catch (e) {}
    }

    const repairedUsername = username || data.username || (authEmail ? authEmail.split("@")[0] : "user_" + uid.substring(0, 6));
    const generateInviteCode = () => "sn_" + Math.random().toString(36).substring(2, 9).toUpperCase();

    const repairedData = {
      username: repairedUsername,
      email: authEmail || `${repairedUsername.toLowerCase().replace(/\s+/g, "")}@sn777.com`,
      phone: data.phone && data.phone !== "N/A" && !data.phone.includes("X") ? data.phone : "+880 1700000000",
      password: password || data.password || "123456",
      balance: data.balance || "777.00",
      totalDeposited: data.totalDeposited || 0,
      approvedDepositsCount: data.approvedDepositsCount || 0,
      inviteCode: data.inviteCode || generateInviteCode(),
      role: repairedUsername.toLowerCase() === "admin" ? "admin" : "user",
      registrationDate: data.registrationDate || new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    await userRef.set(repairedData, { merge: true });
    console.log(`[repair-user-profile] Repaired user UID: ${uid} with username: ${repairedUsername}`);
    return res.json({ success: true, repaired: true, profile: repairedData });
  } catch (err: any) {
    console.error("[repair-user-profile] Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/toggle-user-status", async (req, res) => {
  try {
    const { uid, status } = req.body; // status: 'disabled' | 'active'
    if (!uid || !status) {
      return res.status(400).json({ error: "Missing uid or status" });
    }
    const isDisabled = status === "disabled";

    await patchFirestoreDocRest(`users/${uid}`, {
      status,
      disabledAt: isDisabled ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString()
    });

    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const db = adminApp.firestore();
        await db.collection("users").doc(uid).update({
          status,
          disabledAt: isDisabled ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString()
        });
        await adminApp.auth().updateUser(uid, { disabled: isDisabled });
        if (isDisabled) {
          await adminApp.auth().revokeRefreshTokens(uid);
        }
      }
    } catch (authErr: any) {
      console.warn("[toggle-user-status] Admin SDK update warning:", authErr.message);
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
    const cleanOrderNo = String(order_no).trim();

    let depositDoc = await getFirestoreDocRest("deposits", cleanOrderNo);
    let finalOrderNo = cleanOrderNo;

    if (!depositDoc) {
      if (cleanOrderNo.includes("-")) {
        const stripped = cleanOrderNo.replace(/-/g, "");
        depositDoc = await getFirestoreDocRest("deposits", stripped);
        if (depositDoc) finalOrderNo = stripped;
      } else if (cleanOrderNo.startsWith("ORD")) {
        const hyphenated = "ORD-" + cleanOrderNo.substring(3);
        depositDoc = await getFirestoreDocRest("deposits", hyphenated);
        if (depositDoc) finalOrderNo = hyphenated;
      }
    }

    if (!depositDoc || !depositDoc.data) {
      return res.status(404).json({ error: "ডিপোজিট রিকোয়েস্ট পাওয়া যায়নি।" });
    }

    const depositData = depositDoc.data;
    const uid = depositData?.uid;

    await patchFirestoreDocRest(`deposits/${finalOrderNo}`, {
      status: "rejected",
      updatedAt: new Date().toISOString()
    });

    await patchFirestoreDocRest(`transactions/${finalOrderNo}`, {
      status: "rejected",
      updatedAt: new Date().toISOString()
    });

    if (uid) {
      await patchFirestoreDocRest(`users/${uid}/history/${finalOrderNo}`, {
        status: "rejected",
        updatedAt: new Date().toISOString()
      });
    }

    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const db = adminApp.firestore();
        await db.collection("deposits").doc(finalOrderNo).set({ status: "rejected", updatedAt: new Date().toISOString() }, { merge: true });
      }
    } catch (e) {}

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

app.post("/api/auto-check-user-deposits", async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: "Missing uid" });

    let db: any = null;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch (e) {}

    const results: any[] = [];
    const runQuery = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "deposits" }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                { fieldFilter: { field: { fieldPath: "uid" }, op: "EQUAL", value: { stringValue: uid } } },
                { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "pending" } } }
              ]
            }
          },
          limit: 10
        }
      })
    });

    if (runQuery.ok) {
      const qDocs = await runQuery.json();
      if (Array.isArray(qDocs)) {
        for (const item of qDocs) {
          if (item.document) {
            const parsed = parseFirestoreDoc(item.document);
            const docName = item.document.name || "";
            const order_no = docName.split("/").pop() || parsed?.order_no;
            const method = (parsed?.method || "").toLowerCase();
            if (order_no && (method === "bkash" || method === "nagad" || method === "online")) {
              const appRes = await approveDepositHelper(db, order_no);
              results.push({ order_no, result: appRes });
            }
          }
        }
      }
    }

    const userDoc = await getFirestoreDocRest("users", uid);
    return res.json({ success: true, results, user: userDoc?.data });
  } catch (err: any) {
    console.error("[auto-check-user-deposits] Error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ProPay Callback Handler (Supports both GET and POST, multiple alias endpoints and parameter formats)
const propayCallbackHandler = async (req: express.Request, res: express.Response) => {
  try {
    const payload = { ...(req.body || {}), ...(req.query || {}) };
    let order_no = payload.order_no || payload.order_id || payload.orderId || payload.orderNo || payload.ref || payload.reference || payload.cust_order_id || payload.customer_order_id || payload.tran_id || payload.transaction_id || payload.transactionId || payload.trx_id || payload.trxid || payload.mchOrderNo || payload.order || payload.id;
    const amount = payload.amount || payload.total_amount || payload.paid_amount || payload.price || payload.sum;
    const status = payload.status || payload.txn_status || payload.state || payload.payment_status || payload.result || payload.code || "success";

    console.log('[ProPay Callback] Received payload on', req.url, payload);

    let db: any = null;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        db = adminApp.firestore();
        await db.collection("propay_logs").add({
          payload,
          timestamp: new Date().toISOString(),
          headers: req.headers,
          method: req.method,
          url: req.url
        });
      }
    } catch(e) {}

    if (!order_no) {
      console.warn('[ProPay] Missing order_no in callback payload:', payload);
      return res.status(200).send("SUCCESS");
    }

    order_no = String(order_no).trim();

    const statusStr = String(status).toLowerCase();
    const isCancelled = ['cancel', 'cancelled', 'fail', 'failed', 'rejected', '0'].includes(statusStr);

    if (isCancelled) {
      console.log('[ProPay Callback] Payment status is failed/cancelled:', statusStr);
      try {
        await patchFirestoreDocRest(`deposits/${order_no}`, { status: "cancelled", updatedAt: new Date().toISOString() });
        await patchFirestoreDocRest(`transactions/${order_no}`, { status: "cancelled", updatedAt: new Date().toISOString() });
      } catch (e) {}
      return res.status(200).send("SUCCESS");
    }

    // Approve the deposit automatically
    const result = await approveDepositHelper(db, order_no, Number(amount) || undefined);
    console.log('[ProPay Callback] Approval result for order', order_no, result);

    return res.status(200).send("SUCCESS");
  } catch (err: any) {
    console.error('[ProPay Callback Error]:', err);
    return res.status(200).send("SUCCESS");
  }
};

app.all("/api/propay-callback", upload.none(), propayCallbackHandler);
app.all("/api/payment-callback", upload.none(), propayCallbackHandler);
app.all("/api/payment/callback", upload.none(), propayCallbackHandler);
app.all("/api/callback", upload.none(), propayCallbackHandler);
app.all("/api/ipn", upload.none(), propayCallbackHandler);
app.all("/propay-callback", upload.none(), propayCallbackHandler);
app.all("/payment-callback", upload.none(), propayCallbackHandler);
app.all("/callback", upload.none(), propayCallbackHandler);

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

app.all("/success", async (req, res) => {
  const payload = { ...(req.query || {}), ...(req.body || {}) };
  const order_no = payload.order_no || payload.order_id || payload.ref || payload.cust_order_id || payload.reference;
  if (order_no) {
    try {
      let db: any = null;
      try {
        const adminApp = getFirebaseAdmin();
        if (adminApp) db = adminApp.firestore();
      } catch (e) {}
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

app.all("/fail", (req, res) => {
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
      const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      try {
        const pendingDocs: { id: string, data: any }[] = [];
        try {
          const runQuery = await fetch(`${FIRESTORE_BASE_URL}:runQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: "deposits" }],
                where: {
                  fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "pending" } }
                }
              }
            })
          });
          if (runQuery.ok) {
            const resJson = await runQuery.json();
            if (Array.isArray(resJson)) {
              resJson.forEach((item: any) => {
                if (item.document) {
                  const docId = item.document.name.split("/").pop();
                  const data = parseFirestoreDoc(item.document);
                  if (docId && data) pendingDocs.push({ id: docId, data });
                }
              });
            }
          }
        } catch (e) {
          console.error("[Cron] REST query error:", e);
        }

        console.log(`[Cron] Found ${pendingDocs.length} pending deposits`);
        for (const item of pendingDocs) {
          const depositId = item.id;
          const data = item.data;
          let createdDate = data.timestamp || data.createdAt;
          if (createdDate && typeof createdDate === "string") {
            // valid string
          } else {
            continue;
          }
          if (createdDate && createdDate < sixtyMinutesAgo) {
            const uid = data.uid;
            await patchFirestoreDocRest(`deposits/${depositId}`, { status: "cancelled" });
            console.log(`[Cron] Auto-cancelled deposits/${depositId}`);
            await patchFirestoreDocRest(`transactions/${depositId}`, { status: "cancelled" });
            if (uid) {
              await patchFirestoreDocRest(`users/${uid}/history/${depositId}`, { status: "cancelled" });
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