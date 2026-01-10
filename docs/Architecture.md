# Payment Gateway – System Architecture

## Overview

This project is a **containerized payment gateway platform** composed of multiple services orchestrated using **Docker Compose**. The architecture follows a **microservices-style separation of concerns**, with independent services for backend processing, frontend applications, and supporting infrastructure.

The system is designed to be:

* Modular
* Scalable
* Easy to run locally
* Production-aligned (internal networking, service isolation)

---

## High-Level Architecture

```
┌──────────────────────┐
│   Dashboard (UI)     │
│  React / Vite        │
│  Port: 3000          │
└──────────┬───────────┘
           │ HTTP
┌──────────▼───────────┐
│   Checkout (UI)      │
│  React / Vite        │
│  Port: 3001          │
└──────────┬───────────┘
           │ HTTP
┌──────────▼───────────┐
│     Backend API      │
│  Node.js / Express   │
│  Port: 8000          │
└───────┬───────┬──────┘
        │       │
   SQL  │       │ Cache
        │       │
┌───────▼───┐  ┌▼────────┐
│ PostgreSQL│  │  Redis   │
│ Port 5432 │  │ Port 6379│
└───────────┘  └──────────┘
```

---

## Services

### 1. Backend Service

**Service Name:** `backend`
**Container Name:** `backend_gateway`

**Responsibilities:**

* Payment processing logic
* Order creation & validation
* Communication with database and cache
* Exposes REST APIs for frontend services

**Technology:**

* Node.js (v20)
* Express / Fastify (assumed)

**Internal Dependencies:**

* PostgreSQL
* Redis

**Networking:**

* Exposed to host on port `8000`
* Communicates with other services via Docker internal DNS

---

### 2. Checkout Frontend

**Service Name:** `checkout`
**Container Name:** `checkout_gateway`

**Responsibilities:**

* User payment initiation
* Collect payment details
* Call backend payment APIs

**Technology:**

* React
* Vite

**Networking:**

* Exposed on port `3001`
* Communicates only with backend service

---

### 3. Dashboard Frontend

**Service Name:** `dashboard`
**Container Name:** `dashboard_gateway`

**Responsibilities:**

* Admin view of transactions
* Payment monitoring
* Reporting and analytics

**Technology:**

* React
* Vite

**Networking:**

* Exposed on port `3000`
* Communicates only with backend service

---

### 4. PostgreSQL Database

**Service Name:** `postgres`
**Container Name:** `pg_gateway`

**Responsibilities:**

* Persistent storage of:

  * Payments
  * Orders
  * Users
  * Transactions

**Technology:**

* PostgreSQL 15 (Alpine)

**Persistence:**

* Docker volume: `pg_data`

**Networking:**

* Internal Docker network
* Exposed to host on port `5432` (optional for development)

---

### 5. Redis Cache

**Service Name:** `redis`
**Container Name:** `redis_gateway`

**Responsibilities:**

* Caching frequently accessed data
* Session/token storage
* Rate limiting (future)

**Technology:**

* Redis (latest)

**Networking:**

* Internal Docker network
* Not required to be exposed to host

---

## Docker Networking

* All services run on the **default Docker Compose network**
* Services communicate using **service names as hostnames**

Examples:

* Backend → PostgreSQL: `postgres:5432`
* Backend → Redis: `redis:6379`
* Frontends → Backend: `http://backend:8000`

---

## Environment Configuration

Each service can use environment variables:

* Backend:

  * `DATABASE_URL`
  * `REDIS_HOST`
  * `REDIS_PORT`
  * `NODE_ENV`

Environment variables are loaded using `.env` files where applicable.

---

## Data Flow Example (Payment)

1. User initiates payment from **Checkout UI**
2. Checkout calls **Backend API**
3. Backend:

   * Validates request
   * Caches session data in Redis
   * Stores transaction in PostgreSQL
4. Backend responds with payment status
5. Dashboard displays transaction status

---

## Scalability Considerations

* Backend can be horizontally scaled behind a load balancer
* Redis supports clustering
* PostgreSQL can be upgraded to managed DB or replica setup
* Frontends are stateless and CDN-friendly

---

## Security Considerations

* Redis not exposed publicly
* Internal-only Docker networking
* Environment variables for secrets
* HTTPS termination can be added via reverse proxy (NGINX / Traefik)

---

## Future Improvements

* API Gateway / Reverse Proxy
* Authentication service
* Message queue (Kafka / RabbitMQ)
* Monitoring (Prometheus + Grafana)
* CI/CD pipeline

---

## Summary

This architecture provides a **clean separation between UI, API, and infrastructure**, making the payment gateway reliable, scalable, and production-ready while remaining easy to run locally using Docker Compose.
