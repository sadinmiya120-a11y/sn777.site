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
    window.BACKEND_API_BASE = "";
    
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

  // Sanitization: Clean up any repeated/corrupted domain prefixes
  code = code.replace(/(?:https?:\/\/[a-zA-Z0-9_.-]+)+\/gopay_pay\.php/g, "/gopay_pay.php");
  code = code.replace(/https:\/\/sn777\.sitehttps:\/\/sn777\.site/g, "");
  code = code.replace(/sn777\.sitehttps/g, "");

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

  // Replace window.location.assign("/gopay_pay.php...") with API fetch to avoid SPA route navigation error on sn777.site
  const assignRegex = /window\.location\.assign\("\/gopay_pay\.php\?uid="\s*\+\s*encodeURIComponent\(([^)]+)\)\s*\+\s*"&amount="\s*\+\s*encodeURIComponent\(([^)]+)\)\s*\+\s*"&method="\s*\+\s*encodeURIComponent\(([^)]+)\)\s*\+\s*"&order_no="\s*\+\s*encodeURIComponent\(([^)]+)\)\)/g;
  const assignReplacement = `(async function() {
    var _payUrl = "/api/gopay_pay?uid=" + encodeURIComponent($1) + "&amount=" + encodeURIComponent($2) + "&method=" + encodeURIComponent($3) + "&order_no=" + encodeURIComponent($4);
    if (window.BACKEND_API_BASE) {
      _payUrl = window.BACKEND_API_BASE + _payUrl;
    }
    try {
      var _res = await fetch(_payUrl, { headers: { "Accept": "application/json" } });
      var _data = await _res.json();
      if (_data && (_data.redirect_url || _data.payInfo)) {
        window.location.href = _data.redirect_url || _data.payInfo;
        return;
      } else if (_data && _data.error) {
        alert("পেমেন্ট এরর: " + _data.error);
        return;
      }
    } catch (_e) {
      console.error("GOPay fetch error:", _e);
    }
    window.location.href = _payUrl;
  })()`;
  code = code.replace(assignRegex, assignReplacement);

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
