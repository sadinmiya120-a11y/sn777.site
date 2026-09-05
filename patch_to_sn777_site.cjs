const fs = require("fs");
const esbuild = require("esbuild");

const TARGET_DOMAIN = "https://sn777.site";
const OLD_DOMAIN = "https://sn777-site-864935185164.us-west1.run.app";

const filesToPatch = [
  "dist/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist_backup/assets/index-CUhzlpga-v3.js",
  "dist/index.html",
  "dist_backup/index.html",
  "patch_cloud_run_domain.cjs",
  "apply_assign.cjs",
  "clean_gopay_urls.cjs"
];

filesToPatch.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] ${filePath} does not exist.`);
    return;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  if (content.includes(OLD_DOMAIN)) {
    content = content.replaceAll(OLD_DOMAIN, TARGET_DOMAIN);
    modified = true;
  }

  // Also replace any old domain in Sn777.top if needed
  if (filePath.endsWith(".html")) {
    if (content.includes("Sn777.top")) {
      content = content.replaceAll("Sn777.top", "Sn777.site");
      modified = true;
    }
  }

  if (filePath.endsWith(".js")) {
    try {
      esbuild.transformSync(content, { loader: "js" });
    } catch (e) {
      console.error(`[SYNTAX ERROR] in ${filePath}:`, e.message);
      return;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`[PATCHED] ${filePath} updated with ${TARGET_DOMAIN}`);
  } else {
    console.log(`[CLEAN] ${filePath} already up to date.`);
  }
});
