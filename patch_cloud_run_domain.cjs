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

  // If not already injected at top of JS bundle
  if (!code.includes("window.BACKEND_API_BASE")) {
    const headerCode = `
(function() {
  if (typeof window !== "undefined") {
    var isLocalOrRunApp = window.location.hostname.includes("run.app") || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    window.BACKEND_API_BASE = isLocalOrRunApp ? "" : "${BACKEND_URL}";
    
    var origFetch = window.fetch;
    if (typeof origFetch === "function") {
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
        Object.defineProperty(window, "fetch", {
          value: customFetch,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (e) {
        try { window.fetch = customFetch; } catch (err) {}
      }
    }
  }
})();
`;
    code = headerCode + code;
  }

  // Sanitization: Clean up any repeated/corrupted domain prefixes first
  code = code.replace(/(?:https?:\/\/[a-zA-Z0-9_.-]+)+\/gopay_pay\.php/g, "/gopay_pay.php");
  code = code.replace(/https:\/\/sn777\.sitehttps:\/\/sn777\.site/g, "");
  code = code.replace(/sn777\.sitehttps/g, "");

  // Set clean explicit backend URL https://sn777.site/gopay_pay.php for payment redirects
  code = code.replace(/jt="\/gopay_pay\.php"/g, 'jt="https://sn777.site/gopay_pay.php"');
  code = code.replace(/Le=`\/gopay_pay\.php\?/g, 'Le=`https://sn777.site/gopay_pay.php?');
  code = code.replace(/window\.location\.assign\("\/gopay_pay\.php\?/g, 'window.location.assign("https://sn777.site/gopay_pay.php?');

  // Deposit limit and preset options patch
  code = code.replace(/সীমা:\s*৳৩০০\s*-\s*৳২৫,০০০/g, "সীমা: ৳২০০ - ৳২৫,০০০");
  code = code.replace(/সীমা:\s*৳৫০০\s*-\s*৳২৫,০০০/g, "সীমা: ৳২০০ - ৳২৫,০০০");
  if (code.includes('ya=[{amount:"500",displayOrig:"500",total:"500",bonusPercent:""}')) {
    code = code.replace(
      'ya=[{amount:"500",displayOrig:"500",total:"500",bonusPercent:""}',
      'ya=[{amount:"200",displayOrig:"200",total:"200",bonusPercent:""},{amount:"300",displayOrig:"300",total:"300",bonusPercent:""},{amount:"400",displayOrig:"400",total:"400",bonusPercent:""},{amount:"500",displayOrig:"500",total:"500",bonusPercent:""}'
    );
  }
  code = code.replace(/ee=L\?500:300/g, "ee=L?500:200");
  code = code.replace(/children:"৩০০ টাকা"\}/g, 'children:"২০০ টাকা"}');

  try {
    esbuild.transformSync(code, { loader: "js" });
    fs.writeFileSync(filePath, code, "utf8");
    console.log(`[${filePath}] Successfully sanitized & patched domain/deposit limits.`);
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
  html = html.replace(/index-sn777-v5\.js\?v=\d+/g, `index-sn777-v5.js?v=${Date.now()}`);
  fs.writeFileSync("dist/index.html", html, "utf8");
  console.log("Updated dist/index.html");
}
