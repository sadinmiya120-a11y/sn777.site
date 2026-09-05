const fs = require("fs");

let server = fs.readFileSync("server.ts", "utf8");

// Remove the first duplicate block
const firstBlock = `// Firestore Quota Circuit Breaker & Health Guard
let firestoreQuotaExceededUntil = 0;
function isFirestoreQuotaExhausted(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err);
  const code = err.code;
  return (
    code === 8 ||
    code === "8" ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Quota exceeded") ||
    msg.includes("Deadline exceeded")
  );
}
function tripFirestoreQuotaCircuit(err: any, context?: string) {
  if (isFirestoreQuotaExhausted(err)) {
    // Silence repetitive logs and pause Firestore reads/writes for 5 minutes
    firestoreQuotaExceededUntil = Date.now() + 5 * 60 * 1000;
    console.warn(\`[Firestore Circuit Breaker] Quota exhausted (\${context || "query"}). Pausing Firestore requests for 5 minutes; using local JSON store fallback.\`);
    return true;
  }
  return false;
}
function isFirestoreCircuitOpen(): boolean {
  return Date.now() < firestoreQuotaExceededUntil;
}
// Firebase Admin initialization (lazy)`;

if (server.includes(firstBlock)) {
  server = server.replace(firstBlock, "// Firebase Admin initialization (lazy)");
  console.log("Removed duplicate earlier block.");
} else {
  console.log("firstBlock not matched directly.");
}

// Make sure isFirestoreCircuitOpen and tripFirestoreQuotaCircuit point to the single implementation if referenced elsewhere
const unifiedCircuit = `// Firestore Quota Circuit Breaker & Safety Mechanism
let firestoreQuotaExceededUntil = 0;
export function isFirestoreQuotaExceeded(): boolean {
  return Date.now() < firestoreQuotaExceededUntil;
}
export function isFirestoreCircuitOpen(): boolean {
  return isFirestoreQuotaExceeded();
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
export function tripFirestoreQuotaCircuit(err: any, context = "") {
  return handleFirestoreError(err, context);
}
`;

const secondBlockStart = "// Firestore Quota Circuit Breaker & Safety Mechanism";
const secondBlockEnd = "export function handleFirestoreError(err: any, context = \"\") {";
// Replace second block up to handleFirestoreError
const idxStart = server.indexOf(secondBlockStart);
if (idxStart !== -1) {
  const idxFuncEnd = server.indexOf("function getFirebaseAdmin()", idxStart);
  if (idxFuncEnd !== -1) {
    server = server.substring(0, idxStart) + unifiedCircuit + server.substring(idxFuncEnd);
    console.log("Unified circuit breaker installed cleanly.");
  }
}

fs.writeFileSync("server.ts", server, "utf8");
