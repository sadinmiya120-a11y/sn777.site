const http = require('http');

const data = new URLSearchParams({
  order_no: 'TEST_123',
  amount: '100',
  status: 'Success',
  signature: 'invalid_sig'
}).toString();

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/gopay-callback',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(body));
});
req.write(data);
req.end();
