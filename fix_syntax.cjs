const fs = require("fs");
let server = fs.readFileSync("server.ts", "utf8");

// Remove the bad async insertion in auto-check-user-deposits
const badCode = `    try {
      // Background Firebase sync to avoid 20s timeouts
    (async () => {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch (e) {}`;

const goodCode = `    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) db = adminApp.firestore();
    } catch (e) {}`;

server = server.replace(badCode, goodCode);

// There might be another bad one around line 1768
const badCode2 = `    (async () => {
      try {
        // Background Firebase sync to avoid 20s timeouts
    (async () => {
      const adminApp = getFirebaseAdmin();`;
      
const goodCode2 = `    (async () => {
      try {
      const adminApp = getFirebaseAdmin();`;

server = server.replace(badCode2, goodCode2);

fs.writeFileSync("server.ts", server, "utf8");
