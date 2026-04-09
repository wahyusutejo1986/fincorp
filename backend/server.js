const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

// VULNERABILITY: No security headers (Layer 7)
// No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.
app.use(express.json());
app.use(cors());

// VULNERABILITY: Hardcoded JWT secret (Layer 8)
const JWT_SECRET = 'super-secret-key-123';

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

// VULNERABILITY: Sensitive data leak in error logging (Layer 6)
const logError = (err, req) => {
  console.log('=== ERROR LOG ===');
  console.log('Error:', err.message);
  console.log('Request Body:', JSON.stringify(req.body, null, 2)); // Logs passwords!
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Request URL:', req.originalUrl);
  console.log('=================');
};

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

// ==================== AUTH ROUTES ====================

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

// Get current user profile
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId, { password: 0 });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

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

// ==================== WALLET ROUTES ====================

// Get wallet balance
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

// VULNERABILITY: Race Condition in transfer (Layer 3)
app.post('/api/wallet/transfer', authMiddleware, async (req, res) => {
  try {
    const { toUserId, amount, description } = req.body;
    const fromUserId = req.user.userId;
    
    // VULNERABILITY: No validation for negative amount (Layer 3)
    // Allowing negative amounts can add money to sender instead of deducting
    
    const fromWallet = await Wallet.findOne({ userId: fromUserId });
    const toWallet = await Wallet.findOne({ userId: toUserId });
    
    if (!fromWallet) {
      return res.status(404).json({ error: 'Sender wallet not found' });
    }
    
    if (!toWallet) {
      return res.status(404).json({ error: 'Recipient wallet not found' });
    }
    
    // VULNERABILITY: Race Condition - Check then Act pattern with delay (Layer 3)
    // Attacker can send multiple requests simultaneously to exploit this
    if (fromWallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // VULNERABILITY: 2-second delay allows race condition exploitation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // VULNERABILITY: Rounding error - using floating point math (Layer 3)
    // Tax calculation that rounds down incorrectly (Salami Attack)
    const taxRate = 0.001; // 0.1% tax
    const taxAmount = Math.floor(amount * taxRate * 100) / 100; // Rounds down
    const transferAmount = amount - taxAmount;
    
    // The rounding error accumulates - attacker can exploit this
    console.log(`Transfer: ${amount}, Tax: ${taxAmount}, Net: ${transferAmount}`);
    
    // Perform transfer
    fromWallet.balance -= amount;
    toWallet.balance += transferAmount;
    fromWallet.updatedAt = new Date();
    toWallet.updatedAt = new Date();
    
    // VULNERABILITY: No transaction/atomicity - partial updates possible
    await fromWallet.save();
    await toWallet.save();
    
    // Create transaction record in PostgreSQL
    await pgPool.query(
      'INSERT INTO transactions (from_user_id, to_user_id, amount, tax_amount, type) VALUES ($1, $2, $3, $4, $5)',
      [fromUserId, toUserId, amount, taxAmount, 'transfer']
    );
    
    res.json({
      message: 'Transfer successful',
      fromBalance: fromWallet.balance,
      toBalance: toWallet.balance,
      taxAmount,
      transferAmount
    });
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// Deposit endpoint
app.post('/api/wallet/deposit', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    
    // VULNERABILITY: No validation for negative deposits (Layer 3)
    // Allows withdrawing via "negative deposit"
    
    let wallet = await Wallet.findOne({ userId: req.user.userId });
    
    if (!wallet) {
      wallet = new Wallet({ userId: req.user.userId, balance: 0 });
    }
    
    // VULNERABILITY: Floating point rounding issues
    wallet.balance = parseFloat((wallet.balance + amount).toFixed(2));
    wallet.updatedAt = new Date();
    await wallet.save();
    
    res.json({
      message: 'Deposit successful',
      balance: wallet.balance
    });
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Deposit failed' });
  }
});

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

// ==================== TRANSACTION ROUTES ====================

// Get user's transactions
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

// ==================== ADMIN ROUTES ====================

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

// VULNERABILITY: Trusts JWT role without DB check (Layer 3 & 8)
app.get('/api/admin/wallets', authMiddleware, async (req, res) => {
  try {
    // VULNERABILITY: Only checks role from JWT, not from database
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const wallets = await Wallet.find();
    res.json(wallets);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// VULNERABILITY: Trusts JWT role without DB check (Layer 3 & 8)
app.get('/api/admin/transactions', authMiddleware, async (req, res) => {
  try {
    // VULNERABILITY: Only checks role from JWT, not from database
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const result = await pgPool.query('SELECT * FROM transactions ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Financial App API running on port ${PORT}`);
});
