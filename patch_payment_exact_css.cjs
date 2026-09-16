const fs = require("fs");

const cssContent = `
/* EXACT DEPOSIT PAYMENT GATEWAY STYLES MATCHING SCREENSHOT */
.sn-pay-page-wrapper { background-color: #ffffff !important; min-height: 100vh !important; width: 100% !important; display: flex !important; justify-content: center !important; }
.sn-pay-card { width: 100% !important; max-width: 448px !important; background-color: #ffffff !important; min-height: 100vh !important; padding-bottom: 60px !important; display: flex !important; flex-direction: column !important; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }

.sn-pay-topbar { background-color: #00684a !important; color: #ffffff !important; padding: 14px 16px !important; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important; }
.sn-pay-topbar-row { display: flex !important; justify-content: space-between !important; align-items: center !important; }
.sn-pay-amount-title { font-size: 26px !important; font-weight: 700 !important; color: #ffffff !important; line-height: 1.2 !important; letter-spacing: -0.02em !important; }
.sn-pay-amount-desc { font-size: 13px !important; font-weight: 500 !important; color: #ffffff !important; opacity: 0.95 !important; margin-top: 3px !important; }
.sn-pay-topbar-right { display: flex !important; flex-direction: column !important; align-items: flex-end !important; gap: 6px !important; }
.sn-pay-service-btn { background-color: #004e36 !important; color: #ffffff !important; font-size: 11px !important; font-weight: 700 !important; padding: 4px 10px !important; border-radius: 4px !important; border: none !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; cursor: pointer !important; }
.sn-pay-lang-container { display: flex !important; align-items: center !important; gap: 6px !important; }
.sn-pay-lang-badge { background-color: #ffffff !important; color: #00684a !important; font-size: 11px !important; font-weight: 700 !important; padding: 2px 8px !important; border-radius: 4px !important; line-height: 1.4 !important; user-select: none !important; }

.sn-pay-pink-alert-wrap { padding: 14px 16px 10px 16px !important; }
.sn-pay-pink-alert { background-color: #fff5f5 !important; border: 1px solid #fed7d7 !important; border-radius: 8px !important; padding: 10px 14px !important; text-align: center !important; color: #d1293d !important; font-weight: 700 !important; font-size: 13.5px !important; line-height: 1.45 !important; }

.sn-pay-brand-banner { width: 100% !important; display: flex !important; align-items: center !important; justify-content: space-between !important; padding: 10px 16px !important; color: #ffffff !important; }
.sn-pay-banner-bkash { background-color: #941f6e !important; }
.sn-pay-banner-nagad { background-color: #eb1c24 !important; }
.sn-pay-banner-rocket { background-color: #8c1569 !important; }
.sn-pay-banner-left { display: flex !important; align-items: center !important; gap: 14px !important; }
.sn-pay-brand-logo-box { width: 52px !important; height: 52px !important; background-color: #ffffff !important; border-radius: 14px !important; display: flex !important; align-items: center !important; justify-content: center !important; padding: 6px !important; flex-shrink: 0 !important; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important; overflow: hidden !important; }
.sn-pay-brand-logo-img { max-width: 100% !important; max-height: 100% !important; object-fit: contain !important; }
.sn-pay-brand-title { font-weight: 700 !important; font-size: 19px !important; color: #ffffff !important; letter-spacing: 0.3px !important; }
.sn-pay-close-btn { background: none !important; border: none !important; color: rgba(255, 255, 255, 0.85) !important; cursor: pointer !important; padding: 4px !important; display: flex !important; align-items: center !important; }

.sn-pay-instructions-wrap { padding: 16px 16px 8px 16px !important; }
.sn-pay-instructions-p { font-size: 14px !important; color: #1e293b !important; line-height: 1.55 !important; margin: 0 !important; }
.sn-pay-instructions-strong { font-weight: 700 !important; color: #0f172a !important; }

.sn-pay-wallet-row { padding: 8px 16px 6px 16px !important; display: flex !important; align-items: center !important; gap: 6px !important; flex-wrap: wrap !important; }
.sn-pay-wallet-label { font-weight: 700 !important; color: #0f172a !important; font-size: 14px !important; }
.sn-pay-wallet-sub { font-size: 12.5px !important; color: #64748b !important; font-weight: 400 !important; }
.sn-pay-required-star { color: #ef4444 !important; font-weight: 700 !important; font-size: 14px !important; }

.sn-pay-sendmoney-wrap { padding: 0 16px 12px 16px !important; }
.sn-pay-sendmoney-card { background-color: #fff5f5 !important; border-left: 4px solid #d81b60 !important; border-top: 1px solid #fed7d7 !important; border-right: 1px solid #fed7d7 !important; border-bottom: 1px solid #fed7d7 !important; border-radius: 0 6px 6px 0 !important; padding: 10px 14px !important; color: #c2185b !important; font-weight: 700 !important; font-size: 13px !important; line-height: 1.4 !important; }

.sn-pay-number-wrap { padding: 0 16px 14px 16px !important; }
.sn-pay-number-box { background-color: #f0f4f8 !important; border: 1px solid #cbd5e1 !important; border-radius: 12px !important; padding: 8px 14px !important; display: flex !important; align-items: center !important; justify-content: space-between !important; }
.sn-pay-number-text { font-size: 19px !important; font-weight: 700 !important; color: #0f172a !important; letter-spacing: 0.5px !important; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; user-select: all !important; }
.sn-pay-copy-btn { display: flex !important; align-items: center !important; gap: 6px !important; background-color: #c6f6d5 !important; color: #065f46 !important; padding: 8px 16px !important; border-radius: 8px !important; font-weight: 700 !important; font-size: 13.5px !important; border: none !important; cursor: pointer !important; }

.sn-pay-trx-label-row { padding: 6px 16px 6px 16px !important; display: flex !important; align-items: center !important; gap: 4px !important; }
.sn-pay-trx-label { font-weight: 700 !important; color: #0f172a !important; font-size: 14.5px !important; }

.sn-pay-trx-input-wrap { padding: 0 16px 14px 16px !important; }
.sn-pay-trx-input { width: 100% !important; box-sizing: border-box !important; background-color: #ffffff !important; border: 1.5px solid #f87171 !important; border-radius: 10px !important; height: 50px !important; padding: 0 16px !important; font-weight: 700 !important; color: #1e293b !important; font-size: 15px !important; outline: none !important; letter-spacing: 0.5px !important; text-transform: uppercase !important; }
.sn-pay-trx-input::placeholder { color: #9ca3af !important; font-weight: 400 !important; text-transform: none !important; }

.sn-pay-warning-wrap { padding: 0 16px 16px 16px !important; }
.sn-pay-warning-box { background-color: #fff5f5 !important; border: 1px solid #fed7d7 !important; border-radius: 10px !important; padding: 12px 16px !important; text-align: center !important; }
.sn-pay-warning-title { color: #1e293b !important; font-weight: 700 !important; font-size: 13.5px !important; margin-bottom: 3px !important; }
.sn-pay-warning-desc { color: #dc2626 !important; font-weight: 700 !important; font-size: 12.5px !important; line-height: 1.4 !important; }

.sn-pay-submit-wrap { padding: 0 16px 12px 16px !important; }
.sn-pay-submit-btn { width: 100% !important; box-sizing: border-box !important; height: 50px !important; border-radius: 9999px !important; font-weight: 700 !important; font-size: 18px !important; border: none !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15) !important; color: #ffffff !important; }
.sn-pay-btn-bkash { background-color: #c2185b !important; }
.sn-pay-btn-nagad { background-color: #eb1c24 !important; }
.sn-pay-btn-rocket { background-color: #8c1569 !important; }

.sn-pay-back-wrap { text-align: center !important; padding: 4px 0 20px 0 !important; }
.sn-pay-back-btn { background: none !important; border: none !important; font-size: 12px !important; font-weight: 700 !important; color: #64748b !important; text-decoration: underline !important; cursor: pointer !important; }
`;

// 1. Inject into CSS files
const cssFiles = [
  "dist/assets/index-C0XgLZC6-v3.css",
  "dist_backup/assets/index-C0XgLZC6-v3.css"
];

for (const f of cssFiles) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, "utf8");
    if (!content.includes("sn-pay-topbar")) {
      content += "\n" + cssContent;
      fs.writeFileSync(f, content, "utf8");
      console.log("Injected CSS into:", f);
    } else {
      // Replace existing snippet
      const marker = "/* EXACT DEPOSIT PAYMENT GATEWAY STYLES MATCHING SCREENSHOT */";
      const idx = content.indexOf(marker);
      if (idx !== -1) {
        content = content.substring(0, idx) + cssContent;
        fs.writeFileSync(f, content, "utf8");
        console.log("Updated CSS in:", f);
      }
    }
  }
}

// 2. Inject into HTML files
const htmlFiles = ["dist/index.html", "dist_backup/index.html"];
const styleTag = `<style id="sn777-payment-styles">${cssContent}</style>`;

for (const h of htmlFiles) {
  if (fs.existsSync(h)) {
    let html = fs.readFileSync(h, "utf8");
    if (html.includes('id="sn777-payment-styles"')) {
      html = html.replace(/<style id="sn777-payment-styles">[\s\S]*?<\/style>/, styleTag);
      fs.writeFileSync(h, html, "utf8");
      console.log("Updated style tag in:", h);
    } else if (html.includes("</head>")) {
      html = html.replace("</head>", styleTag + "\n</head>");
      fs.writeFileSync(h, html, "utf8");
      console.log("Injected style tag into head in:", h);
    }
  }
}
