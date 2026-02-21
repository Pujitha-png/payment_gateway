# Payment Gateway

A Dockerized payment gateway platform with:
- Backend API (`backend`) on port `8000`
- Merchant Dashboard (`frontend/dashboard-vite`) on port `3000`
- Hosted Checkout (`checkout-page`) on port `3001`
- PostgreSQL (`postgres`) for persistence

## Quick Start

1. From project root:

```bash
docker compose up -d --build
```

2. Check services:

```bash
docker compose ps
```

3. Health check:

- `http://localhost:8000/health`

## Service URLs

- Dashboard Login: `http://localhost:3000/login`
- Dashboard Home: `http://localhost:3000/dashboard`
- Transactions: `http://localhost:3000/dashboard/transactions`
- Checkout: `http://localhost:3001/checkout?order_id=<ORDER_ID>`
- API Health: `http://localhost:8000/health`
- Test Merchant: `http://localhost:8000/api/v1/test/merchant`

## Test Merchant Credentials

Auto-seeded at startup:
- Merchant ID: `550e8400-e29b-41d4-a716-446655440000`
- Email: `test@example.com`
- API Key: `key_test_abc123`
- API Secret: `secret_test_xyz789`

## Create an Order (to get `order_id`)

Use Postman or curl:

```bash
curl -X POST http://localhost:8000/api/v1/orders \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt_123",
    "notes": {"customer_name": "John Doe"}
  }'
```

Response contains:
- `id` in format `order_XXXXXXXXXXXXXXXX`

Then open checkout:
- `http://localhost:3001/checkout?order_id=<that_id>`

## Payment Testing Inputs

### UPI
- Example VPA: `user@paytm`

### Card
- Number: `4111111111111111`
- Expiry: any future value (e.g. `12/30`)
- CVV: `123`
- Name: `John Doe`

By default outcomes are simulated:
- UPI success rate: `90%`
- Card success rate: `95%`

## Deterministic Test Mode

Configured in `docker-compose.yml` via environment values:
- `TEST_MODE`
- `TEST_PAYMENT_SUCCESS`
- `TEST_PROCESSING_DELAY`

For deterministic success, set:
- `TEST_MODE=true`
- `TEST_PAYMENT_SUCCESS=true`

## Project Structure

```text
payment-gateway/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── db.js
│   ├── index.js
│   ├── schema.js
│   ├── routes/
│   │   ├── health.js
│   │   ├── orders.js
│   │   ├── payments.js
│   │   └── test.js
│   └── utils/
├── frontend/
│   ├── Dockerfile
│   └── dashboard-vite/
├── checkout-page/
└── docs/
    ├── Api.md
    ├── Architecture.md
    └── database.md
```

## Documentation

- API reference: `docs/Api.md`
- Architecture: `docs/Architecture.md`
- Database schema: `docs/database.md`
