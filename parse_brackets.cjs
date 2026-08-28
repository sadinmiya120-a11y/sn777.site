const fs = require("fs");
const content = fs.readFileSync("dist/assets/index-sn777-latest-1787849776354.js", "utf8");
const pos = 1414764; // the `]` at 4628:1

let inString = false;
let stringChar = "";
let stack = [];
let mismatchCount = 0;

for (let i = 0; i <= pos; i++) {
  const c = content[i];
  if (inString) {
    if (c === "\\") { i++; continue; }
    if (c === stringChar) {
      inString = false; 
    }
  } else {
    if (c === "\"" || c === "'" || c === "`") {
      inString = true;
      stringChar = c;
    } else if (c === "[" || c === "{" || c === "(") {
      stack.push({char: c, index: i});
    } else if (c === "]" || c === "}" || c === ")") {
      if (stack.length > 0) {
        const top = stack.pop();
        const match = (c === "]" && top.char === "[") || 
                      (c === "}" && top.char === "{") || 
                      (c === ")" && top.char === "(");
        if (!match && mismatchCount < 5) {
          console.log("Mismatch at index", i, "char", c, "expected match for", top.char, "at", top.index);
          console.log("Context: ", content.substring(i - 20, i + 20));
          mismatchCount++;
        }
      } else {
        if (mismatchCount < 5) {
          console.log("Extra closing bracket at index", i, "char", c);
          mismatchCount++;
        }
      }
    }
  }
}
console.log("Stack length:", stack.length);
if (stack.length > 0) console.log("Stack top:", stack.slice(-5));
