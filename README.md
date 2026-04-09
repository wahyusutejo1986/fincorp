# Financial Application

A full-stack financial application built with React, Node.js, Express, MongoDB, and PostgreSQL. This application provides user authentication, wallet management, and transaction processing capabilities.

## Architecture

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express
- **Databases**: 
  - MongoDB (Users, Wallets)
  - PostgreSQL (Transactions)
- **Authentication**: JWT-based

### Features

- User registration and login
- JWT-based authentication
- Wallet management with balance tracking
- Money transfers between users
- Transaction history and statistics
- Admin dashboard for system management
- Responsive UI with modern design

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM available for containers

## Quick Start

1. Clone the repository and navigate to the project directory:

```bash
cd financial-app
```

2. Start all services using Docker Compose:

```bash
docker-compose up --build
```

This will build and start all services including databases, backend API, and frontend.

3. Access the application:

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: See below

## API Documentation

### Authentication

#### Register a new user
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "role": "user",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get current user profile
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Search users
```http
GET /api/auth/users/search?email=user@example.com
Authorization: Bearer <token>
```

### Wallet

#### Get balance
```http
GET /api/wallet/balance
Authorization: Bearer <token>
```

#### Transfer money
```http
POST /api/wallet/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "toUserId": "user_id_here",
  "amount": 100.00,
  "description": "Payment for services"
}
```

#### Deposit funds
```http
POST /api/wallet/deposit
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 500.00
}
```

#### Search wallets
```http
GET /api/wallet/search?balance=1000
Authorization: Bearer <token>
```

### Transactions

#### Get my transactions
```http
GET /api/transactions
Authorization: Bearer <token>
```

#### Get transaction by ID
```http
GET /api/transactions/1
Authorization: Bearer <token>
```

#### Search transactions
```http
GET /api/transactions/search?type=transfer&status=completed
Authorization: Bearer <token>
```

#### Get transaction statistics
```http
GET /api/transactions/stats/summary?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

### Admin (Requires Admin Role)

#### Get all users
```http
GET /api/admin/users
Authorization: Bearer <admin-token>
```

#### Get all wallets
```http
GET /api/admin/wallets
Authorization: Bearer <admin-token>
```

#### Get all transactions
```http
GET /api/admin/transactions
Authorization: Bearer <admin-token>
```

## Development

### Running without Docker

#### Backend

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set environment variables:
```bash
export PORT=3001
export MONGODB_URI=mongodb://localhost:27017/financial
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=financial
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export JWT_SECRET=your-secret-key
```

3. Start the server:
```bash
npm run dev
```

#### Frontend

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Set environment variables:
Create a `.env` file:
```
VITE_API_URL=http://localhost:3001
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

### Database Connections

- MongoDB: `mongodb://admin:admin123@localhost:27017`
- PostgreSQL: `postgresql://postgres:postgres@localhost:5432/financial`

## Default User

When you register a new user, they receive a default balance of $1000 in their wallet.

## Project Structure

```
financial-app/
├── backend/
│   ├── server.js          # Main Express application
│   ├── package.json       # Backend dependencies
│   └── Dockerfile         # Backend container config
├── frontend/
│   ├── src/               # React source code
│   ├── package.json       # Frontend dependencies
│   └── Dockerfile         # Frontend container config
├── docker-compose.yml     # Docker orchestration
└── README.md             # This file
```

## Stopping the Application

To stop all services:

```bash
docker-compose down
```

To stop and remove all data volumes:

```bash
docker-compose down -v
```

## Troubleshooting

### Services failing to connect to databases

Wait a few seconds and restart the services. Databases may need time to initialize:

```bash
docker-compose restart
```

### Port conflicts

If ports 3000, 3001, 27017, or 5432 are already in use, modify the port mappings in `docker-compose.yml`.

### Container logs

View logs for a specific service:

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongo
docker-compose logs -f postgres
```

## License

MIT License - For educational and training purposes.
