# Financial Application - Vulnerability Analysis

This document provides a detailed explanation of all security vulnerabilities present in the `server.js` backend code. These vulnerabilities are intentionally included for training and educational purposes in secure coding practices.

---

## Table of Contents

1. [Layer 7: Application Security Headers](#layer-7-application-security-headers)
2. [Layer 8: Authentication & JWT Issues](#layer-8-authentication--jwt-issues)
3. [Layer 6: Information Disclosure](#layer-6-information-disclosure)
4. [Layer 4: Injection Vulnerabilities](#layer-4-injection-vulnerabilities)
5. [Layer 3: Business Logic Flaws](#layer-3-business-logic-flaws)

---

## Layer 7: Application Security Headers

### VULN-001: Missing Security Headers

**Location:** Lines 10-13

```javascript
// VULNERABILITY: No security headers (Layer 7)
// No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.
app.use(express.json());
app.use(cors());
```

**Description:**
The application lacks essential HTTP security headers that protect against various client-side attacks. The CORS middleware is applied without any restrictions, allowing requests from any origin.

**Missing Headers:**
- **Content-Security-Policy (CSP):** Prevents XSS attacks by controlling resource loading
- **Strict-Transport-Security (HSTS):** Forces HTTPS connections
- **X-Frame-Options:** Prevents clickjacking attacks
- **X-Content-Type-Options:** Prevents MIME-type sniffing
- **X-XSS-Protection:** Legacy XSS protection for older browsers
- **Referrer-Policy:** Controls referrer information leakage

**Exploitation Scenario:**
1. An attacker can embed the application in an iframe on a malicious site (clickjacking)
2. XSS payloads can load external resources without CSP restrictions
3. Man-in-the-middle attacks are possible without HSTS

**Impact:** Medium-High

**Mitigation:**
```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Restrict CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true
}));
```

---

## Layer 8: Authentication & JWT Issues

### VULN-002: Hardcoded JWT Secret

**Location:** Line 16

```javascript
// VULNERABILITY: Hardcoded JWT secret (Layer 8)
const JWT_SECRET = 'super-secret-key-123';
```

**Description:**
The JWT signing secret is hardcoded directly in the source code. This is a critical security flaw as anyone with access to the codebase can forge valid JWT tokens.

**Exploitation Scenario:**
1. Attacker gains access to the source code (GitHub, reverse engineering, etc.)
2. Attacker can create valid JWT tokens with any payload, including admin privileges
3. Attacker can impersonate any user in the system

**Impact:** Critical

**Mitigation:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
// Use a cryptographically secure random string (min 256 bits)
// Example generation: require('crypto').randomBytes(64).toString('hex')
```

---

### VULN-003: Excessive JWT Expiration Time

**Location:** Lines 167-176

```javascript
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
```

**Description:**
JWT tokens are valid for one year. If a token is compromised (stolen via XSS, network sniffing, etc.), the attacker has a full year to use it without detection.

**Exploitation Scenario:**
1. Attacker steals a JWT token through XSS or man-in-the-middle attack
2. Token remains valid for 365 days even if the user changes their password
3. No mechanism for token revocation exists

**Impact:** High

**Mitigation:**
```javascript
// Short-lived access tokens (15 minutes)
const accessToken = jwt.sign(
  { userId: user._id },
  JWT_SECRET,
  { expiresIn: '15m' }
);

// Long-lived refresh tokens stored in httpOnly cookies
const refreshToken = jwt.sign(
  { userId: user._id, tokenId: uuidv4() },
  REFRESH_SECRET,
  { expiresIn: '7d' }
);

// Store refresh tokens in database for revocation capability
```

---

### VULN-004: JWT Role Trust Without Database Verification

**Location:** Lines 455-502 (Admin routes)

```javascript
// VULNERABILITY: Trusts JWT role without DB check (Layer 3 & 8)
app.get('/api/admin/users', authMiddleware, async (req, res) => {
  try {
    // VULNERABILITY: Only checks role from JWT, not from database
    // Attacker can modify JWT to have role: 'admin' and bypass this check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    // ...
  }
});
```

**Description:**
The application trusts the role claim from the JWT token without verifying it against the database. If an attacker can forge or modify a JWT token (especially easy with the hardcoded secret), they can gain admin access.

**Exploitation Scenario:**
1. Attacker obtains a valid user JWT token
2. Using the hardcoded secret, attacker decodes and modifies the token, changing `role: 'user'` to `role: 'admin'`
3. Attacker re-signs the token and accesses admin endpoints

**Impact:** Critical

**Mitigation:**
```javascript
app.get('/api/admin/users', authMiddleware, async (req, res) => {
  try {
    // Always verify role from database
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    // ... proceed with admin action
  }
});
```

---

## Layer 6: Information Disclosure

### VULN-005: Sensitive Data Leakage in Error Logs

**Location:** Lines 90-98

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

**Description:**
The error logging function logs the entire request body, including sensitive information like passwords. These logs may be stored in log files, sent to monitoring services, or visible in container logs.

**Exploitation Scenario:**
1. Attacker gains access to logs (log files, ELK stack, Docker logs, cloud monitoring)
2. Logs contain plaintext passwords from login/register requests
3. Attacker harvests credentials from logs

**Impact:** High

**Mitigation:**
```javascript
const sanitizeLogBody = (body) => {
  if (!body) return body;
  const sensitiveFields = ['password', 'token', 'creditCard', 'ssn', 'secret'];
  const sanitized = { ...body };
  sensitiveFields.forEach(field => {
    if (sanitized[field]) sanitized[field] = '***REDACTED***';
  });
  return sanitized;
};

const logError = (err, req) => {
  console.log('=== ERROR LOG ===');
  console.log('Error:', err.message);
  console.log('Request Body:', JSON.stringify(sanitizeLogBody(req.body), null, 2));
  console.log('Request URL:', req.originalUrl);
  // Don't log headers which may contain Authorization tokens
  console.log('=================');
};
```

---

## Layer 4: Injection Vulnerabilities

### VULN-006: NoSQL Injection in User Search

**Location:** Lines 208-219

```javascript
// VULNERABILITY: NoSQL Injection in user search (Layer 4)
app.get('/api/auth/users/search', authMiddleware, async (req, res) => {
  try {
    // VULNERABILITY: Direct use of req.query in MongoDB find without sanitization
    // Allows NoSQL injection like: ?email[$gt]=&email[$lt]=z
    const users = await User.find(req.query, { password: 0 });
    res.json(users);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Search failed' });
  }
});
```

**Description:**
The endpoint directly passes `req.query` to MongoDB's `find()` method without validation. MongoDB operators in query strings can manipulate the query logic.

**Exploitation Scenario:**
1. Attacker sends request: `GET /api/auth/users/search?email[$ne]=null`
2. MongoDB query becomes: `find({ email: { $ne: null } })` - returns all users
3. Attacker can enumerate all user data including admins

**Other Payloads:**
- `?email[$gt]=&email[$lt]=z` - Returns users with emails between empty and 'z'
- `?role=admin` - Find all admin users
- `?email[$regex]=.*@company.com` - Regex search

**Impact:** High

**Mitigation:**
```javascript
const allowedFields = ['email', 'firstName', 'lastName'];
const sanitizedQuery = {};

Object.keys(req.query).forEach(key => {
  if (allowedFields.includes(key) && typeof req.query[key] === 'string') {
    // Escape regex special characters
    sanitizedQuery[key] = req.query[key].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
});

const users = await User.find(sanitizedQuery, { password: 0 });
```

---

### VULN-007: NoSQL Injection in Wallet Search

**Location:** Lines 340-351

```javascript
// VULNERABILITY: NoSQL Injection in wallet search (Layer 4)
app.get('/api/wallet/search', authMiddleware, async (req, res) => {
  try {
    // VULNERABILITY: Direct use of req.query without sanitization
    // Allows NoSQL injection attacks
    const wallets = await Wallet.find(req.query);
    res.json(wallets);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Search failed' });
  }
});
```

**Description:**
Similar to user search, this endpoint allows NoSQL injection through unvalidated query parameters. Attackers can search for wallets with specific balance ranges.

**Exploitation Scenario:**
1. Attacker sends: `GET /api/wallet/search?balance[$gte]=10000`
2. Returns all wallets with balance >= $10,000
3. Attacker can identify high-value targets for further attacks

**Impact:** Medium

**Mitigation:**
```javascript
app.get('/api/wallet/search', authMiddleware, async (req, res) => {
  try {
    // Validate and sanitize inputs
    const { userId, minBalance, maxBalance } = req.query;
    const query = {};
    
    if (userId && typeof userId === 'string') {
      query.userId = userId;
    }
    
    if (minBalance || maxBalance) {
      query.balance = {};
      if (minBalance && !isNaN(minBalance)) {
        query.balance.$gte = parseFloat(minBalance);
      }
      if (maxBalance && !isNaN(maxBalance)) {
        query.balance.$lte = parseFloat(maxBalance);
      }
    }
    
    const wallets = await Wallet.find(query);
    res.json(wallets);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Search failed' });
  }
});
```

---

### VULN-008: SQL Injection in Transaction Search

**Location:** Lines 395-420

```javascript
// VULNERABILITY: SQL Injection in search (Layer 4)
app.get('/api/transactions/search', authMiddleware, async (req, res) => {
  try {
    const { type, status } = req.query;
    
    // VULNERABILITY: SQL Injection - string concatenation in SQL query
    // Attack: ?type=' OR '1'='1
    let query = 'SELECT * FROM transactions WHERE 1=1';
    
    if (type) {
      query += ` AND type = '${type}'`; // VULNERABLE!
    }
    
    if (status) {
      query += ` AND status = '${status}'`; // VULNERABLE!
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pgPool.query(query);
    res.json(result.rows);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Search failed' });
  }
});
```

**Description:**
User input is directly concatenated into SQL queries without parameterization. This is a classic SQL injection vulnerability.

**Exploitation Scenario:**
1. Attacker sends: `GET /api/transactions/search?type=' OR '1'='1`
2. Query becomes: `SELECT * FROM transactions WHERE 1=1 AND type = '' OR '1'='1'`
3. Returns ALL transactions regardless of user ownership
4. Attacker can view other users' private transaction data

**Advanced Payloads:**
- `type=' UNION SELECT * FROM users--` - Attempt to extract user data
- `type='; DROP TABLE transactions;--` - Data destruction (if multiple queries allowed)

**Impact:** Critical

**Mitigation:**
```javascript
app.get('/api/transactions/search', authMiddleware, async (req, res) => {
  try {
    const { type, status } = req.query;
    const conditions = ['(from_user_id = $1 OR to_user_id = $1)'];
    const params = [req.user.userId];
    let paramIndex = 2;
    
    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }
    
    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    
    const query = `SELECT * FROM transactions WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`;
    const result = await pgPool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Search failed' });
  }
});
```

---

### VULN-009: SQL Injection in Statistics Endpoint

**Location:** Lines 422-451

```javascript
// Get transaction statistics - VULNERABILITY: SQL Injection
app.get('/api/transactions/stats/summary', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // VULNERABILITY: SQL Injection via date parameters
    let query = `
      SELECT 
        COUNT(*) as total_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM transactions
      WHERE 1=1
    `;
    
    if (startDate) {
      query += ` AND created_at >= '${startDate}'`; // VULNERABLE!
    }
    
    if (endDate) {
      query += ` AND created_at <= '${endDate}'`; // VULNERABLE!
    }
    
    const result = await pgPool.query(query);
    res.json(result.rows[0]);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});
```

**Description:**
Date parameters are concatenated directly into SQL queries, allowing SQL injection through date inputs.

**Exploitation Scenario:**
1. Attacker sends: `GET /api/transactions/stats/summary?startDate=2024-01-01' OR '1'='1`
2. Query returns statistics for ALL transactions in the system
3. Information disclosure about system-wide activity

**Impact:** Medium

**Mitigation:**
```javascript
app.get('/api/transactions/stats/summary', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const conditions = ['(from_user_id = $1 OR to_user_id = $1)'];
    const params = [req.user.userId];
    let paramIndex = 2;
    
    if (startDate && !isNaN(Date.parse(startDate))) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }
    
    if (endDate && !isNaN(Date.parse(endDate))) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM transactions
      WHERE ${conditions.join(' AND ')}
    `;
    
    const result = await pgPool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});
```

---

## Layer 3: Business Logic Flaws

### VULN-010: Race Condition in Transfer (Time-of-Check to Time-of-Use)

**Location:** Lines 244-309

```javascript
// VULNERABILITY: Race Condition in transfer (Layer 3)
app.post('/api/wallet/transfer', authMiddleware, async (req, res) => {
  // ...
  // VULNERABILITY: Race Condition - Check then Act pattern with delay (Layer 3)
  if (fromWallet.balance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }
  
  // VULNERABILITY: 2-second delay allows race condition exploitation
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Perform transfer
  fromWallet.balance -= amount;
  toWallet.balance += transferAmount;
  // ...
  await fromWallet.save();
  await toWallet.save();
});
```

**Description:**
The transfer operation uses a "check-then-act" pattern with a deliberate 2-second delay. Between the balance check and the actual update, the balance could be modified by another concurrent request.

**Exploitation Scenario (Double-Spending Attack):**
1. Attacker has $100 balance
2. Attacker sends two simultaneous transfer requests of $100 each
3. Both requests pass the balance check (balance = $100)
4. Both requests proceed through the 2-second delay
5. Both requests deduct $100, resulting in balance = -$100 (or both succeeding)

**Attack Command:**
```bash
# Send two parallel requests
curl -X POST http://localhost:3001/api/wallet/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"toUserId": "...", "amount": 100}' &
  
curl -X POST http://localhost:3001/api/wallet/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"toUserId": "...", "amount": 100}' &
```

**Impact:** Critical

**Mitigation:**
```javascript
// Use MongoDB transactions for atomicity
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Use findOneAndUpdate with proper locking
  const fromWallet = await Wallet.findOneAndUpdate(
    { userId: fromUserId, balance: { $gte: amount } },
    { $inc: { balance: -amount }, $set: { updatedAt: new Date() } },
    { session, new: true }
  );
  
  if (!fromWallet) {
    throw new Error('Insufficient balance');
  }
  
  const toWallet = await Wallet.findOneAndUpdate(
    { userId: toUserId },
    { $inc: { balance: transferAmount }, $set: { updatedAt: new Date() } },
    { session, new: true }
  );
  
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

---

### VULN-011: Negative Amount Validation Bypass

**Location:** Lines 250-251, 316-317

```javascript
// In transfer endpoint:
// VULNERABILITY: No validation for negative amount (Layer 3)
// Allowing negative amounts can add money to sender instead of deducting

// In deposit endpoint:
// VULNERABILITY: No validation for negative deposits (Layer 3)
// Allows withdrawing via "negative deposit"
```

**Description:**
The application doesn't validate that amounts are positive numbers. Negative amounts can be used to manipulate account balances in unintended ways.

**Exploitation Scenario - Transfer:**
1. Attacker sends: `{ toUserId: "victim", amount: -1000 }`
2. Code executes: `fromWallet.balance -= (-1000)` which equals `fromWallet.balance += 1000`
3. Attacker's balance INCREASES instead of decreasing

**Exploitation Scenario - Deposit:**
1. Attacker sends: `{ amount: -500 }`
2. Code executes: `wallet.balance += (-500)` 
3. Attacker withdraws money via the deposit endpoint

**Impact:** Critical

**Mitigation:**
```javascript
const validateAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    throw new Error('Amount must be a positive number');
  }
  if (num > 1000000) { // Maximum transaction limit
    throw new Error('Amount exceeds maximum allowed');
  }
  // Ensure only 2 decimal places
  const decimals = (amount.toString().split('.')[1] || '').length;
  if (decimals > 2) {
    throw new Error('Amount cannot have more than 2 decimal places');
  }
  return num;
};

// Use in endpoints:
const amount = validateAmount(req.body.amount);
```

---

### VULN-012: Salami Attack (Rounding Error Exploitation)

**Location:** Lines 273-280

```javascript
// VULNERABILITY: Rounding error - using floating point math (Layer 3)
// Tax calculation that rounds down incorrectly (Salami Attack)
const taxRate = 0.001; // 0.1% tax
const taxAmount = Math.floor(amount * taxRate * 100) / 100; // Rounds down
const transferAmount = amount - taxAmount;

// The rounding error accumulates - attacker can exploit this
console.log(`Transfer: ${amount}, Tax: ${taxAmount}, Net: ${transferAmount}`);
```

**Description:**
The tax calculation uses floating-point arithmetic with `Math.floor()`, which can lead to rounding errors. While each transaction loses only fractions of a cent, millions of transactions could accumulate significant discrepancies.

**The Salami Technique:**
In banking, a "salami attack" involves shaving off fractions of cents from many transactions and collecting them into an attacker's account.

**Exploitation Scenario:**
1. Tax on $0.01 transfer: `Math.floor(0.01 * 0.001 * 100) / 100 = Math.floor(0.001) / 100 = 0`
2. Tax is $0, recipient gets full $0.01
3. Attacker repeats millions of times, avoiding tax entirely on small transfers
4. System loses tax revenue

**Impact:** Medium

**Mitigation:**
```javascript
// Use integer arithmetic (store amounts in cents)
const amountInCents = Math.round(amount * 100);
const taxRate = 0.001; // 0.1%
const taxAmountInCents = Math.round(amountInCents * taxRate);
const transferAmountInCents = amountInCents - taxAmountInCents;

// Store in database as DECIMAL(10, 2) and let PostgreSQL handle precision
await pgPool.query(
  'INSERT INTO transactions (amount, tax_amount) VALUES ($1, $2)',
  [amount, taxAmount] // PostgreSQL handles decimal precision correctly
);
```

---

### VULN-013: Non-Atomic Database Operations

**Location:** Lines 288-290

```javascript
// VULNERABILITY: No transaction/atomicity - partial updates possible
await fromWallet.save();
await toWallet.save();
```

**Description:**
The transfer operation updates two separate documents without atomicity. If the server crashes after the first save but before the second, money disappears from one account but doesn't appear in the other.

**Failure Scenario:**
1. `fromWallet.save()` succeeds - sender balance reduced
2. Server crashes/network error
3. `toWallet.save()` never executes
4. Money is lost from the system

**Impact:** High

**Mitigation:**
See VULN-010 mitigation - use MongoDB transactions to ensure both operations succeed or fail together.

---

### VULN-014: Insecure Direct Object Reference (IDOR)

**Location:** Lines 372-393

```javascript
// VULNERABILITY: IDOR - Insecure Direct Object Reference (Layer 4)
app.get('/api/transactions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // VULNERABILITY: Only checks if user is logged in, NOT if they own the transaction
    // Any logged-in user can access any transaction by changing the ID
    const result = await pgPool.query(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});
```

**Description:**
The endpoint allows any authenticated user to view any transaction by simply changing the ID parameter. There's no authorization check to verify the user owns the transaction.

**Exploitation Scenario:**
1. Attacker views their own transaction: `/api/transactions/123`
2. Attacker increments ID: `/api/transactions/124`
3. Attacker sees another user's private transaction details
4. Attacker can enumerate all transactions in the system

**Impact:** High

**Mitigation:**
```javascript
app.get('/api/transactions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Verify user owns this transaction
    const result = await pgPool.query(
      'SELECT * FROM transactions WHERE id = $1 AND (from_user_id = $2 OR to_user_id = $2)',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});
```

---

## Summary Table

| ID | Vulnerability | Layer | Severity | CWE |
|----|--------------|-------|----------|-----|
| VULN-001 | Missing Security Headers | 7 | Medium | CWE-693 |
| VULN-002 | Hardcoded JWT Secret | 8 | Critical | CWE-798 |
| VULN-003 | Excessive JWT Expiration | 8 | High | CWE-613 |
| VULN-004 | JWT Role Trust Without Verification | 3, 8 | Critical | CWE-306 |
| VULN-005 | Sensitive Data in Logs | 6 | High | CWE-532 |
| VULN-006 | NoSQL Injection (User Search) | 4 | High | CWE-943 |
| VULN-007 | NoSQL Injection (Wallet Search) | 4 | Medium | CWE-943 |
| VULN-008 | SQL Injection (Transaction Search) | 4 | Critical | CWE-89 |
| VULN-009 | SQL Injection (Statistics) | 4 | Medium | CWE-89 |
| VULN-010 | Race Condition in Transfer | 3 | Critical | CWE-362 |
| VULN-011 | Negative Amount Bypass | 3 | Critical | CWE-682 |
| VULN-012 | Salami Attack / Rounding Error | 3 | Medium | CWE-682 |
| VULN-013 | Non-Atomic Operations | 3 | High | CWE-667 |
| VULN-014 | IDOR | 4 | High | CWE-639 |

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
