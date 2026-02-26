# Field Service Management System

A comprehensive full-stack MERN application for managing field service operations, including customer intake, agent management, service call tracking, and Google Maps integration.

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Manual Setup](#manual-setup)
- [Environment Configuration](#environment-configuration)
- [API Documentation](#api-documentation)
- [Authentication & Authorization](#authentication--authorization)
- [Development Workflow](#development-workflow)
- [Available Scripts](#available-scripts)
- [Project Architecture](#project-architecture)
- [Key Concepts](#key-concepts)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Additional Documentation](#additional-documentation)

## 🎯 Overview

This is an enterprise-grade field service management application built with the MERN stack (MongoDB, Express.js, React, Node.js). It provides a complete solution for managing field service operations, from customer intake and agent assignment to service call tracking and business analytics.

**Target Use Case:** Service-based businesses that need to manage field agents, customer service requests, job scheduling, and maintain detailed operational records.

## ✨ Key Features

### Authentication & User Management
- 🔐 JWT-based authentication system
- 👤 Comprehensive user profiles with business information
- 🛡️ Field-level permissions (read-only protected fields)
- 🔒 Secure password hashing with bcrypt

### Customer Management
- 📝 Customer intake with detailed information capture
- 🗺️ Google Maps integration for location services
- 📍 Address autocomplete and geolocation
- 📊 Service request tracking per customer

### Field Agent Management
- 👨‍🔧 Complete agent profile management (CRUD operations)
- 📈 Job statistics and performance metrics
- 📅 Service history tracking
- 🎯 Agent availability and assignment status

### Service Call Management
- 📞 Service call creation and tracking
- 🔄 Status workflow management
- 📅 Scheduling and assignment
- 📝 Detailed service notes and history

### System Features
- 📋 Enterprise-level logging middleware
- 🔍 Request/response tracking
- 🚦 Health check endpoints
- 🔄 Hot module replacement (HMR)
- 📱 Responsive design with Tailwind CSS
- 🎨 Modern UI with sidebar navigation

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | ^18.2.0 | UI library for building component-based interfaces |
| **React Router** | ^6.30.3 | Client-side routing and navigation |
| **Vite** | ^5.0.8 | Next-generation build tool and dev server |
| **Tailwind CSS** | ^3.4.0 | Utility-first CSS framework |
| **Axios** | ^1.6.2 | HTTP client for API requests |
| **@react-google-maps/api** | ^2.20.6 | Google Maps React components |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | v16+ | JavaScript runtime environment |
| **Express.js** | ^4.18.2 | Web application framework |
| **MongoDB** | 8.0+ | NoSQL database |
| **Mongoose** | ^8.0.3 | MongoDB object modeling and validation |
| **JWT** | ^9.0.3 | JSON Web Token authentication |
| **bcryptjs** | ^2.4.3 | Password hashing |
| **dotenv** | ^16.3.1 | Environment variable management |

### Development Tools
- **Nodemon** - Auto-reload server on changes
- **ESLint** - Code linting and style enforcement
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 📁 Project Structure

```
test-app/
├── client/                          # React frontend application
│   ├── src/
│   │   ├── main.jsx                # React entry point
│   │   ├── App.jsx                 # Router configuration
│   │   ├── index.css               # Global styles
│   │   ├── api/
│   │   │   └── axios.js            # Axios instance configuration
│   │   ├── components/
│   │   │   ├── Sidebar.jsx         # Navigation sidebar
│   │   │   ├── Login.jsx           # Login screen
│   │   │   ├── Register.jsx        # Registration screen
│   │   │   ├── UserProfile.jsx     # User profile management
│   │   │   ├── FieldServiceAgents.jsx  # Agent CRUD operations
│   │   │   ├── AgentProfile.jsx    # Agent details & statistics
│   │   │   ├── Customers.jsx       # Customer intake form
│   │   │   └── ServiceCalls.jsx    # Service call management
│   │   └── context/
│   │       └── AuthContext.jsx     # Authentication state management
│   ├── index.html                  # HTML entry point
│   ├── vite.config.js              # Vite configuration
│   ├── tailwind.config.js          # Tailwind CSS configuration
│   ├── package.json                # Frontend dependencies
│   └── .env                        # Frontend environment variables
│
├── server/                          # Express backend API
│   ├── server.js                   # Server entry point
│   ├── config/
│   │   └── db.js                   # MongoDB connection
│   ├── controllers/
│   │   ├── auth.controller.js      # Authentication logic
│   │   ├── agent.controller.js     # Agent CRUD logic
│   │   ├── customer.controller.js  # Customer CRUD logic
│   │   └── serviceCall.controller.js  # Service call logic
│   ├── middleware/
│   │   ├── auth.middleware.js      # JWT verification
│   │   └── logger.middleware.js    # Request/error logging
│   ├── models/
│   │   ├── User.model.js           # User schema with field protection
│   │   ├── Agent.model.js          # Field agent schema
│   │   ├── Customer.model.js       # Customer schema
│   │   └── ServiceCall.model.js    # Service call schema
│   ├── routes/
│   │   ├── auth.routes.js          # Authentication routes
│   │   ├── agent.routes.js         # Agent routes
│   │   ├── customer.routes.js      # Customer routes
│   │   └── serviceCall.routes.js   # Service call routes
│   ├── logs/                       # Application logs
│   ├── package.json                # Backend dependencies
│   └── .env                        # Backend environment variables
│
├── setup-and-run.sh                # Automated setup script
├── install-mongodb.sh              # MongoDB installation helper
├── package.json                    # Root scripts
├── AUTH_GUIDE.md                   # Authentication documentation
├── LOGGING_GUIDE.md                # Logging system documentation
├── PROJECT-STRUCTURE.md            # Detailed structure documentation
└── README.md                       # This file
```

For a detailed breakdown of each component's responsibilities, see [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md).

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

The fastest way to get started is using the automated setup script:

```bash
# Clone the repository
git clone https://github.com/Derikcoder/test-app.git
cd test-app

# Run the automated setup script
./setup-and-run.sh
```

This script will:
- ✅ Check all prerequisites (Node.js, npm, MongoDB)
- ✅ Offer to install MongoDB if not present
- ✅ Create environment file templates
- ✅ Install all dependencies (root, server, client)
- ✅ Start MongoDB service
- ✅ Start the backend server (port 5000)
- ✅ Start the frontend client (port 3000)

Once running, open **http://localhost:3000** in your browser.

### Option 2: Manual Setup

See [Manual Setup](#manual-setup) section below for step-by-step instructions.

## 🔧 Manual Setup

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MongoDB** (v8.0 or higher) - [Installation Guide](https://www.mongodb.com/docs/manual/installation/)
- **Git** - [Download](https://git-scm.com/)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Derikcoder/test-app.git
   cd test-app
   ```

2. **Install Dependencies**
   
   Install all dependencies at once:
   ```bash
   npm run install:all
   ```
   
   Or install individually:
   ```bash
   # Root dependencies
   npm install
   
   # Server dependencies
   cd server
   npm install
   
   # Client dependencies
   cd ../client
   npm install
   cd ..
   ```

3. **Configure Environment Variables**
   
   Create `.env` files for both server and client (see [Environment Configuration](#environment-configuration) below).

4. **Start MongoDB**
   ```bash
   # Using systemctl (Linux)
   sudo systemctl start mongod
   
   # Using brew (macOS)
   brew services start mongodb-community
   
   # Manual start
   mongod --dbpath /path/to/data/directory
   ```

5. **Start the Application**
   
   Open two terminal windows:
   
   **Terminal 1 - Backend Server:**
   ```bash
   cd server
   npm run dev
   ```
   
   **Terminal 2 - Frontend Client:**
   ```bash
   cd client
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MongoDB: mongodb://localhost:27017

## ⚙️ Environment Configuration

### Server Environment Variables

Create `server/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/field-service-db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Optional: MongoDB Atlas (cloud database)
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/field-service-db
```

**⚠️ Important Security Notes:**
- Never commit `.env` files to version control
- Change `JWT_SECRET` to a strong, random string in production
- Use MongoDB Atlas or a secure database connection in production

### Client Environment Variables

Create `client/.env`:

```env
# API Configuration
VITE_API_URL=http://localhost:5000

# Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

You can copy the template from [client/.env.example](client/.env.example) and fill in your values.

**Important Notes:**
- `VITE_` variables are bundled into the frontend and are visible to users
- Treat client-side API keys as public and restrict them in Google Cloud (HTTP referrers, API restrictions)
- Never commit `client/.env` to git; keep keys local or injected via CI/CD

**🗺️ Getting a Google Maps API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Maps JavaScript API" and "Places API"
4. Create credentials (API Key)
5. Add the key to `client/.env`

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/register` | Register new user | No |
| `POST` | `/auth/login` | Login user | No |
| `GET` | `/auth/profile` | Get user profile | Yes |
| `PUT` | `/auth/profile` | Update user profile | Yes |
| `GET` | `/auth/field-permissions` | Get field permissions | Yes |

### Agent Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/agents` | Get all agents | Yes |
| `POST` | `/agents` | Create new agent | Yes |
| `GET` | `/agents/:id` | Get agent by ID | Yes |
| `PUT` | `/agents/:id` | Update agent | Yes |
| `DELETE` | `/agents/:id` | Delete agent | Yes |

### Customer Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/customers` | Get all customers | Yes |
| `POST` | `/customers` | Create new customer | Yes |
| `GET` | `/customers/:id` | Get customer by ID | Yes |
| `PUT` | `/customers/:id` | Update customer | Yes |
| `DELETE` | `/customers/:id` | Delete customer | Yes |

### Service Call Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/service-calls` | Get all service calls | Yes |
| `POST` | `/service-calls` | Create new service call | Yes |
| `GET` | `/service-calls/:id` | Get service call by ID | Yes |
| `PUT` | `/service-calls/:id` | Update service call | Yes |
| `DELETE` | `/service-calls/:id` | Delete service call | Yes |

### System Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/` | Welcome message | No |
| `GET` | `/health` | Health check | No |

### Example API Requests

**Register User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "johndoe",
    "email": "john@example.com",
    "password": "password123",
    "businessName": "ABC Corp",
    "businessRegistrationNumber": "REG123456",
    "taxNumber": "TAX123456",
    "vatNumber": "VAT123456",
    "phoneNumber": "+27123456789",
    "physicalAddress": "123 Main St, City, 1234"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Get Profile (with token):**
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔐 Authentication & Authorization

### How Authentication Works

1. **Registration:** User submits registration form → Server hashes password with bcrypt → User record created in MongoDB → JWT token generated and returned
2. **Login:** User submits credentials → Server validates and compares hashed password → JWT token generated and returned
3. **Protected Routes:** Client includes JWT in Authorization header → Server middleware validates token → Request proceeds if valid

### JWT Token Structure

The JWT token contains:
```json
{
  "userId": "user_id_here",
  "iat": 1234567890,
  "exp": 1234987654
}
```

### Using Authentication in Client

The `AuthContext` provides:
- `user` - Current user object
- `login(email, password)` - Login function
- `logout()` - Logout function
- `updateProfile(data)` - Update user profile

Example:
```javascript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user, login, logout } = useAuth();
  
  // Check if user is logged in
  if (!user) {
    return <div>Please login</div>;
  }
  
  return <div>Welcome, {user.userName}!</div>;
}
```

### Field-Level Permissions

Certain user profile fields are **read-only** after initial registration:
- `userName`
- `email`
- `businessRegistrationNumber`
- `taxNumber`
- `vatNumber`

These fields can only be modified by system administrators directly in the database.

See [AUTH_GUIDE.md](AUTH_GUIDE.md) for detailed authentication documentation.

## 💻 Development Workflow

### Recommended Development Process

1. **Start MongoDB** (if not already running)
   ```bash
   sudo systemctl start mongod
   ```

2. **Start Backend Server** (Terminal 1)
   ```bash
   cd server
   npm run dev
   ```
   - Server runs on http://localhost:5000
   - Auto-reloads on file changes (nodemon)
   - Watch console for API requests and errors

3. **Start Frontend Client** (Terminal 2)
   ```bash
   cd client
   npm run dev
   ```
   - Client runs on http://localhost:3000
   - Hot module replacement (HMR) enabled
   - API requests proxied to backend

4. **Development Tips**
   - Use browser DevTools for debugging React components
   - Check server terminal for API errors and logs
   - MongoDB logs to `server/logs/server.log`
   - Use ESLint for code quality: `npm run lint`

### Making Changes

**Frontend Changes:**
- Edit files in `client/src/`
- Changes auto-reload in browser
- Component structure follows React best practices
- Use Tailwind classes for styling

**Backend Changes:**
- Edit files in `server/`
- Server auto-restarts with nodemon
- Follow MVC pattern: Routes → Controllers → Models
- Add logging using logger middleware

**Database Changes:**
- Modify schemas in `server/models/`
- Mongoose handles schema validation
- Use MongoDB Compass for GUI database management

## 📜 Available Scripts

### Root Scripts

```bash
npm run install:all   # Install all dependencies (server + client)
npm run dev:server    # Start backend development server
npm run dev:client    # Start frontend development server
npm run build:client  # Build client for production
```

### Server Scripts

```bash
npm start            # Start server (production)
npm run dev          # Start server with nodemon (development)
```

### Client Scripts

```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🏗️ Project Architecture

### Data Flow

```
User Browser (React)
      ↓
  API Request (Axios)
      ↓
Express Server (Port 5000)
      ↓
Auth Middleware (JWT Validation)
      ↓
Route Handler
      ↓
Controller (Business Logic)
      ↓
Model (Mongoose Schema)
      ↓
MongoDB Database
```

### Component Architecture

**Frontend (React):**
- **Context API** - Global state management (AuthContext)
- **React Router** - Client-side routing
- **Axios Instance** - Centralized API configuration
- **Components** - Reusable UI components

**Backend (Express):**
- **Middleware Stack** - CORS, Body Parser, Logger, Auth
- **Routes** - Endpoint definitions
- **Controllers** - Business logic and validation
- **Models** - Data schemas and database interaction

### Security Layers

1. **CORS** - Cross-origin resource sharing configured
2. **JWT Authentication** - Token-based auth for protected routes
3. **Password Hashing** - Bcrypt with salt rounds
4. **Field Protection** - Certain fields immutable after creation
5. **Environment Variables** - Sensitive data in .env files
6. **Input Validation** - Mongoose schema validation

## 🔑 Key Concepts

### Field-Level Permissions

The system implements field-level permissions to protect critical business data:

**Protected Fields (Read-Only after creation):**
- User registration number
- Tax number
- VAT number
- Email address
- Username

These fields cannot be modified through the API after initial registration. This prevents accidental or malicious modification of legal identifiers.

### Logging System

Comprehensive logging middleware tracks:
- **Request Logging** - All incoming requests with timestamp, method, URL
- **Error Logging** - Errors with stack traces
- **Info Logging** - General application events

Logs are written to:
- Console (development)
- `server/logs/server.log` (file system)

See [LOGGING_GUIDE.md](LOGGING_GUIDE.md) for detailed logging documentation.

### Google Maps Integration

The customer intake form includes:
- **Address Autocomplete** - Google Places API integration
- **Geocoding** - Convert addresses to coordinates
- **Map Display** - Visual location confirmation

Requires `VITE_GOOGLE_MAPS_API_KEY` in `client/.env`.

## 🐛 Troubleshooting

### MongoDB Connection Issues

**Problem:** `MongoServerError: connect ECONNREFUSED`

**Solutions:**
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB
sudo systemctl start mongod

# Check MongoDB status
sudo systemctl status mongod

# View MongoDB logs
sudo journalctl -u mongod
```

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::5000`

**Solutions:**
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or change port in server/.env
PORT=5001
```

### Client Cannot Connect to API

**Problem:** Network errors or CORS issues

**Solutions:**
1. Verify backend is running on port 5000
2. Check `VITE_API_URL` in `client/.env`
3. Verify proxy configuration in `vite.config.js`
4. Check CORS settings in `server/server.js`

### JWT Token Issues

**Problem:** "Invalid token" or "Token expired"

**Solutions:**
1. Clear localStorage in browser DevTools
2. Re-login to get new token
3. Verify `JWT_SECRET` matches in server/.env
4. Check token expiration time in auth controller

### Google Maps Not Loading

**Problem:** Maps or autocomplete not working

**Solutions:**
1. Verify API key in `client/.env`
2. Enable required APIs in Google Cloud Console:
   - Maps JavaScript API
   - Places API
   - Geocoding API
3. Check API key restrictions
4. Verify billing is enabled (Google requires it)

### Build Errors

**Problem:** Build fails or dependencies missing

**Solutions:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force

# Update dependencies
npm update
```

## 🤝 Contributing

### Development Guidelines

1. **Code Style**
   - Use ESLint for JavaScript linting
   - Follow existing code structure and patterns
   - Add comments for complex logic

2. **Git Workflow**
   ```bash
   # Create feature branch
   git checkout -b feature/your-feature-name
   
   # Make changes and commit
   git add .
   git commit -m "feat: Add new feature"
   
   # Push and create pull request
   git push origin feature/your-feature-name
   ```

3. **Commit Message Format**
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes
   - `refactor:` Code refactoring
   - `test:` Test additions or changes
   - `chore:` Build process or auxiliary tool changes

4. **Testing**
   - Test all changes locally
   - Verify both frontend and backend work together
   - Check for console errors or warnings

### Pull Request Process

1. Update README.md or relevant documentation
2. Ensure all tests pass and code runs without errors
3. Update version numbers following semver
4. Submit PR with clear description of changes

## 📚 Additional Documentation

- **[AUTH_GUIDE.md](AUTH_GUIDE.md)** - Complete authentication system documentation
- **[LOGGING_GUIDE.md](LOGGING_GUIDE.md)** - Logging system and best practices
- **[PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md)** - Detailed codebase structure
- **[FIELD_PERMISSIONS.md](FIELD_PERMISSIONS.md)** - Field-level permission rules
- **[PROFILE_EDITING_GUIDE.md](PROFILE_EDITING_GUIDE.md)** - User profile editing guide

## 📞 Support

For issues, questions, or contributions:
- **GitHub Issues:** [https://github.com/Derikcoder/test-app/issues](https://github.com/Derikcoder/test-app/issues)
- **Email:** drckvanzyl@gmail.com

## 📄 License

ISC

---

**Built with ❤️ using the MERN Stack**
