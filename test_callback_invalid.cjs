const crypto = require('crypto');
const order_no = 'ORD999999999999';
const amount = '200';
fetch('http://localhost:3000/api/gopay-callback', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    order_no,
    amount,
    status: 'success',
    signature: 'badsignature0000000000000000000000000000000000000000000000000000'
  })
}).then(r => r.text()).then(console.log).catch(console.error);
