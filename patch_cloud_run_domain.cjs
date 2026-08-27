const fs = require("fs");
const esbuild = require("esbuild");

const BACKEND_URL = "https://sn777.site";

const jsFiles = [
  "dist/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist_backup/assets/index-CUhzlpga-v3.js"
];

jsFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  // Remove any old/existing isLocalOrRunApp block to avoid duplicates and replace with safe version
  code = code.replace(/\(function\(\)\s*\{\s*if\s*\(typeof\s*window\s*!==\s*"undefined"\)\s*\{\s*var\s*isLocalOrRunApp[\s\S]*?\}\s*\}\)\(\);?\s*/g, "");

  const headerCode = `
(function() {
  if (typeof window !== "undefined") {
    var isLocalOrRunApp = window.location.hostname.includes("run.app") || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    try {
      window.BACKEND_API_BASE = isLocalOrRunApp ? "" : "${BACKEND_URL}";
    } catch(e) {}
    
    var origFetch = window.fetch;
    if (origFetch) {
      var customFetch = function(input, init) {
        if (typeof input === "string") {
          // ONLY prepend if it is a relative path AND doesn't already have the domain
          if ((input.startsWith("/api/") || input.startsWith("/gopay_pay.php") || input.startsWith("/pay.php") || input.startsWith("/pay1/")) && !input.startsWith("http")) {
            if (window.BACKEND_API_BASE) {
              input = window.BACKEND_API_BASE + input;
            }
          }
        }
        return origFetch.call(this, input, init);
      };
      try {
        window.fetch = customFetch;
      } catch (e) {
        try {
          Object.defineProperty(window, "fetch", {
            value: customFetch,
            writable: true,
            configurable: true,
            enumerable: true
          });
        } catch (err) {
          console.warn("[Auth Proxy Client Patch Warning] Failed to patch window.fetch via DefineProperty:", err);
        }
      }
    }
  }
})();
`;
  code = headerCode + code;

  // Collapse repeated domains (Cleanup)
  code = code.replace(/(https:\/\/sn777\.site)+/g, BACKEND_URL);
  
  // 1. Direct hardcoded fallback if BACKEND_API_BASE is undefined in any context
  // Use a temporary marker to ensure idempotency
  code = code.replace(
    /\$\{window\.BACKEND_API_BASE\|\|""\}\/gopay_pay\.php/g,
    '${(typeof window!=="undefined"&&window.BACKEND_API_BASE)?window.BACKEND_API_BASE:"' + BACKEND_URL + '"}/gopay_pay.php'
  );

  // Normalize all occurrences to absolute URLs safely
  // First, find all /gopay_pay.php and ensure they are absolute, but only if they are not already
  // We can do this by first removing the domain if it exists, then adding it.
  code = code.replace(/https:\/\/sn777\.site\/gopay_pay\.php/g, "/gopay_pay.php");
  code = code.replace(/\/gopay_pay\.php/g, BACKEND_URL + "/gopay_pay.php");

  try {
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(filePath, code, "utf8");
    console.log(`[${filePath}] Successfully hardcoded Cloud Run URL into bundle.`);
  } catch (err) {
    console.error(`[${filePath}] Error:`, err.message);
  }
});

// Update index.html as well
if (fs.existsSync("dist/index.html")) {
  let html = fs.readFileSync("dist/index.html", "utf8");
  const scriptInjection = `
    <script>
      (function() {
        var isLocalOrRunApp = window.location.hostname.includes("run.app") || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        window.BACKEND_API_BASE = isLocalOrRunApp ? "" : "${BACKEND_URL}";
      })();
    </script>
`;
  if (!html.includes("window.BACKEND_API_BASE")) {
    html = html.replace("<head>", "<head>" + scriptInjection);
  }
  // Make sure to bump version query param to force browser cache refresh
  html = html.replace(/index-sn777-v5\.js\?v=\d+/g, `index-sn777-v5.js?v=${Date.now()}`);
  fs.writeFileSync("dist/index.html", html, "utf8");
  console.log("Updated dist/index.html");
}
