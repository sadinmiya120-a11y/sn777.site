const fs = require("fs");
["dist/index.html", "dist_backup/index.html"].forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");

  // Old text: স্বাগতম! আমি Sn777 সাপোর্ট। আপনাকে কীভাবে সাহায্য করতে পারি?
  // New text: স্বাগতম! আমি Sn777 সাপোর্টটিম থেকে আপনাকে কীভাবে সাহায্য করতে পারি?

  html = html.replace(/স্বাগতম! আমি Sn777 সাপোর্ট। আপনাকে কীভাবে সাহায্য করতে পারি\?/g, "স্বাগতম! আমি Sn777 সাপোর্টটিম থেকে আপনাকে কীভাবে সাহায্য করতে পারি?");
  
  // Remove style="margin-top:auto;" to make it stay at the top
  html = html.replace(/style="margin-top:auto;"/g, "");

  fs.writeFileSync(file, html, "utf8");
  console.log("Updated", file);
});
