const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

// Add /success and /fail before /chat
code = code.replace(
  `// Chat support widget`,
  `app.get("/success", (req, res) => {
  res.send(\`
  <!DOCTYPE html>
  <html lang="bn">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>পেমেন্ট সফল</title>
      <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #0b0f19; margin: 0; color: white; text-align: center; }
          .card { background: #14233c; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); max-width: 90%; width: 400px; }
          .icon { width: 80px; height: 80px; background: rgba(34, 197, 94, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #22c55e; font-size: 3rem; margin: 0 auto 1.5rem; }
          h1 { color: #22c55e; margin: 0 0 1rem; font-size: 1.8rem; font-weight: 800; }
          p { color: #94a3b8; margin: 0 0 2rem; font-size: 1.1rem; line-height: 1.5; }
          a { display: block; background: #2563eb; color: white; text-decoration: none; padding: 1rem; border-radius: 1rem; font-weight: bold; transition: all 0.2s; }
          a:hover { background: #1d4ed8; }
      </style>
  </head>
  <body>
      <div class="card">
          <div class="icon">✓</div>
          <h1>অভিনন্দন! পেমেন্ট সফল হয়েছে</h1>
          <p>আপনার একাউন্টে টাকা সফলভাবে এড করা হয়েছে। আপনি এখন গেমে ফিরে যেতে পারেন।</p>
          <a href="/">গেমে ফিরে যান</a>
      </div>
  </body>
  </html>
  \`);
});

app.get("/fail", (req, res) => {
  res.send(\`
  <!DOCTYPE html>
  <html lang="bn">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>পেমেন্ট বাতিল</title>
      <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #0b0f19; margin: 0; color: white; text-align: center; }
          .card { background: #14233c; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); max-width: 90%; width: 400px; }
          .icon { width: 80px; height: 80px; background: rgba(239, 68, 68, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ef4444; font-size: 3rem; margin: 0 auto 1.5rem; }
          h1 { color: #ef4444; margin: 0 0 1rem; font-size: 1.8rem; font-weight: 800; }
          p { color: #94a3b8; margin: 0 0 2rem; font-size: 1.1rem; line-height: 1.5; }
          a { display: block; background: #2563eb; color: white; text-decoration: none; padding: 1rem; border-radius: 1rem; font-weight: bold; transition: all 0.2s; }
          a:hover { background: #1d4ed8; }
      </style>
  </head>
  <body>
      <div class="card">
          <div class="icon">✕</div>
          <h1>❌ পেমেন্ট বাতিল করা হয়েছে!</h1>
          <p>আপনার ডিপোজিট রিকোয়েস্টটি সম্পন্ন করা যায়নি বা আপনি এটি বাতিল করেছেন।</p>
          <a href="/">হোম পেজে ফিরে যান</a>
      </div>
  </body>
  </html>
  \`);
});

// Chat support widget`
);

// Fix parseFloat on the balance update
code = code.replace(
  /balance: \(currentBalance \+ formattedAmountForHash\)\.toFixed\(2\)/g,
  `balance: parseFloat((currentBalance + formattedAmountForHash).toFixed(2))`
);

fs.writeFileSync("server.ts", code);
