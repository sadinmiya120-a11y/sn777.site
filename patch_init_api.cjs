const fs = require('fs');

const files = ['dist/assets/index-sn777-v5.js', 'dist_backup/assets/index-sn777-v5.js'];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    const target = 'fetch("/api/propay-init"';
    const replacement = 'fetch(depCh==="gopay"?"/api/gopay-init":"/api/propay-init"';
    
    if (content.includes(target)) {
      content = content.replace(target, replacement);
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Patched ${file}`);
    } else {
      console.log(`Target not found in ${file}`);
    }
  }
});
