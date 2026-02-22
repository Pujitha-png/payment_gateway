# Payment Gateway

A full-stack payment gateway demo with merchant APIs, dashboard, and hosted checkout.

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker)](#quick-start-docker)
- [Run Without Docker (Optional)](#run-without-docker-optional)
- [How to Use (End-to-End Flow)](#how-to-use-end-to-end-flow)
- [Service URLs](#service-urls)
- [Test Merchant Credentials](#test-merchant-credentials)
- [Configuration](#configuration)
- [Validation and Payment Simulation](#validation-and-payment-simulation)
- [Deliverable 2 Features](#deliverable-2-features)
- [Embeddable SDK](#embeddable-sdk)
- [API Authentication](#api-authentication)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)

## Overview

This project simulates a modern payment system where:
- merchants create orders and track payments,
- customers pay through a hosted checkout page,
- payment status is polled and finalized asynchronously,
- data is stored in PostgreSQL.

The repo includes a backend API, worker service, merchant dashboard, hosted checkout, and test webhook receiver, all orchestrated via Docker Compose.

## Core Features

- Merchant order creation and payment retrieval APIs.
- Async payment/refund processing through Redis queues + worker.
- Webhook delivery with HMAC-SHA256 signatures and retry scheduling.
- Idempotent payment creation with `Idempotency-Key` support.
- Full and partial refund APIs with async processing.
- Hosted public checkout flow (`order -> pay -> processing -> success/failed`).
- UPI and Card payment methods.
- Input validation (VPA format, Luhn card validation, expiry validation).
- Simulated processing delays and success rates.
- Deterministic test mode for predictable outcomes.
- Seeded test merchant for immediate local testing.

## Architecture

Runtime services in `docker-compose.yml`:

- `postgres` (PostgreSQL) on `5432`
- `redis` (BullMQ backing store) on `6379`
- `api` (Node.js backend) on `8000`
- `worker` (BullMQ workers for payment/refund/webhook jobs)
- `webhook-receiver` (test merchant receiver) on `4000`
- `dashboard` (React + Nginx) on `3000`
- `checkout` (React + Nginx) on `3001`

High-level flow:
1. Merchant signs in to dashboard and uses API credentials.
2. Merchant creates an order via authenticated endpoint.
3. Customer opens checkout with `order_id`.
4. Checkout uses public endpoints to create and poll payment status.
5. API enqueues background jobs and returns immediately.
6. Worker updates final state and delivers merchant webhooks.

## Tech Stack

- Backend: Node.js, Express, PostgreSQL
- Frontend: React, Vite
- Reverse proxy/static serving: Nginx
- Containers: Docker, Docker Compose

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
├── checkout/                # additional checkout app copy
└── docs/
    ├── Api.md
    ├── Architecture.md
    └── database.md
```

## Prerequisites

For Docker setup:
- Docker Desktop (latest stable)
- Docker Compose v2+

For non-Docker local run:
- Node.js 20+
- npm 10+
- PostgreSQL 15+

## Quick Start (Docker)

1. Start all services:

```bash
docker compose up -d --build
```

2. Confirm containers:

```bash
docker compose ps
```

3. Check backend health:

```bash
curl http://localhost:8000/health
```

4. Open apps in browser:
- Dashboard: `http://localhost:3000/login`
- Checkout: `http://localhost:3001/checkout?order_id=<ORDER_ID>`

To stop services:

```bash
docker compose down
```

## Run Without Docker (Optional)

Use this only if you prefer running services manually.

1. Start PostgreSQL and create DB/user that match your backend config.
2. Backend:

```bash
cd backend
npm install
npm start
```

3. Dashboard frontend:

```bash
cd frontend/dashboard-vite
npm install
npm run dev
```

4. Checkout frontend:

```bash
cd checkout-page
npm install
npm run dev
```

## How to Use (End-to-End Flow)

### 1) Verify test merchant

```bash
curl http://localhost:8000/api/v1/test/merchant
```

### 2) Create an order (authenticated)

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

Copy the returned `id` (example: `order_XXXXXXXXXXXXXXXX`).

### 3) Open checkout with that order

`http://localhost:3001/checkout?order_id=<ORDER_ID>`

### 4) Complete payment

- UPI sample: `user@paytm`
- Card sample:
  - Number: `4111111111111111`
  - Expiry: any future month/year (`MM/YY`, e.g. `12/30`)
  - CVV: `123`
  - Name: `John Doe`

### 5) Verify in dashboard

Open `http://localhost:3000/dashboard/transactions`.

## Service URLs

- Dashboard Login: `http://localhost:3000/login`
- Dashboard Home: `http://localhost:3000/dashboard`
- Dashboard Transactions: `http://localhost:3000/dashboard/transactions`
- Hosted Checkout: `http://localhost:3001/checkout?order_id=<ORDER_ID>`
- API Health: `http://localhost:8000/health`
- Test Merchant Endpoint: `http://localhost:8000/api/v1/test/merchant`

## Test Merchant Credentials

Seeded automatically on startup:

- Merchant ID: `550e8400-e29b-41d4-a716-446655440000`
- Name: `Test Merchant`
- Email: `test@example.com`
- API Key: `key_test_abc123`
- API Secret: `secret_test_xyz789`

## Configuration

Environment variables used by backend (via compose):

- `DATABASE_URL`
- `REDIS_URL`
- `PORT`
- `TEST_MODE`
- `TEST_PAYMENT_SUCCESS`
- `TEST_PROCESSING_DELAY`
- `UPI_SUCCESS_RATE`
- `CARD_SUCCESS_RATE`
- `PROCESSING_DELAY_MIN`
- `PROCESSING_DELAY_MAX`
- `WEBHOOK_RETRY_INTERVALS_TEST`

Use deterministic test success:

- `TEST_MODE=true`
- `TEST_PAYMENT_SUCCESS=true`

Use deterministic test failure:

- `TEST_MODE=true`
- `TEST_PAYMENT_SUCCESS=false`

## Validation and Payment Simulation

- UPI: regex-based VPA validation.
- Card number: Luhn algorithm validation.
- Card expiry: current/future month check.
- Card network detection: Visa/Mastercard/Amex/RuPay/Unknown.
- Processing: async finalize with configurable delay and success probabilities.

## Deliverable 2 Features

- Payment jobs are enqueued on create and processed asynchronously.
- Webhook events emitted: `payment.created`, `payment.pending`, `payment.success`, `payment.failed`, `refund.created`, `refund.processed`.
- Webhook retries are persisted in DB (`webhook_logs`) and scheduled with backoff.
- Refund processing is async with available-amount checks across pending + processed refunds.
- Job queue visibility endpoint: `GET /api/v1/test/jobs/status`.

## Embeddable SDK

- SDK source/build scaffold lives in `checkout-widget/`.
- Bundle target is `checkout-widget/dist/checkout.js` (UMD/global `window.PaymentGateway`).
- Hosted script served for local integration at `http://localhost:3001/checkout.js`.
- Security note: postMessage uses `*` origin for local project simplicity; in production validate `event.origin`.

## API Authentication

Protected merchant endpoints require headers:

- `X-Api-Key`
- `X-Api-Secret`

Public checkout endpoints (`/public`) do not require merchant auth and are intended for hosted checkout flow.

## Troubleshooting

- Port already in use:
  - stop conflicting local processes or change port mapping in `docker-compose.yml`.
- Backend not healthy:
  - inspect logs: `docker compose logs -f api postgres`.
- Checkout shows “Order not found”:
  - confirm order was created successfully and `order_id` is copied exactly.
- Payment remains in processing:
  - check backend logs and verify polling endpoint/network availability.
- Dashboard cannot load API:
  - confirm `api` container is up and Nginx proxy paths are correct.

## Documentation

- API reference: `docs/Api.md`
- Architecture details: `docs/Architecture.md`
- Database schema: `docs/database.md`

## License

No license file is currently configured in this repository.
