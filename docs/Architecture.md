# Architecture

## Runtime Services (`docker-compose.yml`)

- `postgres` (PostgreSQL 15) → `localhost:5432`
- `api` (Node.js backend) → `localhost:8000`
- `dashboard` (React+Vite via Nginx) → `localhost:3000`
- `checkout` (React+Vite via Nginx) → `localhost:3001`

## High-Level Flow

1. Merchant uses Dashboard (`3000`) to view credentials and transactions.
2. Merchant creates orders using authenticated API calls (`8000`).
3. Customer opens hosted checkout (`3001/checkout?order_id=...`).
4. Checkout calls public order/payment endpoints on API.
5. API persists entities in PostgreSQL and simulates payment processing.

## API and UI Separation

- Dashboard uses authenticated merchant endpoints.
- Checkout uses public endpoints (`/orders/:id/public`, `/payments/public`, `/payments/:id/public`).

## Startup and Dependency Order

- `api` waits for healthy `postgres` using compose healthcheck condition.
- `dashboard` and `checkout` depend on `api`.

## Seeded Merchant

Backend startup ensures test merchant exists:
- `id`: `550e8400-e29b-41d4-a716-446655440000`
- `email`: `test@example.com`
- `api_key`: `key_test_abc123`
- `api_secret`: `secret_test_xyz789`

## Notes

- Redis is not part of current compose/runtime.
- Processing outcome can be deterministic with test env vars (`TEST_MODE`, `TEST_PAYMENT_SUCCESS`, `TEST_PROCESSING_DELAY`).
