/**
 * GOOD SERVER - INTERMEDIATE LEVEL
 * ================================
 * 
 * This code represents improvements made by intermediate developers:
 * - Environment variables for configuration
 * - Basic input validation
 * - Proper error handling with try-catch
 * - Standard security practices
 * 
 * This is the MINIMUM level for production code.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();

// GOOD: CORS with allowed origins
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// GOOD: Secrets from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// MongoDB connection with options
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/financial', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// GOOD: Connection pool with configuration
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'financial',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// GOOD: Retry logic for database initialization
const initPostgres = async (retries = 5, delay = 3000) => {
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
      console.log(`Database connection attempt ${i + 1}/${retries} failed, retrying...`);
      if (i === retries - 1) {
        console.error('Failed to connect to database:', err.message);
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
initPostgres();

// MongoDB Schemas with validation
const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true,
    lowercase: true, // GOOD: Normalize email
    trim: true
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  phone: String,
  createdAt: { type: Date, default: Date.now }
});

const walletSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { 
    type: Number, 
    default: 0,
    min: [0, 'Balance cannot be negative'] // GOOD: Schema-level validation
  },
  currency: { type: String, default: 'USD' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Wallet = mongoose.model('Wallet', walletSchema);

// GOOD: Sanitized error logging
const logError = (err, req) => {
  // Don't log sensitive fields
  const sanitizedBody = { ...req.body };
  delete sanitizedBody.password;
  delete sanitizedBody.token;
  
  console.error('Error:', {
    message: err.message,
    url: req.originalUrl,
    method: req.method,
    body: sanitizedBody,
    timestamp: new Date().toISOString()
  });
};

// GOOD: Proper auth middleware with error handling
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// GOOD: Input validation helper
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

// ==================== AUTH ROUTES ====================

// Register with validation
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    
    // GOOD: Input validation
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    
    if (!password || !validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // GOOD: Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // GOOD: Proper salt rounds
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'user', // GOOD: Never allow client to set role
      firstName,
      lastName,
      phone
    });
    
    await user.save();
    
    // Create wallet for new user
    const wallet = new Wallet({
      userId: user._id.toString(),
      balance: 1000,
      currency: 'USD'
    });
    await wallet.save();
    
    res.status(201).json({ 
      message: 'User registered successfully', 
      userId: user._id 
    });
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login with proper error handling
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // GOOD: Generic error message prevents user enumeration
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // GOOD: Shorter token expiration (24 hours)
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
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

// Get current user
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Search users - GOOD: Proper query validation
app.get('/api/auth/users/search', authMiddleware, async (req, res) => {
  try {
    // GOOD: Only allow specific search fields
    const allowedFields = ['email', 'firstName', 'lastName'];
    const query = {};
    
    for (const field of allowedFields) {
      if (req.query[field]) {
        // GOOD: Escape regex special characters
        const escaped = req.query[field].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query[field] = { $regex: escaped, $options: 'i' };
      }
    }
    
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ==================== WALLET ROUTES ====================

// Get balance - GOOD: Uses auth token, not query param
app.get('/api/wallet/balance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    let wallet = await Wallet.findOne({ userId });
    
    // Auto-create wallet if missing
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 });
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

// Transfer - GOOD: Basic validation
app.post('/api/wallet/transfer', authMiddleware, async (req, res) => {
  try {
    const { toUserId, amount } = req.body;
    const fromUserId = req.user.userId;
    
    // GOOD: Validation
    if (!toUserId) {
      return res.status(400).json({ error: 'Recipient user ID is required' });
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    
    const fromWallet = await Wallet.findOne({ userId: fromUserId });
    const toWallet = await Wallet.findOne({ userId: toUserId });
    
    if (!fromWallet) {
      return res.status(404).json({ error: 'Sender wallet not found' });
    }
    
    if (!toWallet) {
      return res.status(404).json({ error: 'Recipient wallet not found' });
    }
    
    if (fromWallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Perform transfer
    fromWallet.balance -= amount;
    toWallet.balance += amount;
    fromWallet.updatedAt = new Date();
    toWallet.updatedAt = new Date();
    
    // GOOD: Sequential save with error handling
    await fromWallet.save();
    await toWallet.save();
    
    // GOOD: Parameterized query prevents SQL injection
    await pgPool.query(
      'INSERT INTO transactions (from_user_id, to_user_id, amount, type) VALUES ($1, $2, $3, $4)',
      [fromUserId, toUserId, amount, 'transfer']
    );
    
    res.json({
      message: 'Transfer successful',
      fromBalance: fromWallet.balance
    });
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// Deposit with validation
app.post('/api/wallet/deposit', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    
    let wallet = await Wallet.findOne({ userId: req.user.userId });
    
    if (!wallet) {
      wallet = new Wallet({ userId: req.user.userId, balance: 0 });
    }
    
    wallet.balance += amount;
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

// ==================== TRANSACTION ROUTES ====================

// Get user's transactions - GOOD: Ownership check
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

// Get transaction by ID - GOOD: Ownership check
app.get('/api/transactions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
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

// Search transactions - GOOD: Parameterized query
app.get('/api/transactions/search', authMiddleware, async (req, res) => {
  try {
    const { type, status } = req.query;
    const userId = req.user.userId;
    
    let query = 'SELECT * FROM transactions WHERE (from_user_id = $1 OR to_user_id = $1)';
    const params = [userId];
    let paramIndex = 2;
    
    if (type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(type);
    }
    
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pgPool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ==================== ADMIN ROUTES ====================

// Admin middleware
const adminMiddleware = async (req, res, next) => {
  try {
    // GOOD: Verify role from database, not just JWT
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Admin users endpoint
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    logError(err, req);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GOOD: Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// GOOD: Handle 404 routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// GOOD: Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  await pgPool.end();
  process.exit(0);
});
