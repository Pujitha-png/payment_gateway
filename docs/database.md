# Database Schema

This project uses PostgreSQL with three core tables and required indexes.

## `merchants`

- `id` UUID primary key
- `name` varchar(255) not null
- `email` varchar(255) unique not null
- `api_key` varchar(64) unique not null
- `api_secret` varchar(64) not null
- `webhook_url` text nullable
- `is_active` boolean default true
- `created_at`, `updated_at` timestamp default current time

## `orders`

- `id` varchar(64) primary key, constrained to `order_` + 16 alphanumeric
- `merchant_id` UUID not null, FK → `merchants(id)`
- `amount` integer not null, check `>= 100`
- `currency` varchar(3) default `INR`
- `receipt` varchar(255) nullable
- `notes` JSONB nullable
- `status` varchar(20) default `created`
- `created_at`, `updated_at` timestamp default current time

## `payments`

- `id` varchar(64) primary key, constrained to `pay_` + 16 alphanumeric
- `order_id` varchar(64) not null, FK → `orders(id)`
- `merchant_id` UUID not null, FK → `merchants(id)`
- `amount` integer not null
- `currency` varchar(3) default `INR`
- `method` varchar(20) not null, check in (`upi`, `card`)
- `status` varchar(20) default `processing`
- `vpa` varchar(255) nullable
- `card_network` varchar(20) nullable
- `card_last4` varchar(4) nullable
- `error_code` varchar(50) nullable
- `error_description` text nullable
- `created_at`, `updated_at` timestamp default current time

## Required Indexes

- `idx_orders_merchant_id` on `orders(merchant_id)`
- `idx_payments_order_id` on `payments(order_id)`
- `idx_payments_status` on `payments(status)`

## Seed Data

Application startup seeds test merchant if absent:

- `id`: `550e8400-e29b-41d4-a716-446655440000`
- `name`: `Test Merchant`
- `email`: `test@example.com`
- `api_key`: `key_test_abc123`
- `api_secret`: `secret_test_xyz789`

This is implemented in backend startup sequence after schema initialization.
