const fs = require("fs");

let server = fs.readFileSync("server.ts", "utf8");

// 1. verify-payment
const oldVerify = `    if (db) {
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
        if (!tripFirestoreQuotaCircuit(dbErr, "verify-payment")) { console.warn("[verify-payment] Firestore read warning:", dbErr?.message || dbErr); }
      }
    }`;

const newVerify = `    if (db && !isFirestoreQuotaExceeded()) {
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
        handleFirestoreError(dbErr, "verify-payment");
      }
    }`;

if (server.includes(oldVerify)) {
  server = server.replace(oldVerify, newVerify);
  console.log("Replaced verify-payment Firestore block.");
} else {
  console.log("oldVerify not matched directly.");
}

// 2. auto-check-user-deposits
const oldAuto = `    if (db) {
      try {
        const uSnap = await db.collection("users").doc(uid).get();
        if (uSnap.exists) userDocData = uSnap.data();
      } catch (err: any) {}

      try {
        const depSnap = await db.collection("deposits").where("uid", "==", uid).limit(5).get();`;

const newAuto = `    if (db && !isFirestoreQuotaExceeded()) {
      try {
        const uSnap = await db.collection("users").doc(uid).get();
        if (uSnap.exists) userDocData = uSnap.data();
      } catch (err: any) {
        handleFirestoreError(err, "auto-check-user-doc");
      }

      try {
        const depSnap = await db.collection("deposits").where("uid", "==", uid).limit(5).get();`;

if (server.includes(oldAuto)) {
  server = server.replace(oldAuto, newAuto);
  console.log("Replaced auto-check-user-deposits Firestore block.");
} else {
  console.log("oldAuto not matched directly.");
}

fs.writeFileSync("server.ts", server, "utf8");
