/**
 * BAD SERVER - BEGINNER LEVEL
 * ============================
 * 
 * This code represents typical mistakes made by beginner developers:
 * - Copy-paste from tutorials without understanding
 * - Hardcoded secrets
 * - No input validation
 * - No error handling
 * - Security through obscurity
 * 
 * AVOID WRITING CODE LIKE THIS!
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

// BAD: No security headers, CORS wide open
app.use(express.json());
app.use(cors()); // Allows ANY website to call your API

// BAD: Hardcoded secrets - never do this!
const JWT_SECRET = 'super-secret-key-123';
const API_KEY = 'sk-1234567890abcdef';

// MongoDB connection
mongoose.connect('mongodb://mongo:27017/financial');

// BAD: No connection pooling config, default credentials
const pgPool = new Pool({
  host: 'postgres',
  port: 5432,
  database: 'financial',
  user: 'postgres',
  password: 'postgres' // Default password!
});

// BAD: No retry logic, app crashes if DB not ready
const initPostgres = async () => {
  const client = await pgPool.connect();
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
  client.release();
};
initPostgres(); // Fire and forget - no error handling!

// MongoDB Schemas - no validation
const userSchema = new mongoose.Schema({
  email: String,  // BAD: No required, no unique constraint
  password: String,
  role: String,   // BAD: No enum validation
  firstName: String,
  lastName: String,
  phone: String,
  createdAt: { type: Date, default: Date.now }
});

const walletSchema = new mongoose.Schema({
  userId: String,
  balance: Number,  // BAD: Could be negative!
  currency: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Wallet = mongoose.model('Wallet', walletSchema);

// BAD: Logs everything including passwords!
const logError = (err, req) => {
  console.log('ERROR:', err);
  console.log('Request:', req.body); // Logs passwords in plain text!
  console.log('Headers:', req.headers); // Logs auth tokens!
};

// BAD: No error handling in middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1]; // Crashes if header missing!
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = decoded;
  next();
};

// ==================== AUTH ROUTES ====================

// Register - BAD: No input validation!
app.post('/api/auth/register', async (req, res) => {
  const { email, password, role, firstName, lastName, phone } = req.body;
  
  // BAD: No validation that email is actually an email
  // BAD: No password strength check
  // BAD: No check for existing user (will crash with duplicate)
  
  const hashedPassword = await bcrypt.hash(password, 5); // BAD: Too few rounds (5)
  
  const user = new User({
    email,
    password: hashedPassword,
    role: role || 'user' // BAD: Client can send role: 'admin'!
  });
  
  await user.save(); // BAD: No try-catch, will crash on error
  
  const wallet = new Wallet({
    userId: user._id.toString(),
    balance: 1000,
    currency: 'USD'
  });
  await wallet.save();
  
  res.json({ message: 'User registered', userId: user._id });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = await User.findOne({ email });
  
  // BAD: Timing attack - different messages for user not found vs wrong password
  if (!user) {
    return res.json({ error: 'User not found' }); // Leaks that email doesn't exist
  }
  
  const isValid = await bcrypt.compare(password, user.password);
  
  if (!isValid) {
    return res.json({ error: 'Wrong password' }); // Leaks that user exists!
  }
  
  // BAD: 1 year expiration, includes too much data in token
  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role, password: user.password }, // BAD: Password in JWT!
    JWT_SECRET,
    { expiresIn: '365d' }
  );
  
  res.json({ token, user });
});

// Search users - BAD: Direct query injection
app.get('/api/auth/users/search', async (req, res) => {
  // BAD: No auth check!
  // BAD: Direct pass-through to MongoDB - NoSQL injection!
  const users = await User.find(req.query);
  res.json(users);
});

// ==================== WALLET ROUTES ====================

// Get balance - BAD: No auth!
app.get('/api/wallet/balance', async (req, res) => {
  const { userId } = req.query; // BAD: Taking userId from query, not token!
  const wallet = await Wallet.findOne({ userId });
  res.json(wallet);
});

// Transfer - BAD: Multiple critical vulnerabilities
app.post('/api/wallet/transfer', async (req, res) => {
  const { fromUserId, toUserId, amount } = req.body; // BAD: Client specifies sender!
  
  const fromWallet = await Wallet.findOne({ userId: fromUserId });
  const toWallet = await Wallet.findOne({ userId: toUserId });
  
  // BAD: No check if wallets exist
  // BAD: No check if amount is positive
  // BAD: No check if sufficient balance
  
  fromWallet.balance -= amount;
  toWallet.balance += amount;
  
  // BAD: No atomicity - one could fail!
  await fromWallet.save();
  await toWallet.save();
  
  // BAD: String concatenation SQL injection
  await pgPool.query(`INSERT INTO transactions (from_user_id, to_user_id, amount) VALUES ('${fromUserId}', '${toUserId}', ${amount})`);
  
  res.json({ message: 'Transfer done' });
});

// ==================== TRANSACTION ROUTES ====================

// Get transactions - BAD: No auth, returns all transactions!
app.get('/api/transactions', async (req, res) => {
  const result = await pgPool.query('SELECT * FROM transactions');
  res.json(result.rows);
});

// Get transaction by ID - BAD: IDOR vulnerability
app.get('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  // BAD: No ownership check - anyone can view any transaction!
  const result = await pgPool.query('SELECT * FROM transactions WHERE id = $1', [id]);
  res.json(result.rows[0]);
});

// ==================== ADMIN ROUTES ====================

// Admin users - BAD: No actual admin check, just trusts header
app.get('/api/admin/users', async (req, res) => {
  // BAD: This doesn't actually verify anything!
  if (req.headers['x-role'] !== 'admin') {
    return res.json({ error: 'Not admin' });
  }
  const users = await User.find();
  res.json(users);
});

// BAD: No error handling middleware
// BAD: No request logging
// BAD: No rate limiting
// BAD: No HTTPS enforcement

app.listen(3001, () => {
  console.log('Server running on port 3001');
});

// BAD: No graceful shutdown - connections will be terminated abruptly
