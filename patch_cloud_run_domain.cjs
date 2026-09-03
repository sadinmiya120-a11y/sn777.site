const fs = require("fs");
const esbuild = require("esbuild");

const BACKEND_URL = "https://sn777-site-864935185164.us-west1.run.app";

const jsFiles = [
  "dist/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist_backup/assets/index-CUhzlpga-v3.js"
];

jsFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  // If not already injected at top of JS bundle
  if (!code.includes("window.BACKEND_API_BASE")) {
    const headerCode = `
(function() {
  if (typeof window !== "undefined") {
    var isLocalOrRunApp = window.location.hostname.includes("run.app") || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    window.BACKEND_API_BASE = isLocalOrRunApp ? "" : "${BACKEND_URL}";
    
    var origFetch = window.fetch;
    if (origFetch) {
      var customFetch = function(input, init) {
        if (typeof input === "string") {
          if (input.startsWith("/api/") || input.startsWith("/gopay_pay.php") || input.startsWith("/pay.php") || input.startsWith("/pay1/")) {
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
        } catch (e2) {
          try {
            Object.defineProperty(Window.prototype, "fetch", {
              value: customFetch,
              writable: true,
              configurable: true,
              enumerable: true
            });
          } catch (e3) {}
        }
      }
    }
  }
})();
`;
    code = headerCode + code;
  }

  // 1. Direct hardcoded fallback if BACKEND_API_BASE is undefined in any context
  code = code.replace(
    /\$\{window\.BACKEND_API_BASE\|\|""\}\/gopay_pay\.php/g,
    '${(typeof window!=="undefined"&&window.BACKEND_API_BASE)?window.BACKEND_API_BASE:"' + BACKEND_URL + '"}/gopay_pay.php'
  );
  code = code.replace(
    /\/gopay_pay\.php\?uid=/g,
    BACKEND_URL + '/gopay_pay.php?uid='
  );

  // 2. Also ensure any /gopay_pay.php strings directly use the full Cloud Run backend URL
  code = code.replace(
    /`\/gopay_pay\.php/g,
    '`' + BACKEND_URL + '/gopay_pay.php'
  );
  code = code.replace(
    /"\/gopay_pay\.php"/g,
    '"' + BACKEND_URL + '/gopay_pay.php"'
  );
  code = code.replace(
    /'\/gopay_pay\.php'/g,
    "'" + BACKEND_URL + "/gopay_pay.php'"
  );

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
