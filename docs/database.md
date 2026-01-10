# Database Schema Specification

This document defines the **exact database schema** required for the Payment Gateway system.
All tables, columns, data types, constraints, indexes, and seeding rules **must be implemented exactly as specified**.

---

## Merchants Table

Stores merchant accounts used for API authentication and payment processing.

### Table: `merchants`

| Column      | Type         | Constraints                 |
| ----------- | ------------ | --------------------------- |
| id          | UUID         | Primary Key, auto-generated |
| name        | VARCHAR(255) | Required                    |
| email       | VARCHAR(255) | Required, **Unique**        |
| api_key     | VARCHAR(64)  | Required, **Unique**        |
| api_secret  | VARCHAR(64)  | Required                    |
| webhook_url | TEXT         | Optional                    |
| is_active   | BOOLEAN      | Defaults to `true`          |
| created_at  | TIMESTAMP    | Auto-set to current time    |
| updated_at  | TIMESTAMP    | Auto-set to current time    |

---

## Orders Table

Stores payment orders created by merchants.

### Table: `orders`

| Column      | Type         | Constraints                                                |
| ----------- | ------------ | ---------------------------------------------------------- |
| id          | VARCHAR(64)  | Primary Key, format: `order_` + 16 alphanumeric characters |
| merchant_id | UUID         | Required, Foreign Key → `merchants(id)`                    |
| amount      | INTEGER      | Required, minimum `100` (smallest currency unit)           |
| currency    | CHAR(3)      | Defaults to `INR`                                          |
| receipt     | VARCHAR(255) | Optional                                                   |
| notes       | JSON         | Optional                                                   |
| status      | VARCHAR(20)  | Defaults to `created`                                      |
| created_at  | TIMESTAMP    | Auto-set to current time                                   |
| updated_at  | TIMESTAMP    | Auto-set to current time                                   |

---

## Payments Table

Stores payment transactions associated with orders.

### Table: `payments`

| Column            | Type         | Constraints                                                                |
| ----------------- | ------------ | -------------------------------------------------------------------------- |
| id                | VARCHAR(64)  | Primary Key, format: `pay_` + 16 alphanumeric characters                   |
| order_id          | VARCHAR(64)  | Required, Foreign Key → `orders(id)`                                       |
| merchant_id       | UUID         | Required, Foreign Key → `merchants(id)`                                    |
| amount            | INTEGER      | Required (smallest currency unit)                                          |
| currency          | CHAR(3)      | Defaults to `INR`                                                          |
| method            | VARCHAR(20)  | Required (`upi`, `card`)                                                   |
| status            | VARCHAR(20)  | Defaults to `created` (must be set to `processing` immediately)            |
| vpa               | VARCHAR(255) | Optional, **UPI only**                                                     |
| card_network      | VARCHAR(20)  | Optional, **Card only** (`visa`, `mastercard`, `amex`, `rupay`, `unknown`) |
| card_last4        | CHAR(4)      | Optional, **Card only**                                                    |
| error_code        | VARCHAR(50)  | Optional                                                                   |
| error_description | TEXT         | Optional                                                                   |
| created_at        | TIMESTAMP    | Auto-set to current time                                                   |
| updated_at        | TIMESTAMP    | Auto-set to current time                                                   |

---

## Required Indexes

The following indexes **must be created** for performance:

* Index on `orders.merchant_id`
* Index on `payments.order_id`
* Index on `payments.status`

---

## Database Seeding Requirement

On **application startup**, the system must automatically create a test merchant with the following **exact credentials**:

### Test Merchant Record

| Field      | Value                                  |
| ---------- | -------------------------------------- |
| id         | `550e8400-e29b-41d4-a716-446655440000` |
| name       | `Test Merchant`                        |
| email      | `test@example.com`                     |
| api_key    | `key_test_abc123`                      |
| api_secret | `secret_test_xyz789`                   |
| created_at | Current timestamp at startup           |

### Seeding Rules

* If a merchant with email `test@example.com` **already exists**, skip insertion
* Handle duplicates gracefully (no startup failure)
* The test merchant **must be available immediately after application startup**
* Required for automated testing and evaluation

---

## Implementation Notes

* Enforce all foreign key relationships at the database level
* Enforce uniqueness constraints on `merchants.email` and `merchants.api_key`
* Use proper timestamp defaults (`NOW()` / `CURRENT_TIMESTAMP`)
* JSON type should support structured metadata storage

---


