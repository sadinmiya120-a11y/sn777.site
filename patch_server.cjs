const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

code = code.replace(/const backendHost = isRunAppOrLocal \? origin : "https:\/\/sn777-site-[^"]+";/g, 'const backendHost = "https://sn777.site";');
code = code.replace(/const backendHost = .*/g, 'const backendHost = "https://sn777.site";');

fs.writeFileSync("server.ts", code, "utf8");
console.log("Patched server.ts");
