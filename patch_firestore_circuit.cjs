const fs = require("fs");

let server = fs.readFileSync("server.ts", "utf8");

// Check if circuit breaker is already defined
if (!server.includes("isFirestoreQuotaExceeded")) {
  const insertTarget = "function getFirebaseAdmin() {";
  const circuitBreakerCode = `// Firestore Quota Circuit Breaker & Safety Mechanism
let firestoreQuotaExceededUntil = 0;
export function isFirestoreQuotaExceeded(): boolean {
  return Date.now() < firestoreQuotaExceededUntil;
}
export function markFirestoreQuotaExceeded(cooldownMs = 5 * 60 * 1000) {
  firestoreQuotaExceededUntil = Date.now() + cooldownMs;
  console.warn(\`[Firestore CircuitBreaker] Quota exceeded. Pausing Firestore queries for \${cooldownMs / 1000}s and using resilient local storage.\`);
}
export function handleFirestoreError(err: any, context = "") {
  const msg = String(err?.message || err || "");
  const code = err?.code;
  if (code === 8 || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded")) {
    markFirestoreQuotaExceeded(5 * 60 * 1000); // 5 min cooldown
    return true;
  }
  if (context) {
    console.warn(\`[\${context}] Firestore error:\`, msg);
  }
  return false;
}

`;
  server = server.replace(insertTarget, circuitBreakerCode + insertTarget);
  console.log("Added Firestore Circuit Breaker helpers.");
}

// 1. Update /api/validate-manual-deposit to check isFirestoreQuotaExceeded() and catch Quota error
const oldValidateCheck = `    let db = null;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch (e) {}

    // 2. Strict 1-Time Usage / Duplicate Check across Database (Approved OR Pending)
    if (db) {
      try {
        const querySnap = await db.collection("deposits")
          .where("transactionId", "==", cleanTxId)
          .limit(10)
          .get();`;

const newValidateCheck = `    let db = null;
    if (!isFirestoreQuotaExceeded()) {
      try {
        const adminApp = getFirebaseAdmin();
        if (adminApp) db = adminApp.firestore();
      } catch (e) {}
    }

    // 2. Strict 1-Time Usage / Duplicate Check across Database (Approved OR Pending)
    if (db && !isFirestoreQuotaExceeded()) {
      try {
        const querySnap = await db.collection("deposits")
          .where("transactionId", "==", cleanTxId)
          .limit(10)
          .get();`;

if (server.includes(oldValidateCheck)) {
  server = server.replace(oldValidateCheck, newValidateCheck);
  console.log("Updated validate-manual-deposit db check.");
}

// Also update the catch block in validate-manual-deposit
const oldValidateCatch = `      } catch (dbErr) {
        console.warn("[validate-manual-deposit] Firestore duplicate check warning:", dbErr);
      }`;

const newValidateCatch = `      } catch (dbErr: any) {
        if (!handleFirestoreError(dbErr, "validate-manual-deposit")) {
          console.warn("[validate-manual-deposit] Firestore duplicate check warning:", dbErr?.message || dbErr);
        }
      }`;

if (server.includes(oldValidateCatch)) {
  server = server.replace(oldValidateCatch, newValidateCatch);
  console.log("Updated validate-manual-deposit catch handler.");
}

// 2. Update /api/verify-payment to check isFirestoreQuotaExceeded() and catch Quota error
const oldVerifyCheck = `    if (db) {
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
    }`;

const newVerifyCheck = `    if (db && !isFirestoreQuotaExceeded()) {
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
      } catch (dbErr: any) {
        if (!handleFirestoreError(dbErr, "verify-payment")) {
          console.warn("[verify-payment] Firestore read warning:", dbErr?.message || dbErr);
        }
      }
    }`;

if (server.includes(oldVerifyCheck)) {
  server = server.replace(oldVerifyCheck, newVerifyCheck);
  console.log("Updated verify-payment check and catch handler.");
}

// 3. Update Cron Job to check circuit breaker before querying pendingDeposits
const oldCronCheck = `    // 2. Try Firestore auto-cancel with graceful handling for Quota Exceeded / Code 8
    const adminApp = getFirebaseAdmin();
    if (!adminApp) return;
    
    try {
        const db = adminApp.firestore();
        const pendingDeposits = await db.collection('deposits')`;

const newCronCheck = `    // 2. Try Firestore auto-cancel with graceful handling for Quota Exceeded / Code 8
    if (isFirestoreQuotaExceeded()) return;
    const adminApp = getFirebaseAdmin();
    if (!adminApp) return;
    
    try {
        const db = adminApp.firestore();
        const pendingDeposits = await db.collection('deposits')`;

if (server.includes(oldCronCheck)) {
  server = server.replace(oldCronCheck, newCronCheck);
  console.log("Updated cron firestore check.");
}

// Also in cron error handler:
const oldCronCatch = `    } catch (error: any) {
        if (error?.code === 8 || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("Quota exceeded")) {
            console.warn('[Cron] Firestore quota exceeded during auto-cancel check, local transactions auto-cancelled gracefully.');
        } else {
            console.error('[Cron] Error running auto-cancel check:', error?.message || error);
        }
    }`;

const newCronCatch = `    } catch (error: any) {
        if (handleFirestoreError(error, "Cron")) {
            console.warn('[Cron] Firestore quota exceeded during auto-cancel check, local transactions auto-cancelled gracefully.');
        } else {
            console.error('[Cron] Error running auto-cancel check:', error?.message || error);
        }
    }`;

if (server.includes(oldCronCatch)) {
  server = server.replace(oldCronCatch, newCronCatch);
  console.log("Updated cron catch block.");
}

// 4. Update /api/admin/all-deposits to respect circuit breaker
const oldAdminCheck = `    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const depSnap = await adminApp.firestore().collection("deposits").limit(200).get().catch(() => ({ docs: [] }));`;

const newAdminCheck = `    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp && !isFirestoreQuotaExceeded()) {
        const depSnap = await adminApp.firestore().collection("deposits").limit(200).get().catch((err: any) => {
          handleFirestoreError(err, "admin-all-deposits");
          return { docs: [] };
        });`;

if (server.includes(oldAdminCheck)) {
  server = server.replace(oldAdminCheck, newAdminCheck);
  console.log("Updated admin all-deposits check.");
}

// 5. Update /api/auto-check-user-deposits to respect circuit breaker
const oldAutoCheck = `    if (db) {
      try {
        const uSnap = await db.collection("users").doc(uid).get();
        if (uSnap.exists) userDocData = uSnap.data();
      } catch (err: any) {}
      try {
        const depSnap = await db.collection("deposits").where("uid", "==", uid).limit(5).get();`;

const newAutoCheck = `    if (db && !isFirestoreQuotaExceeded()) {
      try {
        const uSnap = await db.collection("users").doc(uid).get();
        if (uSnap.exists) userDocData = uSnap.data();
      } catch (err: any) {
        handleFirestoreError(err, "auto-check-user-doc");
      }
      try {
        const depSnap = await db.collection("deposits").where("uid", "==", uid).limit(5).get();`;

if (server.includes(oldAutoCheck)) {
  server = server.replace(oldAutoCheck, newAutoCheck);
  console.log("Updated auto-check-user-deposits check.");
}

fs.writeFileSync("server.ts", server, "utf8");
console.log("Successfully patched server.ts with Firestore circuit breaker.");
