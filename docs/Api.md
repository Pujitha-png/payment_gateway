# Payment Gateway API Specification

This document defines all API endpoints for the Payment Gateway system.
All endpoints **must be implemented exactly as specified**.

---

## Base URL

```
http://localhost:8000
```

---

## 1. Health Check Endpoint

### `GET /health`

Checks whether the application and its dependencies are operational.

### Authentication

* Not required

### Success Response (200)

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Enhanced Health Check (Deliverable 2)

```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "worker": "running",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Response Fields

* **status**: Always `"healthy"` when service is operational
* **database**: `"connected"` or `"disconnected"`
* **redis**: `"connected"` or `"disconnected"` (Deliverable 2)
* **worker**: `"running"` or `"stopped"` (Deliverable 2)
* **timestamp**: ISO 8601 formatted timestamp

---

## Authentication

All private endpoints require authentication using API credentials.

### Required Headers

```
X-Api-Key: key_test_abc123
X-Api-Secret: secret_test_xyz789
```

### Invalid Credentials Response

```json
{
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "description": "Invalid API credentials"
  }
}
```

---

## Standard Error Codes

| Code                       | Description                     |
| -------------------------- | ------------------------------- |
| AUTHENTICATION_ERROR       | Invalid API credentials         |
| BAD_REQUEST_ERROR          | Validation errors               |
| NOT_FOUND_ERROR            | Resource not found              |
| PAYMENT_FAILED             | Payment processing failed       |
| INVALID_VPA                | VPA format invalid              |
| INVALID_CARD               | Card validation failed          |
| EXPIRED_CARD               | Card expiry date invalid        |
| INSUFFICIENT_REFUND_AMOUNT | Refund exceeds available amount |

---

## 2. Create Order

### `POST /api/v1/orders`

Creates a new payment order.

### Authentication

* Required

### Headers

```
X-Api-Key: key_test_abc123
X-Api-Secret: secret_test_xyz789
Content-Type: application/json
```

### Request Body

```json
{
  "amount": 50000,
  "currency": "INR",
  "receipt": "receipt_123",
  "notes": {
    "customer_name": "John Doe"
  }
}
```

### Validation Rules

* **amount**: Integer ≥ 100 (stored in paise)
* **currency**: Optional, defaults to `"INR"`
* **receipt**: Optional string
* **notes**: Optional JSON object

### Success Response (201)

```json
{
  "id": "order_NXhj67fGH2jk9mPq",
  "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 50000,
  "currency": "INR",
  "receipt": "receipt_123",
  "notes": {
    "customer_name": "John Doe"
  },
  "status": "created",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Error Response (400)

```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "amount must be at least 100"
  }
}
```

---

## 3. Get Order

### `GET /api/v1/orders/{order_id}`

Retrieves an order belonging to the authenticated merchant.

### Authentication

* Required

### Success Response (200)

```json
{
  "id": "order_NXhj67fGH2jk9mPq",
  "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 50000,
  "currency": "INR",
  "receipt": "receipt_123",
  "notes": {},
  "status": "created",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Error Response (404)

```json
{
  "error": {
    "code": "NOT_FOUND_ERROR",
    "description": "Order not found"
  }
}
```

---

## 4. Create Payment

### `POST /api/v1/payments`

Creates and processes a payment for an order.

### Authentication

* Required

### Headers

```
X-Api-Key: key_test_abc123
X-Api-Secret: secret_test_xyz789
Content-Type: application/json
```

### UPI Payment Request

```json
{
  "order_id": "order_NXhj67fGH2jk9mPq",
  "method": "upi",
  "vpa": "user@paytm"
}
```

### Card Payment Request

```json
{
  "order_id": "order_NXhj67fGH2jk9mPq",
  "method": "card",
  "card": {
    "number": "4111111111111111",
    "expiry_month": "12",
    "expiry_year": "2025",
    "cvv": "123",
    "holder_name": "John Doe"
  }
}
```

### Success Response (201 – UPI)

```json
{
  "id": "pay_H8sK3jD9s2L1pQr",
  "order_id": "order_NXhj67fGH2jk9mPq",
  "amount": 50000,
  "currency": "INR",
  "method": "upi",
  "vpa": "user@paytm",
  "status": "processing",
  "created_at": "2024-01-15T10:31:00Z"
}
```

### Success Response (201 – Card)

```json
{
  "id": "pay_H8sK3jD9s2L1pQr",
  "order_id": "order_NXhj67fGH2jk9mPq",
  "amount": 50000,
  "currency": "INR",
  "method": "card",
  "card_network": "visa",
  "card_last4": "1111",
  "status": "processing",
  "created_at": "2024-01-15T10:31:00Z"
}
```

### Payment Processing Flow

* Payments are created directly with status `processing`
* Status transitions:

  * `processing → success`
  * `processing → failed`
* `created` state is skipped

---

## Test Mode (Required)

Controlled via environment variables:

```
TEST_MODE=true
TEST_PAYMENT_SUCCESS=true
TEST_PROCESSING_DELAY=1000
```

### Behavior

* Deterministic success/failure
* Fixed processing delay
* Required for automated evaluation

---

## 5. Get Payment

### `GET /api/v1/payments/{payment_id}`

Retrieves payment details.

### Authentication

* Required

### Success Response (200)

```json
{
  "id": "pay_H8sK3jD9s2L1pQr",
  "order_id": "order_NXhj67fGH2jk9mPq",
  "amount": 50000,
  "currency": "INR",
  "method": "upi",
  "vpa": "user@paytm",
  "status": "success",
  "created_at": "2024-01-15T10:31:00Z",
  "updated_at": "2024-01-15T10:31:10Z"
}
```

---

## 6. Test Endpoints (Required for Evaluation)

### `GET /api/v1/test/merchant`

Returns details of the seeded test merchant.

### Authentication

* Not required

### Success Response (200)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "test@example.com",
  "api_key": "key_test_abc123",
  "seeded": true
}
```

### Error Response (404)

```json
{
  "error": {
    "code": "NOT_FOUND_ERROR",
    "description": "Test merchant not found"
  }
}
```
