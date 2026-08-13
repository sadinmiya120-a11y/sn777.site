const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add fetch("/api/verify-payment") call on client-side when returning with order_no
  const target1 = 'if (Ne.status === "pending") {\n                  const Ke = Ne.uid;\n                  if (\n                    Ke === ((ye = gt.currentUser) == null ? void 0 : ye.uid)\n                  ) {\n                    sr(\n                      "পেমেন্ট যাচাই করা হচ্ছে, অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন... (ভেরিফাই সম্পন্ন হলে অটো ব্যালেন্স এড হবে)",\n                    );\n                    Er(!0);';

  const replace1 = 'if (Ne.status === "pending") {\n                  const Ke = Ne.uid;\n                  if (\n                    Ke === ((ye = gt.currentUser) == null ? void 0 : ye.uid)\n                  ) {\n                    sr(\n                      "পেমেন্ট যাচাই করা হচ্ছে, অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন... (ভেরিফাই সম্পন্ন হলে অটো ব্যালেন্স এড হবে)",\n                    );\n                    Er(!0);\n                    fetch("/api/verify-payment", {\n                      method: "POST",\n                      headers: { "Content-Type": "application/json" },\n                      body: JSON.stringify({ order_no: L })\n                    }).catch((vErr) => console.error("Verify payment call error:", vErr));';

  if (content.includes(target1)) {
    content = content.replace(target1, replace1);
    console.log(`[1] Successfully added verify-payment call to ${filePath}`);
  } else {
    console.warn(`[1] Target 1 not found in ${filePath}`);
  }

  // 2. Ensure return_url uses /success endpoint so server route auto-approves on redirect
  const target2 = 'Ke = `${qe}?m=1&order_no=${Te}`';
  const replace2 = 'Ke = `${qe}/success?m=1&order_no=${Te}`';

  if (content.includes(target2)) {
    content = content.replace(target2, replace2);
    console.log(`[2] Successfully updated return_url to /success in ${filePath}`);
  } else {
    console.warn(`[2] Target 2 not found in ${filePath}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

patchFile('test_cand.js');
patchFile('dist_backup/assets/index-CUhzlpga-v3.js');
