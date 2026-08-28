const fs = require("fs");
const esbuild = require("esbuild");

const OLD_DOMAIN = "https://sn777-site-864935185164.us-west1.run.app";
const NEW_DOMAIN = "https://sn777.site";

const filesToPatch = [
  "dist/assets/index-sn777-v5.js",
  "dist/assets/index-CUhzlpga-v3.js",
  "dist_backup/assets/index-sn777-v5.js",
  "dist_backup/assets/index-CUhzlpga-v3.js",
  "apply_assign.cjs",
  "clean_gopay_urls.cjs",
  "patch_cloud_run_domain.cjs"
];

filesToPatch.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${filePath} (not found)`);
    return;
  }
  let content = fs.readFileSync(filePath, "utf8");
  const countBefore = (content.match(new RegExp(OLD_DOMAIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  
  if (countBefore > 0) {
    content = content.replaceAll(OLD_DOMAIN, NEW_DOMAIN);
    
    if (filePath.endsWith(".js")) {
      try {
        esbuild.transformSync(content, { loader: "js" });
        fs.writeFileSync(filePath, content, "utf8");
        console.log(`[${filePath}] Successfully replaced ${countBefore} occurrences and verified syntax.`);
      } catch (err) {
        console.error(`[${filePath}] ESBuild error:`, err.message);
      }
    } else {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`[${filePath}] Successfully replaced ${countBefore} occurrences.`);
    }
  } else {
    console.log(`[${filePath}] No occurrences of OLD_DOMAIN found.`);
  }
});
