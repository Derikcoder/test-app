# Authentication System - Quick Reference

## 🎯 Multi-Principal Authentication System

The app now supports a complete multi-principal authentication system with MongoDB integration.

## 📍 Entry Point
- **Default Route:** `/` → Redirects to `/login`
- **Registration:** `/register`
- **Login:** `/login`
- **Profile:** `/profile` (Protected - requires login)

## 🔐 User Data Captured

### Registration Form Fields:
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
- **Backend:** http://localhost:5000
- **Frontend:** http://localhost:3000

### 2. Register a Principal User
1. Open http://localhost:3000
2. You'll be redirected to the login page
3. Click "Don't have an account? Register"
4. Fill in all required fields
5. Click "Register"
6. You'll be automatically logged in and redirected to your profile

### 3. Login
1. Go to http://localhost:3000/login
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
- `POST /api/auth/admin/provision-user` - Admin-provisioned onboarding for existing customer or field-agent profiles; now returns a temporary secret access key plus reset-link email for first login
- `POST /api/auth/admin/resend-agent-welcome/:agentProfileId` - Refresh a field agent's first-login temporary secret access key and resend the welcome email
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

## Onboarding Summary

- `superAdmin` remains a principal admin account and does not use the temporary-access-key provisioning flow.
- `customer` and `fieldServiceAgent` now share the same admin-driven onboarding pattern: create the operational profile first, then call `POST /api/auth/admin/provision-user` to generate the linked user account.
- Provisioning returns a temporary secret access key for immediate first login and also sends a welcome email containing the same key plus a one-hour reset-password link.
- If the user loses the temporary key before setting a permanent password, they can use Forgot Password with the same email address.
- Admins can refresh field-agent first-login credentials with `POST /api/auth/admin/resend-agent-welcome/:agentProfileId` only while the linked user is still in first-login state.

## UAT Testing Methodology While Permanent Password Is Not Set

Use this methodology whenever a test account exists, but the persona has not yet set a permanent password.

Definition used during UAT:
- `password set = FALSE` means the account is still operating on first-login credentials only. The user may have a temporary secret access key, a reset-password link, or both, but no trusted permanent password has been confirmed yet.

Scope:
- This methodology applies to `customer` and `fieldServiceAgent` personas.
- `superAdmin` is excluded and should be managed with stricter admin credential controls.

UAT rule:
- Do not log out of the only active authenticated session for a persona if the permanent password has not been set and the latest temporary secret access key is not in hand.

Recommended UAT sequence:
1. Keep the current authenticated persona session open.
2. Open a separate browser, incognito window, or browser profile for `superAdmin`.
3. As `superAdmin`, open the target persona profile.
4. If no linked login exists, use `Provision Login`.
5. If a linked login already exists and the user has not yet set a permanent password, use `Resend Invite` to refresh the first-login credentials.
6. Capture the newest temporary secret access key shown in the UI.
7. In development, also capture the Ethereal preview URL from the backend terminal if email inspection is needed.
8. Only after the new temporary credentials are captured should the existing persona session be logged out.
9. Log back in using the newest temporary secret access key or use the reset link / Forgot Password if you intentionally want to test recovery.

Important UAT behavior:
- Each `Resend Invite` supersedes the previous temporary first-login credential for practical testing purposes. Always trust the newest key shown by the latest successful resend/provision action.
- `Resend Invite` is an acceptable repeatable UAT recovery tool while `password set = FALSE`.
- Once the permanent password is explicitly set and confirmed, SuperAdmin invite refresh is no longer available and the user must use normal login plus Forgot Password.

Operational note for solo testing:
- Treat `superAdmin` as your control console.
- Treat each separate browser session as a distinct persona workstation.
- Avoid switching personas by destroying your only authenticated session unless replacement credentials are already captured.

Target production direction:
- For MVP and UAT, `Provision Login` plus `Resend Invite` is the controlled first-login methodology.
- For production operations, all non-`superAdmin` personas should converge on the same recovery philosophy: onboarding creates first credentials, and ongoing recovery uses Forgot Password.

### Registration Identifier Policy
- `businessRegistrationNumber`, `taxNumber`, `vatNumber` are write-once for non-superAdmin users.
- SuperAdmin changes to existing values require `registrationChangeEvidence`.
- Approved superAdmin overrides create immutable legal audit records.

### Example API Usage

#### Register:
```javascript
POST http://localhost:5000/api/auth/register
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

#### Login:
```javascript
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

## 🗄️ MongoDB Setup

### If MongoDB is NOT running:

**Option 1: Install MongoDB locally**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**Option 2: Use MongoDB Atlas (Free Cloud)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a cluster
4. Get your connection string
5. Update `server/.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/test-app?retryWrites=true&w=majority
```

### Current Status:
✅ Server runs without MongoDB (with warning)
✅ Registration/Login will work once MongoDB is connected

## 📁 File Structure

### Backend:
```
server/
├── controllers/auth.controller.js  # Authentication logic
├── middleware/auth.middleware.js   # JWT verification
├── models/User.model.js           # User schema
├── routes/auth.routes.js          # Auth endpoints
└── server.js                      # Main server (updated)
```

### Frontend:
```
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
