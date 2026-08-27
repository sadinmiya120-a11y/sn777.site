const crypto = require('crypto');
const order_no = 'ORD1785298550941';
const amount = '200';
const api_key = 'cd4183f93d01b69c1ed83ffe9c2d44977033ef19801ab3cc';
const formattedAmountForHash = parseFloat(amount);
const dataToHash = order_no.toString() + formattedAmountForHash.toString();
const expectedSignature = crypto.createHmac('sha256', api_key).update(dataToHash).digest('hex');

fetch('http://localhost:3000/api/gopay-callback', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    order_no,
    amount,
    status: 'success',
    signature: expectedSignature
  })
}).then(r => r.text()).then(console.log).catch(console.error);
