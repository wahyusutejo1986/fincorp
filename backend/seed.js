/**
 * Seed script for Financial Application
 * Populates MongoDB (Users, Wallets) and PostgreSQL (Transactions) with sample data
 */

const mongoose = require('mongoose');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://mongo:27017/financial';

// PostgreSQL connection
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'financial',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres'
});

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

// Sample data
const sampleUsers = [
  {
    email: 'admin@financial.com',
    password: 'Admin123!',
    role: 'admin',
    firstName: 'System',
    lastName: 'Administrator',
    phone: '+1-555-0100'
  },
  {
    email: 'john.doe@example.com',
    password: 'Password123!',
    role: 'user',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1-555-0101'
  },
  {
    email: 'jane.smith@example.com',
    password: 'Password123!',
    role: 'user',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+1-555-0102'
  },
  {
    email: 'bob.wilson@example.com',
    password: 'Password123!',
    role: 'user',
    firstName: 'Bob',
    lastName: 'Wilson',
    phone: '+1-555-0103'
  },
  {
    email: 'alice.johnson@example.com',
    password: 'Password123!',
    role: 'user',
    firstName: 'Alice',
    lastName: 'Johnson',
    phone: '+1-555-0104'
  },
  {
    email: 'charlie.brown@example.com',
    password: 'Password123!',
    role: 'user',
    firstName: 'Charlie',
    lastName: 'Brown',
    phone: '+1-555-0105'
  },
  {
    email: 'diana.prince@example.com',
    password: 'Password123!',
    role: 'user',
    firstName: 'Diana',
    lastName: 'Prince',
    phone: '+1-555-0106'
  },
  {
    email: 'eve.anderson@example.com',
    password: 'Password123!',
    role: 'user',
    firstName: 'Eve',
    lastName: 'Anderson',
    phone: '+1-555-0107'
  },
  {
    email: 'frank.miller@example.com',
    password: 'Password123!',
    role: 'user',
    firstName: 'Frank',
    lastName: 'Miller',
    phone: '+1-555-0108'
  },
  {
    email: 'grace.hopper@example.com',
    password: 'Password123!',
    role: 'user',
    firstName: 'Grace',
    lastName: 'Hopper',
    phone: '+1-555-0109'
  },
  {
    email: 'henry.ford@example.com',
    password: 'Password123!',
    role: 'user',
    firstName: 'Henry',
    lastName: 'Ford',
    phone: '+1-555-0110'
  }
];

// Generate random date within last 90 days
const randomDate = () => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 90);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString();
};

// Generate random transactions between users
const generateTransactions = (userIds) => {
  const transactions = [];
  const types = ['transfer', 'deposit', 'withdrawal'];
  const statuses = ['completed', 'pending', 'failed'];
  
  // Generate 50 transactions
  for (let i = 0; i < 50; i++) {
    const fromIdx = Math.floor(Math.random() * userIds.length);
    let toIdx = Math.floor(Math.random() * userIds.length);
    while (toIdx === fromIdx) {
      toIdx = Math.floor(Math.random() * userIds.length);
    }
    
    const amount = parseFloat((Math.random() * 1000 + 10).toFixed(2));
    const taxRate = 0.001;
    const taxAmount = Math.floor(amount * taxRate * 100) / 100;
    
    transactions.push({
      from_user_id: userIds[fromIdx],
      to_user_id: userIds[toIdx],
      amount: amount,
      tax_amount: taxAmount,
      type: types[Math.floor(Math.random() * types.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      created_at: randomDate()
    });
  }
  
  return transactions;
};

// Retry wrapper for connections
const retryConnect = async (fn, name, retries = 10, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      console.log(`${name} connection attempt ${i + 1}/${retries} failed. Retrying in ${delay}ms...`);
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await retryConnect(async () => {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }, 'MongoDB');
    console.log('Connected to MongoDB');

    console.log('Connecting to PostgreSQL...');
    const pgClient = await retryConnect(() => pgPool.connect(), 'PostgreSQL');
    console.log('Connected to PostgreSQL');

    // Clear existing data
    console.log('\n=== Clearing existing data ===');
    await User.deleteMany({});
    console.log('Cleared users');
    await Wallet.deleteMany({});
    console.log('Cleared wallets');
    await pgClient.query('DELETE FROM transactions');
    console.log('Cleared transactions');

    // Create users and wallets
    console.log('\n=== Creating users and wallets ===');
    const createdUsers = [];
    const walletBalances = [5000, 2500, 7500, 1000, 15000, 3200, 8900, 1200, 500, 6700, 1500];
    
    for (let i = 0; i < sampleUsers.length; i++) {
      const userData = sampleUsers[i];
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = new User({
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
      });
      
      await user.save();
      createdUsers.push(user);
      
      // Create wallet with varying balance
      const wallet = new Wallet({
        userId: user._id.toString(),
        balance: walletBalances[i % walletBalances.length],
        currency: 'USD',
        createdAt: user.createdAt,
        updatedAt: new Date()
      });
      
      await wallet.save();
      
      console.log(`Created user: ${user.email} (${user.role}) - Wallet: $${wallet.balance}`);
    }

    // Create transactions
    console.log('\n=== Creating transactions ===');
    const userIds = createdUsers.map(u => u._id.toString());
    const transactions = generateTransactions(userIds);
    
    for (const txn of transactions) {
      await pgClient.query(
        `INSERT INTO transactions (from_user_id, to_user_id, amount, tax_amount, type, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [txn.from_user_id, txn.to_user_id, txn.amount, txn.tax_amount, txn.type, txn.status, txn.created_at]
      );
    }
    console.log(`Created ${transactions.length} transactions`);

    // Summary
    console.log('\n=== Seed completed successfully! ===');
    console.log(`Total users: ${createdUsers.length}`);
    console.log(`Total wallets: ${createdUsers.length}`);
    console.log(`Total transactions: ${transactions.length}`);
    
    console.log('\n=== Login credentials ===');
    console.log('Admin: admin@financial.com / Admin123!');
    console.log('Users: [email] / Password123!');
    console.log('Example: john.doe@example.com / Password123!');

    pgClient.release();
    await mongoose.connection.close();
    await pgPool.end();
    
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
