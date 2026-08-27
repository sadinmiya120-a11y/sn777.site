const fs = require("fs");
const esbuild = require("esbuild");

const BACKEND_URL = "https://sn777-site-864935185164.us-west1.run.app";

// 1. Patch dist/index.html
if (fs.existsSync("dist/index.html")) {
  let html = fs.readFileSync("dist/index.html", "utf8");
  
  const scriptInjection = `
    <script>
      (function() {
        var isLocalOrRunApp = window.location.hostname.includes("run.app") || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        window.BACKEND_API_BASE = isLocalOrRunApp ? "" : "${BACKEND_URL}";
        
        var originalFetch = window.fetch;
        window.fetch = function(input, init) {
          if (typeof input === "string") {
            if (input.startsWith("/api/") || input.startsWith("/gopay_pay.php") || input.startsWith("/pay.php") || input.startsWith("/pay1/")) {
              input = window.BACKEND_API_BASE + input;
            }
          } else if (input instanceof Request) {
            var url = input.url;
            var path = new URL(url, window.location.href).pathname;
            if (path.startsWith("/api/") || path.startsWith("/gopay_pay.php") || path.startsWith("/pay.php") || path.startsWith("/pay1/")) {
              if (window.BACKEND_API_BASE) {
                input = new Request(window.BACKEND_API_BASE + path + (new URL(url).search), input);
              }
            }
          }
          return originalFetch.call(this, input, init);
        };
      })();
    </script>
`;

  if (!html.includes("window.BACKEND_API_BASE")) {
    html = html.replace("<head>", "<head>" + scriptInjection);
    fs.writeFileSync("dist/index.html", html, "utf8");
    console.log("Patched dist/index.html with BACKEND_API_BASE and fetch interceptor.");
  }
}

// 2. Patch JS bundles
const jsFiles = [
  "dist/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist_backup/assets/index-CUhzlpga-v3.js"
];

jsFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, "utf8");

  // Replace /gopay_pay.php navigation
  // Pattern 1: window.location.href=`/gopay_pay.php
  code = code.replace(
    /window\.location\.href=`\/gopay_pay\.php/g,
    'window.location.href=`${window.BACKEND_API_BASE||""}/gopay_pay.php'
  );

  // Pattern 2: Le=`/gopay_pay.php
  code = code.replace(
    /Le=`\/gopay_pay\.php/g,
    'Le=`${window.BACKEND_API_BASE||""}/gopay_pay.php'
  );

  // Pattern 3: jt=Be==="bkash"?"/gopay_pay.php":"/gopay_pay.php"
  code = code.replace(
    /jt=Be==="bkash"\?"\/gopay_pay\.php":"\/gopay_pay\.php"/g,
    'jt=`${window.BACKEND_API_BASE||""}/gopay_pay.php`'
  );

  try {
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(filePath, code, "utf8");
    console.log(`[${filePath}] Successfully patched and verified with esbuild.`);
  } catch (err) {
    console.error(`[${filePath}] Build error:`, err.message);
  }
});

console.log("All patches applied successfully.");
