# API Documentation

Base URL: `http://localhost:8000`

## 1) Health

### `GET /health`
No auth.

Success (`200`):

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 2) Authentication (Protected Endpoints)

Headers required:
- `X-Api-Key: key_test_abc123`
- `X-Api-Secret: secret_test_xyz789`

Invalid auth (`401`):

```json
{
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "description": "Invalid API credentials"
  }
}
```

## 3) Orders

### `POST /api/v1/orders`
Create order.

Body:

```json
{
  "amount": 50000,
  "currency": "INR",
  "receipt": "receipt_123",
  "notes": {"customer_name": "John Doe"}
}
```

Success (`201`) includes:
- `id` (format: `order_` + 16 alphanumeric)
- `merchant_id`, `amount`, `currency`, `status`, timestamps

Validation:
- `amount` must be integer and `>= 100`
- `currency` must be 3 characters
- `notes` must be JSON object when provided

### `GET /api/v1/orders/:order_id`
Fetch authenticated merchant order.

### `GET /api/v1/orders/:order_id/public`
Public order fetch for checkout page.

Success (`200`) returns:
- `id`, `amount`, `currency`, `status`

## 4) Payments

### `POST /api/v1/payments`
Create payment for authenticated merchant.

### `GET /api/v1/payments`
List authenticated merchant payments.

### `GET /api/v1/payments/:payment_id`
Fetch authenticated merchant payment.

### `POST /api/v1/payments/public`
Public payment creation for checkout page.

Supported methods:
- `upi` with `vpa`
- `card` with `card.number`, `expiry_month`, `expiry_year`, `cvv`, `holder_name`

Status flow:
- `processing` → `success` or `failed`

Validation implemented:
- VPA regex validation
- Card Luhn validation
- Card network detection (`visa`, `mastercard`, `amex`, `rupay`, `unknown`)
- Expiry validation (future/current month)

### `GET /api/v1/payments/:payment_id/public`
Public payment status fetch for checkout polling.

## 5) Test Endpoint

### `GET /api/v1/test/merchant`
No auth. Confirms seeded merchant.

Success (`200`):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "test@example.com",
  "api_key": "key_test_abc123",
  "seeded": true
}
```

## Error Codes Used

- `AUTHENTICATION_ERROR`
- `BAD_REQUEST_ERROR`
- `NOT_FOUND_ERROR`
- `INVALID_VPA`
- `INVALID_CARD`
- `EXPIRED_CARD`
- `PAYMENT_FAILED`
