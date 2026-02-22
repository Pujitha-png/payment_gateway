const http = require('http');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 4000);
const SECRET = process.env.WEBHOOK_SECRET || 'whsec_test_abc123';

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    try {
      const payload = await readBody(req);
      const incomingSignature = req.headers['x-webhook-signature'];
      const expectedSignature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

      if (!incomingSignature || incomingSignature !== expectedSignature) {
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        res.end('Invalid signature');
        return;
      }

      const parsed = JSON.parse(payload);
      console.log('✅ Webhook verified:', parsed.event);

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
      return;
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad request');
      return;
    }
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Webhook receiver running on port ${PORT}`);
});
