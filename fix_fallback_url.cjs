const fs = require('fs');

const files = ['dist/assets/index-sn777-v5.js', 'dist_backup/assets/index-sn777-v5.js'];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // ProPay fallback replacement
    content = content.replace(
      'const _fallbackUrl="/propay_pay.php?uid="',
      'const _fallbackUrl= (window.BACKEND_API_BASE || "") + "/propay_pay.php?uid="'
    );
    
    // GOPay fallback replacement
    content = content.replace(
      'const _fallbackUrl="/gopay_pay.php?uid="',
      'const _fallbackUrl= (window.BACKEND_API_BASE || "") + "/gopay_pay.php?uid="'
    );
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed fallback URL in ' + file);
  }
});
