export default function Docs() {
  return (
    <div className="page fade-in">
      <div className="layout-wrap wide">
        <div data-testid="api-docs" className="card info-card">
          <h2>Integration Guide</h2>

          <section data-testid="section-create-order" className="section-gap">
            <h3>1. Create Order</h3>
            <pre data-testid="code-snippet-create-order" className="code-block">
{`curl -X POST http://localhost:8000/api/v1/orders \\
  -H "X-Api-Key: key_test_abc123" \\
  -H "X-Api-Secret: secret_test_xyz789" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt_123"
  }'`}
            </pre>
          </section>

          <section data-testid="section-sdk-integration" className="section-gap">
            <h3>2. SDK Integration</h3>
            <pre data-testid="code-snippet-sdk" className="code-block">
{`<script src="http://localhost:3001/checkout.js"></script>
<script>
const checkout = new PaymentGateway({
  key: 'key_test_abc123',
  orderId: 'order_xyz',
  onSuccess: (response) => {
    console.log('Payment ID:', response.paymentId);
  }
});
checkout.open();
</script>`}
            </pre>
          </section>

          <section data-testid="section-webhook-verification" className="section-gap">
            <h3>3. Verify Webhook Signature</h3>
            <pre data-testid="code-snippet-webhook" className="code-block">
{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
}`}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}
