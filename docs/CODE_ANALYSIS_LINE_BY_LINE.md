# Financial Application - Line-by-Line Code Analysis

This document provides a detailed, educational walkthrough of the `server.js` backend code. Each section explains why specific code patterns are used, whether they represent good practices, bad practices, advanced techniques, or security measures.

---

## Table of Contents

1. [Module Imports & Dependencies](#1-module-imports--dependencies)
2. [Express App Initialization](#2-express-app-initialization)
3. [Security Configuration](#3-security-configuration)
4. [Database Connections](#4-database-connections)
5. [Database Schema Definitions](#5-database-schema-definitions)
6. [Error Handling Utilities](#6-error-handling-utilities)
7. [Authentication Middleware](#7-authentication-middleware)
8. [Authentication Routes](#8-authentication-routes)
9. [Wallet Routes](#9-wallet-routes)
10. [Transaction Routes](#10-transaction-routes)
11. [Admin Routes](#11-admin-routes)

---

## 1. Module Imports & Dependencies

### Lines 1-6

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const cors = require('cors');
```

**Analysis:**

| Line | Code | Category | Explanation |
|------|------|----------|-------------|
| 1 | `const express = require('express');` | **Good** | Express.js is the industry-standard web framework for Node.js. It provides a robust set of features for web and mobile applications. |
| 2 | `const jwt = require('jsonwebtoken');` | **Good** | JWT (JSON Web Tokens) is a standard for securely transmitting information between parties as a JSON object. Used for stateless authentication. |
| 3 | `const bcrypt = require('bcryptjs');` | **Good** | bcryptjs is a password hashing library. It uses the bcrypt algorithm with salt rounds to securely hash passwords. Using the JavaScript version (bcryptjs) instead of native bcrypt ensures cross-platform compatibility without compiling native modules. |
| 4 | `const mongoose = require('mongoose');` | **Good** | Mongoose is an Object Data Modeling (ODM) library for MongoDB. It provides schema validation, type casting, and query building. |
| 5 | `const { Pool } = require('pg');` | **Good** | pg (node-postgres) is the official PostgreSQL client for Node.js. Using a connection pool (Pool) instead of single Client is **advanced** because it manages multiple connections efficiently for concurrent requests. |
| 6 | `const cors = require('cors');` | **Good** | CORS (Cross-Origin Resource Sharing) middleware enables controlled access to resources from different origins. |

**Why This Pattern:**
These are standard, well-maintained npm packages that form the foundation of many Node.js applications. Each serves a specific purpose in the application architecture.

---

## 2. Express App Initialization

### Lines 8-13

```javascript
const app = express();

// VULNERABILITY: No security headers (Layer 7)
// No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.
app.use(express.json());
app.use(cors());
```

**Analysis:**

| Line | Code | Category | Explanation |
|------|------|----------|-------------|
| 8 | `const app = express();` | **Good** | Creates an Express application instance. This is the standard way to initialize an Express app. |
| 10-11 | Comments about vulnerability | **Educational** | These comments explicitly mark the code as vulnerable for training purposes. In production code, you wouldn't document vulnerabilities this way. |
| 12 | `app.use(express.json());` | **Good** | Middleware that parses incoming requests with JSON payloads. Essential for REST APIs that accept JSON data. Without this, `req.body` would be undefined for JSON requests. |
| 13 | `app.use(cors());` | **Bad** | **CRITICAL ISSUE:** This enables CORS for ALL origins without any restrictions. In production, this allows any website to make requests to your API, bypassing the same-origin policy. |

**Why Line 13 is BAD:**
```javascript
// BAD - Allows requests from ANY domain
app.use(cors());

// GOOD - Restrict to specific origins
app.use(cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Security Headers Missing:**
The comments mention missing security headers. Here's what should be added:

```javascript
// ADVANCED/SECURE - Using Helmet for security headers
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  xFrameOptions: { action: 'deny' },  // Prevent clickjacking
  xContentTypeOptions: true,  // Prevent MIME sniffing
  referrerPolicy: { policy: 'same-origin' }
}));
```

---

## 3. Security Configuration

### Lines 15-16

```javascript
// VULNERABILITY: Hardcoded JWT secret (Layer 8)
const JWT_SECRET = 'super-secret-key-123';
```

**Analysis:**

| Line | Code | Category | Explanation |
|------|------|----------|-------------|
| 15 | Comment | **Educational** | Flags the vulnerability for training |
| 16 | `const JWT_SECRET = 'super-secret-key-123';` | **BAD/CRITICAL** | Hardcoding secrets in source code is a critical security anti-pattern. Anyone with access to the code can forge tokens. |

**Why This is BAD:**

1. **Source Code Exposure**: If code is pushed to GitHub (even private repos), the secret is exposed
2. **Binary Extraction**: Compiled/minified code can still contain the string
3. **No Rotation**: Cannot change the secret without redeploying code
4. **Shared Secret**: All environments (dev, staging, prod) likely use the same secret

**What JWT Secret Should Be:**
- Minimum 256 bits (32 bytes) of entropy
- Cryptographically random
- Different per environment
- Rotatable without code changes

**SECURE Alternative:**
```javascript
// SECURE - Load from environment variable
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

// Generate a secure secret:
// node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Environment File (.env):**
```bash
# Never commit this file!
JWT_SECRET=a8f5d9c3b2e1f4a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3
```

---

## 4. Database Connections

### Lines 18-66

```javascript
// MongoDB connection for Users and Wallets
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/financial', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// PostgreSQL connection for Transactions
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'financial',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres'
});

// Initialize PostgreSQL tables with retry logic
const initPostgres = async (retries = 10, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pgPool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            from_user_id VARCHAR(255) NOT NULL,
            to_user_id VARCHAR(255) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            tax_amount DECIMAL(10, 2) DEFAULT 0,
            type VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('PostgreSQL tables initialized');
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      console.log(`PostgreSQL connection attempt ${i + 1}/${retries} failed. Retrying in ${delay}ms...`);
      if (i === retries - 1) {
        console.error('Failed to initialize PostgreSQL after all retries:', err);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
initPostgres();
```

**Analysis:**

| Lines | Code | Category | Explanation |
|-------|------|----------|-------------|
| 19-22 | MongoDB Connection | **Good** | Uses environment variables with fallback defaults. Good for Docker/containerized environments. |
| 20-21 | Connection Options | **Advanced** | `useNewUrlParser: true` and `useUnifiedTopology: true` enable modern MongoDB driver's connection management. |
| 25-31 | PostgreSQL Pool | **Good/Advanced** | Using a connection pool is **advanced** because it reuses connections, reducing overhead. Better than creating a new connection per request. |
| 25-31 | Default Credentials | **Bad** | Hardcoded default database credentials are a security risk, though they're just fallbacks for environment variables. |
| 34-66 | Retry Logic | **Advanced** | Implements exponential backoff pattern for resilient database connections. This is **good** for production because databases may not be immediately available on startup (especially in Docker). |
| 40-50 | Table Creation | **Good** | Uses `IF NOT EXISTS` to make the operation idempotent (safe to run multiple times). |
| 45 | `DECIMAL(10, 2)` | **Good** | Using DECIMAL (not FLOAT) for money prevents floating-point precision errors. This is **critical** for financial applications. |
| 53-55 | Finally Block | **Advanced** | Properly releases the client back to the pool even if an error occurs. Prevents connection leaks. |

**Why Retry Logic is ADVANCED:**

In containerized environments (Docker, Kubernetes), services start in parallel. The database might not be ready when the app starts. Without retry logic, the app would crash immediately.

```javascript
// Pattern: Circuit Breaker with Exponential Backoff
const connectWithRetry = async (retries = 5, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await connect();
      return; // Success!
    } catch (err) {
      if (i === retries - 1) throw err;
      // Exponential backoff: 1s, 2s, 4s, 8s...
      await sleep(delay * Math.pow(2, i));
    }
  }
};
```

**Why DECIMAL for Money:**

```javascript
// BAD - Floating point causes rounding errors
0.1 + 0.2 === 0.3  // false! (0.30000000000000004)

// GOOD - Decimal preserves precision
DECIMAL(10, 2)  // 99999999.99 max, always 2 decimal places
```

---

## 5. Database Schema Definitions

### Lines 68-88

```javascript
// MongoDB Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  firstName: String,
  lastName: String,
  phone: String,
  createdAt: { type: Date, default: Date.now }
});

const walletSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Wallet = mongoose.model('Wallet', walletSchema);
```

**Analysis:**

| Lines | Code | Category | Explanation |
|-------|------|----------|-------------|
| 69-77 | User Schema | **Good** | Well-structured schema with validation. `required: true` enforces data integrity. |
| 70 | Email Unique | **Good** | Prevents duplicate accounts. Database-level constraint. |
| 72 | Role Enum | **Advanced** | Restricts role values to only 'user' or 'admin'. Prevents invalid data. |
| 72 | Default Role | **Good** | Principle of least privilege - default to lowest permission level. |
| 79-85 | Wallet Schema | **Good** | Separate collection for wallet data allows independent scaling. |
| 80 | userId Unique | **Good** | Enforces one wallet per user. |
| 81 | Default Balance | **Good** | New wallets start with $0 (security). Though the code later gives $1000 on registration. |
| 87-88 | Model Creation | **Good** | Compiles schema into MongoDB models for querying. |

**Schema Design Patterns:**

This uses **referencing** (not embedding). User and Wallet are separate collections:

```javascript
// Pros of Referencing:
// - Wallet can be queried independently
// - Separate read/write scaling
// - Smaller document sizes

// Cons of Referencing:
// - Requires two queries or $lookup (join)
// - Potential for orphaned wallets

// Alternative: Embedding
const userSchema = new mongoose.Schema({
  email: String,
  wallet: {
    balance: Number,
    currency: String
  }
});
// Pros: Single query, atomic updates
// Cons: Larger documents, harder to query wallets directly
```

---

## 6. Error Handling Utilities

### Lines 90-98

```javascript
// VULNERABILITY: Sensitive data leak in error logging (Layer 6)
const logError = (err, req) => {
  console.log('=== ERROR LOG ===');
  console.log('Error:', err.message);
  console.log('Request Body:', JSON.stringify(req.body, null, 2)); // Logs passwords!
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Request URL:', req.originalUrl);
  console.log('=================');
};
```

**Analysis:**

| Lines | Code | Category | Explanation |
|-------|------|----------|-------------|
| 90 | Comment | **Educational** | Marks vulnerability for training |
| 91-98 | logError Function | **BAD** | Logs sensitive data including passwords and authorization headers. |
| 94 | `JSON.stringify(req.body)` | **CRITICAL** | Logs entire request body. For login requests, this includes plaintext passwords. |
| 95 | `JSON.stringify(req.headers)` | **BAD** | Logs Authorization header containing JWT tokens. |

**Why This is BAD:**

Logs often end up in:
- Log files on disk
- Cloud logging services (CloudWatch, Splunk, ELK)
- Container orchestration logs (kubectl logs, Docker logs)
- Error tracking services (Sentry, Rollbar)

If these services are compromised, attackers get plaintext passwords.

**SECURE Alternative:**

```javascript
// SECURE - Sanitize sensitive data before logging
const sanitizeForLogging = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveFields = [
    'password', 'token', 'secret', 'apiKey', 'creditCard',
    'ssn', 'authorization', 'cookie'
  ];
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const logError = (err, req) => {
  console.log('=== ERROR LOG ===');
  console.log('Error:', err.message);
  console.log('Request Body:', JSON.stringify(sanitizeForLogging(req.body), null, 2));
  console.log('Request URL:', req.originalUrl);
  // Intentionally NOT logging headers
  console.log('=================');
};
```

---

## 7. Authentication Middleware

### Lines 100-115

```javascript
// JWT Authentication Middleware
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logError(err, req);
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

**Analysis:**

| Lines | Code | Category | Explanation |
|-------|------|----------|-------------|
| 101-114 | Middleware Function | **Good** | Express middleware pattern for reusable authentication logic. |
| 103 | Optional Chaining | **Good/Modern** | `?.` operator safely accesses nested properties. Returns `undefined` if `authorization` is undefined. |
| 103 | `split(' ')[1]` | **Good** | Extracts token from "Bearer TOKEN" format (standard JWT pattern). |
| 104-106 | Token Check | **Good** | Early return pattern prevents unnecessary processing. 401 status is correct for missing auth. |
| 108 | `jwt.verify()` | **Good** | Verifies token signature and expiration. Throws if invalid. |
| 109 | Attach to Request | **Good** | Makes user data available to downstream route handlers via `req.user`. |
| 110 | `next()` | **Good** | Passes control to the next middleware or route handler. |
| 112 | Error Logging | **Bad** | Uses vulnerable `logError` that leaks sensitive data. |
| 113 | Generic Error | **Good** | Returns generic "Invalid token" instead of specific error details (prevents information leakage). |

**Why Bearer Token Pattern:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
            ↑      ↑
         Scheme   Token
```

This is the RFC 6750 standard for OAuth 2.0 token usage.

**ADVANCED Alternative with Token Blacklist:**

```javascript
// ADVANCED - Check against token blacklist (for logout functionality)
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Check if token is blacklisted (logged out)
    const isBlacklisted = await TokenBlacklist.exists({ token });
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

## 8. Authentication Routes

### Register Route (Lines 119-150)

```javascript
// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, phone } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      email,
      password: hashedPassword,
      role: role || 'user',
      firstName,
      lastName,
      phone
    });
    
    await user.save();
    
    // Create wallet for new user with $1000 starting balance
    const wallet = new Wallet({
      userId: user._id.toString(),
      balance: 1000,
      currency: 'USD'
    });
    await wallet.save();
    
    res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Registration failed' });
  }
});
```

**Analysis:**

| Lines | Code | Category | Explanation |
|-------|------|----------|-------------|
| 120 | Destructuring | **Good** | Clean extraction of fields from request body. |
| 122 | `bcrypt.hash(password, 10)` | **Good** | Hashes password with 10 salt rounds. bcrypt automatically handles salt generation. Cost factor of 10 is a good balance (takes ~100ms to hash). |
| 124-132 | User Creation | **Good** | Creates user document with hashed password. |
| 129 | Role Assignment | **BAD** | Allows client to specify role! Users can register as `role: 'admin'`. |
| 137-142 | Wallet Creation | **Good** | Creates associated wallet with starting balance. |
| 140 | `user._id.toString()` | **Good** | MongoDB ObjectId converted to string for storage. |
| 144 | 201 Status | **Good** | Correct HTTP status for resource creation. |
| 147-148 | Error Handling | **Bad** | Uses vulnerable logger; generic error message is good though. |

**CRITICAL Issue - Role Assignment:**

```javascript
// BAD - Allows privilege escalation
role: role || 'user'

// SECURE - Always default to user role
role: 'user'

// If admin creation is needed, require separate admin-only endpoint
```

**Input Validation Missing:**

```javascript
// SECURE - Add validation
const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/[A-Z]/).pattern(/[0-9]/).required(),
  firstName: Joi.string().max(50).required(),
  lastName: Joi.string().max(50).required(),
  phone: Joi.string().pattern(/^\+?[\d\s-]+$/)
});

const { error, value } = registerSchema.validate(req.body);
if (error) {
  return res.status(400).json({ error: error.details[0].message });
}
```

---

### Login Route (Lines 152-192)

```javascript
// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // VULNERABILITY: Long JWT expiration (1 year) (Layer 8)
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '365d' } // 1 year expiration!
    );
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      } 
    });
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Login failed' });
  }
});
```

**Analysis:**

| Lines | Code | Category | Explanation |
|-------|------|----------|-------------|
| 157 | `findOne({ email })` | **Good** | Case-sensitive lookup. Consider email normalization (lowercase). |
| 158-160 | User Not Found | **Good** | Returns generic error to prevent user enumeration attacks. |
| 162 | `bcrypt.compare()` | **Good** | Secure password comparison (timing-attack resistant). |
| 163-165 | Invalid Password | **Good** | Same error message as user not found - prevents enumeration. |
| 167-176 | JWT Creation | **BAD** | 1-year expiration is excessive. Compromised tokens remain valid too long. |
| 169-173 | Payload | **Good** | Minimal claims (userId, email, role). Don't include sensitive data. |
| 175 | `expiresIn: '365d'` | **BAD** | Should be 15 minutes for access tokens. |
| 178-187 | Response | **Good** | Returns token and user info (but not password hash). |

**Token Security Issues:**

```javascript
// BAD - 1 year expiration, no refresh token
{ expiresIn: '365d' }

// ADVANCED - Short-lived access token + refresh token pattern
const accessToken = jwt.sign(
  { userId: user._id },
  JWT_SECRET,
  { expiresIn: '15m' }  // Short-lived
);

const refreshToken = jwt.sign(
  { userId: user._id, tokenId: uuidv4() },
  REFRESH_SECRET,
  { expiresIn: '7d' }
);

// Store refresh token hash in database
await RefreshToken.create({
  userId: user._id,
  tokenHash: await bcrypt.hash(refreshToken, 10),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
});
```

**Why Short Expiration:**

- Limits window of opportunity if token is stolen
- Forces re-authentication (or refresh) periodically
- Allows for quicker revocation (token blacklist is smaller)

---

## 9. Wallet Routes

### Get Balance (Lines 223-242)

```javascript
app.get('/api/wallet/balance', authMiddleware, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.user.userId });
    
    if (!wallet) {
      wallet = new Wallet({ userId: req.user.userId, balance: 1000 });
      await wallet.save();
    }
    
    res.json({
      userId: wallet.userId,
      balance: wallet.balance,
      currency: wallet.currency
    });
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});
```

**Analysis:**

| Lines | Code | Category | Explanation |
|-------|------|----------|-------------|
| 223 | `authMiddleware` | **Good** | Protects route - only authenticated users can access. |
| 226 | `findOne({ userId })` | **Good** | Only returns the requesting user's wallet. |
| 228-231 | Auto-create Wallet | **Good** | Defensive programming - creates wallet if missing. |
| 230 | Starting Balance | **Bad** | Gives free $1000! Should start at $0. |

---

### Transfer Route (Lines 244-309)

This is the most complex route with multiple vulnerabilities. See full analysis in the Vulnerabilities document (VULN-010, 011, 012, 013).

Key issues:
- Race condition (check-then-act pattern)
- No validation for negative amounts
- Non-atomic operations
- Floating-point rounding errors

---

## 10. Transaction Routes

### Get User's Transactions (Lines 356-370)

```javascript
app.get('/api/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pgPool.query(
      'SELECT * FROM transactions WHERE from_user_id = $1 OR to_user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    res.json(result.rows);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});
```

**Analysis:**

| Lines | Code | Category | Explanation |
|-------|------|----------|-------------|
| 361 | Parameterized Query | **Good/Secure** | Uses `$1` placeholder - prevents SQL injection. |
| 361 | Authorization Check | **Good** | Only returns transactions where user is sender OR receiver. |

This is a **good** example of secure coding:
- Parameterized query prevents SQL injection
- User can only see their own transactions

---

## 11. Admin Routes

### Admin Users Endpoint (Lines 456-470)

```javascript
// VULNERABILITY: Trusts JWT role without DB check (Layer 3 & 8)
app.get('/api/admin/users', authMiddleware, async (req, res) => {
  try {
    // VULNERABILITY: Only checks role from JWT, not from database
    // Attacker can modify JWT to have role: 'admin' and bypass this check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const users = await User.find({}, { password: 0 });
    res.json(users);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
```

**Analysis:**

| Lines | Code | Category | Explanation |
|-------|------|----------|-------------|
| 456 | Comment | **Educational** | Flags the vulnerability |
| 460 | Role Check | **BAD** | Only checks JWT payload, not database. With hardcoded secret, attacker can forge admin tokens. |
| 463 | `find({}, { password: 0 })` | **Good** | Excludes password field from results. |

**SECURE Alternative:**

```javascript
app.get('/api/admin/users', authMiddleware, async (req, res) => {
  try {
    // Verify role from database (not JWT)
    const admin = await User.findOne({
      _id: req.user.userId,
      role: 'admin',
      isActive: true
    });
    
    if (!admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Log admin access for audit trail
    console.log(`Admin ${admin.email} accessed user list at ${new Date()}`);
    
    const users = await User.find({}, { password: 0 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
```

---

## Summary by Category

### ✅ GOOD Patterns Used:
1. Using bcrypt for password hashing
2. Parameterized SQL queries (mostly)
3. JWT for stateless authentication
4. Express middleware pattern
5. Connection pooling for PostgreSQL
6. MongoDB schemas with validation
7. HTTP status codes (201 for create, 401 for auth errors)
8. Generic error messages to prevent information leakage
9. Database-level constraints (unique fields)

### ❌ BAD Patterns (Vulnerabilities):
1. Hardcoded JWT secret
2. NoSQL/SQL injection vulnerabilities
3. Race conditions in transfer logic
4. Trusting JWT without DB verification
5. Sensitive data in logs
6. Missing security headers
7. No input validation
8. Excessive token expiration (1 year)

### 🚀 ADVANCED Patterns:
1. Retry logic for database connections
2. Using connection pools
3. Mongoose ODM for MongoDB
4. Async/await for asynchronous operations
5. Schema validation with enums

---

## Learning Exercises

1. **Fix the JWT Secret**: Move to environment variable
2. **Add Input Validation**: Use Joi or express-validator
3. **Fix SQL Injection**: Convert all queries to parameterized
4. **Implement Rate Limiting**: Prevent brute force attacks
5. **Add Security Headers**: Use Helmet middleware
6. **Fix Race Condition**: Use MongoDB transactions
7. **Add Audit Logging**: Track admin actions

---

*This document is for educational purposes as part of secure coding training.*
