const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const oldBlock = '  R.useEffect(() => {\n    if (!gt.currentUser) return;\n    const E = new URLSearchParams(window.location.search),\n      L = E.get("order_no"),\n      ee = E.get("m");\n    if (L && (L.startsWith("deposit_") || L.startsWith("ORD"))) {';

  const newBlock = '  R.useEffect(() => {\n    const E = new URLSearchParams(window.location.search),\n      L = E.get("order_no"),\n      ee = E.get("m");\n    if (L && (L.startsWith("deposit_") || L.startsWith("ORD"))) {\n      fetch("/api/verify-payment", {\n        method: "POST",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify({ order_no: L })\n      }).catch((vErr) => console.error("Immediate verify payment call error:", vErr));\n    }\n    if (!gt.currentUser) return;\n    if (L && (L.startsWith("deposit_") || L.startsWith("ORD"))) {';

  if (content.includes(oldBlock)) {
    content = content.replace(oldBlock, newBlock);
    console.log(`[Unconditional Verify] Patched ${filePath}`);
  } else {
    console.warn(`[Unconditional Verify] Block not found in ${filePath}`);
  }

  // 2. Ensure return_url uses /success endpoint so server route auto-approves on redirect
  const target2 = 'Ke = `${qe}?m=1&order_no=${Te}`';
  const replace2 = 'Ke = `${qe}/success?m=1&order_no=${Te}`';

  if (content.includes(target2)) {
    content = content.replace(target2, replace2);
    console.log(`[return_url] Successfully updated return_url to /success in ${filePath}`);
  } else {
    console.warn(`[return_url] Target 2 not found in ${filePath}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

patchFile('test_cand.js');
