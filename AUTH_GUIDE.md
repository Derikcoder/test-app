# Authentication System - Quick Reference

## 🎯 Multi-Principal Authentication System

The app now supports a complete multi-principal authentication system with MongoDB integration.

## 📍 Entry Point

- **Default Route:** `/` → Redirects to `/login`
- **Registration:** `/register`
- **Login:** `/login`
- **Profile:** `/profile` (Protected - requires login)

## 🔐 User Data Captured

### Registration Form Fields

- **userName** - Unique username
- **email** - Email address (unique)
- **password** - Minimum 6 characters
- **businessName** - Business name
- **businessRegistrationNumber** - Registration number (optional, write-once)
- **taxNumber** - Tax number (optional, write-once)
- **vatNumber** - VAT number (optional, write-once)
- **phoneNumber** - Contact phone
- **physicalAddress** - Business address
- **websiteAddress** - Website URL (optional)

## 🚀 How to Use

### 1. Start the Servers

Both servers are currently running:

- **Backend:** `https://localhost:5000`
- **Frontend:** `https://localhost:3000`

### 2. Register a Principal User

1. Open `https://localhost:3000`
2. You'll be redirected to the login page
3. Click "Don't have an account? Register"
4. Fill in all required fields
5. Click "Register"
6. You'll be automatically logged in and redirected to your profile

### 3. Login

1. Go to `https://localhost:3000/login`
2. Enter email and password
3. Click "Login"
4. You'll be redirected to your profile page

## 📡 API Endpoints

### Authentication Routes

- `POST /api/auth/register` - Register new principal user
- `POST /api/auth/login` - Login user
- `POST /api/auth/passkeys/generate` - Generate onboarding passkey (admin roles)
- `POST /api/auth/passkeys/request-renewal` - Request passkey renewal
- `POST /api/auth/passkeys/fulfill-renewal/:requestToken` - Fulfill renewal request
- `GET /api/auth/profile` - Get user profile (Protected)
- `PUT /api/auth/profile` - Update user profile (Protected)
- `POST /api/auth/admin/profile-links/attach` - Attach operational profile
- `POST /api/auth/admin/profile-links/detach` - Detach operational profile
- `POST /api/auth/admin/profile-links/reassign` - Reassign operational profile
- `GET /api/auth/admin/registration-overrides/audits` - Query legal override audits

### Role Model

- `superAdmin`
- `businessAdministrator`
- `fieldServiceAgent`
- `customer`

### Registration Identifier Policy

- `businessRegistrationNumber`, `taxNumber`, `vatNumber` are write-once for non-superAdmin users.
- SuperAdmin changes to existing values require `registrationChangeEvidence`.
- Approved superAdmin overrides create immutable legal audit records.

### Example API Usage

#### Register

```javascript
POST https://localhost:5000/api/auth/register
Content-Type: application/json

{
  "userName": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "businessName": "ABC Corp",
  "businessRegistrationNumber": "REG123456",
  "taxNumber": "TAX123456",
  "vatNumber": "VAT123456",
  "phoneNumber": "+27123456789",
  "physicalAddress": "123 Main St, City, 1234",
  "websiteAddress": "https://example.com"
}
```

#### Login

```javascript
POST https://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

## 🗄️ MongoDB Setup

### If MongoDB is NOT running

#### Option 1: Install MongoDB locally

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

#### Option 2: Use MongoDB Atlas (Free Cloud)

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a cluster
4. Get your connection string
5. Update `server/.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/test-app?retryWrites=true&w=majority
```

### Current Status

✅ Server runs without MongoDB (with warning)
✅ Registration/Login will work once MongoDB is connected

## 📁 File Structure

### Backend

```text
server/
├── controllers/auth.controller.js  # Authentication logic
├── middleware/auth.middleware.js   # JWT verification
├── models/User.model.js           # User schema
├── routes/auth.routes.js          # Auth endpoints
└── server.js                      # Main server (updated)
```

### Frontend

```text
client/src/
├── components/
│   ├── Register.jsx       # Registration form
│   ├── Login.jsx         # Login form
│   └── UserProfile.jsx   # User profile page
├── context/
│   └── AuthContext.jsx   # Authentication state
└── App.jsx              # Routes setup
```

## 🔒 Security Features

- Passwords hashed with bcrypt
- JWT tokens for authentication
- Protected routes
- Token stored in localStorage
- Automatic redirect for unauthorized access

## 🎨 Design

- Fully responsive Tailwind CSS styling
- Professional forms with validation
- Clean user profile display
- Loading states and error handling

## 🛠️ Tech Stack Used

- **Frontend:** React + Vite + React Router + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Auth:** JWT + bcryptjs
- **HTTP Client:** Axios

## 📝 Next Steps

1. Connect MongoDB (see MongoDB Setup above)
2. Register a test super user
3. Test login functionality
4. View user profile
5. Customize profile page as needed
