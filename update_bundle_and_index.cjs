const fs = require('fs');
const path = require('path');

// 1. Copy index-sn777-v5.js onto index-sn777-latest-1787849776354.js in both dist/assets and dist_backup/assets
const srcV5 = 'dist/assets/index-sn777-v5.js';

if (fs.existsSync(srcV5)) {
  const code = fs.readFileSync(srcV5, 'utf8');
  
  const dests = [
    'dist/assets/index-sn777-latest-1787849776354.js',
    'dist_backup/assets/index-sn777-latest-1787849776354.js',
    'dist_backup/assets/index-sn777-v5.js'
  ];
  
  dests.forEach(dest => {
    fs.writeFileSync(dest, code, 'utf8');
    console.log('Updated ' + dest);
  });
}

// 2. Update index.html in dist and dist_backup to use cache-busting timestamp
const now = Date.now();
['dist/index.html', 'dist_backup/index.html'].forEach(htmlFile => {
  if (fs.existsSync(htmlFile)) {
    let html = fs.readFileSync(htmlFile, 'utf8');
    // Replace script src
    html = html.replace(
      /\/assets\/index-sn777-latest-1787849776354\.js\?t=\d+/g,
      `/assets/index-sn777-latest-1787849776354.js?v=${now}`
    );
    html = html.replace(
      /\/assets\/index-sn777-latest-1787849776354\.js/g,
      `/assets/index-sn777-latest-1787849776354.js?v=${now}`
    );
    fs.writeFileSync(htmlFile, html, 'utf8');
    console.log('Updated timestamp in ' + htmlFile);
  }
});

