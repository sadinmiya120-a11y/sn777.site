const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// The route in server.ts is /api/propay-init but implements GOPay internally.
// Let's change its name to gopay-init
code = code.replace('app.post(["/api/propay-init", "/api/propay/init"], async (req, res) => {', 'app.post(["/api/gopay-init", "/api/gopay/init"], async (req, res) => {');

// Also update notify_url to gopay_notify
code = code.replace('notify_url: "https://sn777.site/pay1/propay_notify.php",', 'notify_url: "https://sn777.site/pay1/gopay_notify.php",');

fs.writeFileSync('server.ts', code, 'utf8');

