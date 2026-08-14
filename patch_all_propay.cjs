const fs = require('fs');

function applyPatches(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Patch ProPay checkout URL parameters
  const oldParams = 'wt = new URLSearchParams({\n            api_key: Ne,\n            uid: gt.currentUser.uid,\n            amount: Number(E).toFixed(2),\n            order_no: Te,\n            return_url: Ke,\n            pass_through_key: Ne,\n            pass_through_callback_url: Ue,\n          });';
  
  const newParams = 'wt = new URLSearchParams({\n            api_key: Ne,\n            uid: gt.currentUser.uid,\n            amount: Number(E).toFixed(2),\n            order_no: Te,\n            return_url: Ke,\n            success_url: Ke,\n            cancel_url: `${qe}/fail?order_no=${Te}`,\n            callback_url: Ue,\n            webhook_url: Ue,\n            notify_url: Ue,\n            ipn_url: Ue,\n            pass_through_key: Ne,\n            pass_through_callback_url: Ue,\n          });\n          try { localStorage.setItem("sn777_pending_order", JSON.stringify({ order_no: Te, amount: Number(E), time: Date.now() })); } catch(e) {}';

  if (content.includes(oldParams)) {
    content = content.replace(oldParams, newParams);
    console.log(`[Patch 1] Updated ProPay URL parameters in ${filePath}`);
  } else {
    // Try single-line version if formatted differently
    const singleLineOld = 'wt = new URLSearchParams({ api_key: Ne, uid: gt.currentUser.uid, amount: Number(E).toFixed(2), order_no: Te, return_url: Ke, pass_through_key: Ne, pass_through_callback_url: Ue, })';
    if (content.includes(singleLineOld)) {
      content = content.replace(singleLineOld, newParams);
      console.log(`[Patch 1 SingleLine] Updated ProPay URL parameters in ${filePath}`);
    } else {
      console.warn(`[Patch 1] Old params block not found in ${filePath}`);
    }
  }

  // 2. Patch localStorage check on app load for pending orders
  const loadCheckOld = '    if (!gt.currentUser) return;\n    if (L && (L.startsWith("deposit_") || L.startsWith("ORD"))) {';

  const loadCheckNew = '    try {\n      const storedPending = localStorage.getItem("sn777_pending_order");\n      if (storedPending) {\n        const pData = JSON.parse(storedPending);\n        if (pData?.order_no && Date.now() - (pData.time || 0) < 7200000) {\n          fetch("/api/verify-payment", {\n            method: "POST",\n            headers: { "Content-Type": "application/json" },\n            body: JSON.stringify({ order_no: pData.order_no })\n          })\n          .then(r => r.json())\n          .then(res => {\n            if (res.status === "approved" || res.success) {\n              localStorage.removeItem("sn777_pending_order");\n              if (gt.currentUser) {\n                En(We(Ie, "users", gt.currentUser.uid)).then(uDoc => {\n                  if (uDoc.exists()) {\n                    const uD = uDoc.data();\n                    ss(prev => prev ? { ...prev, balance: uD.balance, totalDeposited: uD.totalDeposited } : null);\n                  }\n                });\n              }\n            }\n          })\n          .catch(() => {});\n        }\n      }\n    } catch(e) {}\n    if (!gt.currentUser) return;\n    if (L && (L.startsWith("deposit_") || L.startsWith("ORD"))) {';

  if (content.includes(loadCheckOld)) {
    content = content.replace(loadCheckOld, loadCheckNew);
    console.log(`[Patch 2] Added localStorage auto-checker on load in ${filePath}`);
  } else {
    console.warn(`[Patch 2] loadCheckOld not found in ${filePath}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

applyPatches('test_cand.js');
