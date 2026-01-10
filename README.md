# Payment Gateway Platform

A full-stack, containerized **payment gateway system** built with a microservices-style architecture. This project includes a backend API, two frontend applications (Dashboard & Checkout), and supporting infrastructure (PostgreSQL & Redis), all orchestrated using **Docker Compose**.

---

## 📌 Table of Contents

* [Features](#-features)
* [Architecture](#-architecture)
* [Tech Stack](#-tech-stack)
* [Project Structure](#-project-structure)
* [Prerequisites](#-prerequisites)
* [Environment Variables](#-environment-variables)
* [Getting Started](#-getting-started)
* [Evaluation Note](#-evaluation-note)
* [Running with Docker](#-running-with-docker)
* [Available Services & Ports](#-available-services--ports)
* [Common Docker Commands](#-common-docker-commands)
* [Troubleshooting](#-troubleshooting)
* [Security Notes](#-security-notes)
* [Documentation](#-documentation)
* [Future Improvements](#-future-improvements)
* [Contributing](#-contributing)
* [License](#-license)

---

## ✨ Features

* Modular payment gateway architecture
* Node.js backend API
* Checkout frontend for user payments
* Dashboard frontend for admin & monitoring
* PostgreSQL for persistent storage
* Redis for caching & sessions
* Docker Compose for local development
* Production-aligned container networking

---

## 🏗 Architecture

The system follows a **service-oriented architecture**:

* **Backend API** handles business logic and payment processing
* **Checkout UI** allows users to initiate payments
* **Dashboard UI** provides transaction monitoring
* **PostgreSQL** stores transactional data
* **Redis** provides caching and session storage

For a detailed explanation, see [`docs/architecture.md`](./docs/architecture.md).

---

## 🧰 Tech Stack

### Backend

* Node.js (v20)
* Express / Fastify (assumed)
* PostgreSQL
* Redis

### Frontend

* React
* Vite

### Infrastructure

* Docker
* Docker Compose
* PostgreSQL 15 (Alpine)
* Redis (latest)

---

## 📁 Project Structure

```
payment-gateway/
│
├── backend/                  # Backend API service
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── .env
│
├── checkout/                 # Checkout frontend
│   ├── src/
│   ├── package.json
│   └── Dockerfile
│
├── frontend/
│   └── dashboard-vite/       # Dashboard frontend
│       ├── src/
│       ├── package.json
│       └── Dockerfile
│
├── docker-compose.yml
├── docs/                     # Documentation files
│   ├── architecture.md
│   ├── database.md
│   └── api.md
├── README.md
└── .gitignore
```

---

## ⚙️ Prerequisites

Make sure you have the following installed:

* Docker (v24+ recommended)
* Docker Compose (v2)
* Git

Optional (for local development without Docker):

* Node.js v20+
* npm

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

```env
PORT=8000
NODE_ENV=development

DB_HOST=postgres
DB_PORT=5432
DB_NAME=payment_gateway
DB_USER=gateway_user
DB_PASSWORD=gateway_pass

REDIS_HOST=redis
REDIS_PORT=6379
```

## 🚀 Getting Started

Clone the repository:

```bash
git clone https://github.com/Pujitha-png/payment-gateway.git
cd payment-gateway
```

---

## After cloning run

```bash
docker compose up -d
```

Ensure that:

* All services start without errors
* The seeded test merchant is available immediately
* APIs and frontends are accessible on the specified ports

All **documentation** (API, Database, Architecture) can be found in the [`docs/`](./docs) folder.

---

## 🐳 Running with Docker

### Build and start all services

```bash
docker compose up --build
```

### Run in detached mode

```bash
docker compose up --build -d
```

### Stop all services

```bash
docker compose down
```

---

## 🌐 Available Services & Ports

| Service     | URL / Port                                     |
| ----------- | ---------------------------------------------- |
| Backend API | [http://localhost:8000](http://localhost:8000) |
| Dashboard   | [http://localhost:3000](http://localhost:3000) |
| Checkout    | [http://localhost:3001](http://localhost:3001) |
| PostgreSQL  | localhost:5432                                 |
| Redis       | Internal only                                  |

---

## 🧪 Common Docker Commands

```bash
# View running containers
docker compose ps

# View logs for backend
docker compose logs -f backend

# Rebuild containers
docker compose build

# Remove unused containers
docker container prune
```

---

## 🛠 Troubleshooting

### Port already allocated

If you see errors like:

```
Bind for 0.0.0.0:6379 failed
```

* Stop other services using the same port
* Or remove Redis port exposure from compose file

## 🔒 Security Notes

* Redis is not exposed publicly
* Secrets should be stored in `.env` files
* Use HTTPS in production via a reverse proxy
* Consider secret managers for production

---

## 📚 Documentation

All API, database schema, and architecture references are located in the [`docs/`](./docs) folder:

* [`docs/api.md`](./docs/api.md)
* [`docs/database.md`](./docs/database.md)
* [`docs/architecture.md`](./docs/architecture.md)

---

## 🔮 Future Improvements

* Authentication & authorization
* API Gateway / Reverse proxy (NGINX / Traefik)
* Webhooks for payment events
* Message queues (Kafka / RabbitMQ)
* Observability (Prometheus, Grafana)
* CI/CD pipelines

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

## ✅ Summary

This repository provides a **clean, extensible payment gateway platform** with a modern Docker-based setup, suitable for learning, development, and future production use.
