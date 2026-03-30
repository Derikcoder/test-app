# Field Service Management System

A comprehensive full-stack MERN application for managing field service operations, including customer intake, agent management, service call tracking, and Google Maps integration.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Manual Setup](#manual-setup)
- [Environment Configuration](#environment-configuration)
- [Local HTTPS Setup](#local-https-setup)
- [API Documentation](#api-documentation)
- [API Schema Registry & Flow Maps](#api-schema-registry--flow-maps)
- [Authentication & Authorization](#authentication--authorization)
- [Development Workflow](#development-workflow)
- [Available Scripts](#available-scripts)
- [Project Architecture](#project-architecture)
- [Key Concepts](#key-concepts)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Additional Documentation](#additional-documentation)

## Overview

This is an enterprise-grade field service management application built with the MERN stack (MongoDB, Express.js, React, Node.js). It provides a complete solution for managing field service operations, from customer intake and agent assignment to service call tracking and business analytics.

**Target Use Case:** Service-based businesses that need to manage field agents, customer service requests, job scheduling, and maintain detailed operational records.

## Key Features

### Authentication & User Management

- 🔐 JWT-based authentication system
- 👤 Comprehensive user profiles with business information
- 🛡️ Field-level permissions with immutable + write-once legal identifier policies
- 🔒 Secure password hashing with bcrypt

### Customer Management

- 📝 Customer profile registration focused on core customer identity and location capture
- 🗺️ Google Maps integration for location services
- 📍 Address autocomplete and geolocation
- 🧭 Business structure captured up front for business customers (single business vs. head office)
- 🧱 Multi-site onboarding now happens from business customer profiles after registration
- 🛠️ Machine onboarding now happens from business customer profiles and is tied to specific sites
- 🧾 Billing policy support: default billing to service-site address with optional customer-specific billing override
- 🏢 Head Office profile includes editable billing policy and branch management panel
- 📊 Service request tracking per customer

### Field Agent Management

- 👨‍🔧 Complete agent profile management (CRUD operations)
- 📈 Job statistics and performance metrics
- 📅 Service history tracking
- 🎯 Agent availability and assignment status
- 📞 Direct customer contact actions from agent profile (WhatsApp-first + regular call)

### Service Call Management

- 📞 Service call creation and tracking
- 🔄 Status workflow management
- 📅 Scheduling and assignment
- 📝 Detailed service notes and history
- 🧾 Service history classification (first service call vs existing customer)
- 🗓️ Existing customer last-service date support with auto-fill by contact email
- 🧭 Existing-customer lifecycle capture (services in progress + progress status)
- 🧾 Quotation and invoicing history capture in structured booking request
- 🚨 SuperUser operations queue for unassigned call alerts and assignment to field agents
- 🧩 Reusable quote creation component available from agent profile and service calls views
- 🏷️ Machine label lookup in booking flow (`EQ-xxxxxx`) to auto-link exact equipment/customer/site context
- 🔗 Service calls now persist linked `customer`, `siteId`, and `equipment` when available for precise machine-level history
- 🧠 Residential category templates in booking flow: Mechanical, Electrical, Plumbing, Property Maintenance
- 🏠 Residential unified timeline view with category/status filters for cross-category property service history
- 🧩 Business booking modes now support `standard`, `multi-task`, and `project` workflows for single-business multi-service operations
- 🧮 Multi-task visits capture itemized task lines (category, task title, labour hours, notes) with a consolidated labour-hour summary
- 🧭 Unified timeline now supports optional machine-label asset filtering for both residential and business history views
- 🔐 Machine label IDs are normalized and validated to `EQ-<digits>` format to prevent malformed timeline filter data

### Quotation Management

- 🧾 Reusable Create Quote modal for both superAdmin and customer-oriented flows
- ✅ Quote submission flow uses `Submit Quote` action semantics
- 📄 Real quotation PDF generation endpoint available at `GET /api/quotations/:id/pdf`
- 📤 Quote delivery endpoint available at `POST /api/quotations/:id/send` for optional Email/WhatsApp/Telegram distribution
- 🔗 Public share link support for customer PDF access: `GET /api/quotations/share/:token/pdf`
- 📊 Auto-calculated subtotal, VAT, and total during quotation creation
- 🔁 Quote prefill from historical/service-call machine data
- 🧠 Machine-model quote templates (Perkins/Cummins/generic fallback)
- ⚡ Shortcut API to create quote from service call context: `POST /api/quotations/from-service-call/:serviceCallId`
- 🎛️ Explicit template selector in quote modal: Auto, Perkins, Cummins, Emergency Repair, Generic
- 🏷️ Optional line-item part number field to improve future auto-quote generation from machine/parts history
- 📈 Unit cost entry now auto-applies tiered markup to selling unit price: <R1000 (50%), <R2000 (40%), <R3000 (30%), <R4000 (25%), <R5000 (20%), >=R5000 (20%)
- 🧮 Separated costing concerns: Parts line items, Labour (hours × rate), Consumables (% of parts), and function-based Travel costing
- 🚗 Travel costing formula: `(distanceTravelledKm × ratePerKm) + timeTravelledCost` (distance is variable; time component is currently manual)
- 🛣️ Default `ratePerKm` is `R8.50` and can only be changed by superAdmin
- 📞 Call-out floor rule: if `distanceTravelledKm < 45` and `travelTimeMinutes < 30`, travel charge is floored to a minimum of `R650.00`
- ⏱️ `travelTimeMinutes` is now captured explicitly to support Google API distance/time enrichment later
- 🧰 First-time customer/site visit package: includes first 15 minutes on-site assessment before billable labour is calculated
- 🧾 Accepted quotations auto-convert to service jobcards and are created in `in-progress` status for operations visibility
- 📦 Parts fulfilment capture for profitability analysis: in-house procurement vs third-party delivery (e.g., Picup)
- 💸 Captures procurement and delivery economics: `partsProcurementCost`, `thirdPartyDeliveryCost`, and derived `estimatedPartsProfit`
- 📅 Default quotation validity is now 14 days, with calendar override available for customer-specific arrangements
- 🔒 Labour rate is editable by superAdmin only; backend enforces default `R650/hour` for non-super users

### Invoice & Pro-Forma Workflow

- 🧾 Pro-forma site instruction workflow lets field agents capture additional work, discovered problems, solutions, and deposit requirements on site
- 📤 Strict invoice workflow validation: `draft` → `sent` → `approved`/`rejected` → `finalized` with lifecycle timestamps and payment tracking
- 💾 Extended invoice schema with: `sentAt`, `approvedAt`, `rejectedAt`, `rejectedReason`, `finalizedAt`, `depositRequired`, `depositAmount`, `paymentReceived`
- ✅ Email recipient validation required before invoice can transition to customer approval step
- 📤 Billing delivery endpoint supports email plus WhatsApp/Telegram share links for customer review
- 🔗 Public invoice share summary endpoint available at `GET /api/invoices/share/:token`
- 📄 Public PDF access available at `GET /api/invoices/share/:token/pdf`
- ✅ Public customer approval/rejection endpoint available at `POST /api/invoices/share/:token/decision`
- 🌐 Customer-facing approval route available at `/invoice-approval/:token`

### Role-Aware Visual System

- 🎯 Unified color legend in sidebar footer for instant entity recognition across all pages
- 🎨 **Color Language:** Cyan (Field Agents), Indigo (Customers), Amber (Service Calls), Orange (Quotations), Emerald (Invoices/Pro-Forma)
- 👤 **Role Context Chips:** Every operational page displays current user role (Super Admin in fuchsia, operational roles in cyan)
- 📋 **Access Mode Indicators:** Visual distinction between governance mode (superAdmin) and operational mode
- 🔍 **Entity Chips:** Page headers display colored entity type chip matching sidebar legend
- 🌐 **Consistent Propagation:** Role and entity context visible on all operational pages (Customers, Service Calls, Quotations, Agent Profile) and invoice workflows (SiteInstructionModal, InvoiceApprovalPage)

### System Features

- 📋 Enterprise-level logging middleware
- 🔍 Request/response tracking
- 🚦 Health check endpoints
- 🔄 Hot module replacement (HMR)
- 📱 Responsive design with Tailwind CSS
- 🎨 Modern UI with role-aware sidebar navigation and entity legend
- 🧪 Customer registration QA infrastructure with Postman E2E collection, interactive test runner, and mandatory structured failure logging

## Tech Stack

### Frontend

| Technology                 | Version | Purpose                                            |
| -------------------------- | ------- | -------------------------------------------------- |
| **React**                  | ^18.2.0 | UI library for building component-based interfaces |
| **React Router**           | ^6.30.3 | Client-side routing and navigation                 |
| **Vite**                   | ^5.0.8  | Next-generation build tool and dev server          |
| **Tailwind CSS**           | ^3.4.0  | Utility-first CSS framework                        |
| **Axios**                  | ^1.6.2  | HTTP client for API requests                       |
| **@react-google-maps/api** | ^2.20.6 | Google Maps React components                       |

### Backend

| Technology     | Version | Purpose                                |
| -------------- | ------- | -------------------------------------- |
| **Node.js**    | v16+    | JavaScript runtime environment         |
| **Express.js** | ^4.18.2 | Web application framework              |
| **MongoDB**    | 8.0+    | NoSQL database                         |
| **Mongoose**   | ^8.0.3  | MongoDB object modeling and validation |
| **JWT**        | ^9.0.3  | JSON Web Token authentication          |
| **bcryptjs**   | ^2.4.3  | Password hashing                       |
| **dotenv**     | ^16.3.1 | Environment variable management        |

### Development Tools

- **Nodemon** - Auto-reload server on changes
- **ESLint** - Code linting and style enforcement
- **Postman** - API testing and execution of the customer registration E2E collection
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## Project Structure

```text
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
│   │   │   ├── InvoiceApprovalPage.jsx # Public customer pro-forma approval screen
│   │   │   ├── Customers.jsx       # Customer list page
│   │   │   ├── RegisterNewCustomer.jsx # Customer profile registration screen
│   │   │   ├── BusinessCustomerProfile.jsx # Shared site/machine onboarding shell for business customers
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
│   │   └── register_customers_test_errors.log # Customer registration test failures
│   ├── tests/
│   │   └── postman/
│   │       ├── register_customers_collection.json # Customer registration API test suite
│   │       └── POSTMAN_INSTRUCTIONS.md            # Postman execution guide
│   ├── package.json                # Backend dependencies
│   └── .env                        # Backend environment variables
│
├── certs/                         # Local HTTPS certificate workspace (gitignored cert/key files)
│   ├── README.md                  # Certificate placement and generation guide
│   └── CERTIFICATE_INVENTORY.md   # Certificate metadata, expiry, and fingerprint log
│
├── setup-and-run.sh                # Automated setup script
├── install-mongodb.sh              # MongoDB installation helper
├── register_customers_testcases.md # Customer registration E2E test specification
├── scripts/
│   ├── check-cert-expiry.sh        # Local certificate expiry and fingerprint verification
│   ├── log-register-customers-test-result.sh # Structured test result logger
│   └── run-register-customers-tests.sh       # Interactive registration test runner
├── package.json                    # Root scripts
├── AUTH_GUIDE.md                   # Authentication documentation
├── LOGGING_GUIDE.md                # Logging system documentation
├── PROJECT-STRUCTURE.md            # Detailed structure documentation
└── README.md                       # This file
```

For a detailed breakdown of each component's responsibilities, see [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md).

## Quick Start

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

Once running, open `https://localhost:3000` in your browser.

### Option 2: Manual Setup

See [Manual Setup](#manual-setup) section below for step-by-step instructions.

## Manual Setup

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
   - Frontend: `https://localhost:3000`
   - Backend API: `https://localhost:5000`
   - MongoDB: `mongodb://localhost:27017`

## Environment Configuration

### Server Environment Variables

Create `server/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/field-service-db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Local HTTPS (self-signed certs)
SSL_ENABLED=true
SSL_CERT_FILE=../certs/localhost+1.pem
SSL_KEY_FILE=../certs/localhost+1-key.pem

# Optional: MongoDB Atlas (cloud database)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/field-service-db
```

**⚠️ Important Security Notes:**

- Never commit `.env` files to version control
- Change `JWT_SECRET` to a strong, random string in production
- Use MongoDB Atlas or a secure database connection in production
- Follow the Development Rule in the Development Workflow section for all secret and local TLS handling

### Client Environment Variables

Create `client/.env`:

```env
# API Configuration
VITE_API_URL=https://localhost:5000
VITE_API_PROXY_TARGET=https://localhost:5000

# Local HTTPS (Vite dev server certs)
VITE_SSL_ENABLED=true
VITE_SSL_CERT_FILE=../certs/localhost+1.pem
VITE_SSL_KEY_FILE=../certs/localhost+1-key.pem

# Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

You can copy the template from [client/.env.example](client/.env.example) and fill in your values.

**Important Notes:**

- `VITE_` variables are bundled into the frontend and are visible to users
- Treat client-side API keys as public and restrict them in Google Cloud (HTTP referrers, API restrictions)
- Never commit `client/.env` to git; keep keys local or injected via CI/CD
- For local HTTPS, commit only the env variable names and example paths; never commit the raw `.pem`, `.key`, `.p12`, or `.pfx` files

**🗺️ Getting a Google Maps API Key:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Maps JavaScript API" and "Places API"
4. Create credentials (API Key)
5. Add the key to `client/.env`

## Local HTTPS Setup

Use this when developing with local SSL certificates (for browser APIs that require secure context and parity with production HTTPS behavior).

Development rule:

- Raw certificate and key files are treated as local secret material and must not be committed
- The repository only tracks documentation, inventory metadata, `.env.example` templates, and environment-variable file paths
- Actual certificate locations are configured through `SSL_CERT_FILE`, `SSL_KEY_FILE`, `VITE_SSL_CERT_FILE`, and `VITE_SSL_KEY_FILE`

### 1) Place certificates in shared root path

- Shared certs:
  - `certs/localhost+1.pem`
  - `certs/localhost+1-key.pem`

These files stay local on your machine. The env vars point to them; git must not contain their contents.

If your cert files are stored elsewhere, set explicit file paths in env vars:

- Server: `SSL_CERT_FILE`, `SSL_KEY_FILE`
- Client: `VITE_SSL_CERT_FILE`, `VITE_SSL_KEY_FILE`

### 2) Verify environment variables

Server (`server/.env`):

```env
SSL_ENABLED=true
SSL_CERT_FILE=../certs/localhost+1.pem
SSL_KEY_FILE=../certs/localhost+1-key.pem
```

Client (`client/.env`):

```env
VITE_API_URL=https://localhost:5000
VITE_API_PROXY_TARGET=https://localhost:5000
VITE_SSL_ENABLED=true
VITE_SSL_CERT_FILE=../certs/localhost+1.pem
VITE_SSL_KEY_FILE=../certs/localhost+1-key.pem
```

### 3) Start services

```bash
./start-dev.sh
```

Then access:

- Frontend: `https://localhost:3000`
- Backend API: `https://localhost:5000/api`

### 4) Self-signed cert notes

- Your browser may show a warning on first visit; trust the local certificate to continue.
- For CLI testing with curl against self-signed certs, use `-k`:

```bash
curl -k https://localhost:5000/api/health
```

- If certificate filenames change, update the env vars instead of renaming tracked documentation to match local secrets.

## API Documentation

### Base URL

```text
https://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint                                       | Description                                               | Auth Required |
| ------ | ---------------------------------------------- | --------------------------------------------------------- | ------------- |
| `POST` | `/auth/register`                               | Register new user                                         | No            |
| `POST` | `/auth/login`                                  | Login user                                                | No            |
| `POST` | `/auth/passkeys/generate`                      | Generate delegated-role onboarding passkey                | Yes           |
| `POST` | `/auth/passkeys/request-renewal`               | Request passkey renewal token                             | No            |
| `POST` | `/auth/passkeys/fulfill-renewal/:requestToken` | Approve renewal and issue new passkey                     | Yes           |
| `POST` | `/auth/admin/profile-links/attach`             | Attach user to operational profile                        | Yes           |
| `POST` | `/auth/admin/profile-links/detach`             | Detach user from operational profile                      | Yes           |
| `POST` | `/auth/admin/profile-links/reassign`           | Reassign user to another profile                          | Yes           |
| `GET`  | `/auth/admin/registration-overrides/audits`    | Query legal override audits (date/user/reference filters) | Yes           |
| `GET`  | `/auth/profile`                                | Get user profile                                          | Yes           |
| `PUT`  | `/auth/profile`                                | Update user profile                                       | Yes           |
| `GET`  | `/auth/field-permissions`                      | Get field permissions                                     | Yes           |

### Agent Endpoints

| Method   | Endpoint      | Description      | Auth Required |
| -------- | ------------- | ---------------- | ------------- |
| `GET`    | `/agents`     | Get all agents   | Yes           |
| `POST`   | `/agents`     | Create new agent | Yes           |
| `GET`    | `/agents/:id` | Get agent by ID  | Yes           |
| `PUT`    | `/agents/:id` | Update agent     | Yes           |
| `DELETE` | `/agents/:id` | Delete agent     | Yes           |

### Customer Endpoints

| Method   | Endpoint         | Description         | Auth Required |
| -------- | ---------------- | ------------------- | ------------- |
| `GET`    | `/customers`     | Get all customers   | Yes           |
| `POST`   | `/customers`     | Create new customer | Yes           |
| `GET`    | `/customers/:id` | Get customer by ID  | Yes           |
| `PUT`    | `/customers/:id` | Update customer     | Yes           |
| `DELETE` | `/customers/:id` | Delete customer     | Yes           |

### Service Call Endpoints

| Method   | Endpoint             | Description             | Auth Required |
| -------- | -------------------- | ----------------------- | ------------- |
| `GET`    | `/service-calls`     | Get all service calls   | Yes           |
| `POST`   | `/service-calls`     | Create new service call | Yes           |
| `GET`    | `/service-calls/:id` | Get service call by ID  | Yes           |
| `PUT`    | `/service-calls/:id` | Update service call     | Yes           |
| `DELETE` | `/service-calls/:id` | Delete service call     | Yes           |

Service call creation supports structured booking history fields in `bookingRequest`:

- `serviceHistoryType`: `first-service-call` or `existing-customer`
- `dateOfLastService`: required for existing-customer flow
- `servicesInProgress`: active service work context for existing-customer flow
- `progressStatus`: current progress state of in-flight service work
- `quotationHistory`: quotation references/history notes
- `invoicingHistory`: invoice references/history notes
- `preferredDate`: preferred service call date

Service call assignment workflow supports these fields:

- `assignedAgent`: selected field service agent
- `assignedDate`: timestamp when assignment occurred
- `agentAccepted`: whether the assigned agent has accepted the job
- `assignmentNotifiedAt`: timestamp when assignment alert was queued for crew follow-up

### System Endpoints

| Method | Endpoint  | Description     | Auth Required |
| ------ | --------- | --------------- | ------------- |
| `GET`  | `/`       | Welcome message | No            |
| `GET`  | `/health` | Health check    | No            |

### Example API Requests

**Register User:**

```bash
curl -k -X POST https://localhost:5000/api/auth/register \
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
curl -k -X POST https://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Get Profile (with token):**

```bash
curl -k -X GET https://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## API Schema Registry & Flow Maps

The project now uses a formal JSON Schema registry plus flow diagrams as the default API plumbing model.

This is the standard pattern to onboard every new API in this environment:

1. Define/update the endpoint contract in domain schema files.
2. Reference shared types/responses/auth policy from shared schemas.
3. Register the domain in the root project schema.
4. Document the data flow with Mermaid diagrams (technical + executive where needed).
5. Keep API collection and implementation aligned.

### Schema Registry Layout

- `schemas/project.schema.json` — root registry and domain wiring
- `schemas/shared/common.types.json` — shared primitives, enums, endpoint descriptor
- `schemas/shared/responses.json` — standardized success/error envelopes
- `schemas/shared/auth.policy.json` — access policies (`public`, `private`, `role-restricted`, `public-tokenized`)
- `schemas/domains/auth.domain.json`
- `schemas/domains/customers.domain.json`
- `schemas/domains/agents.domain.json`
- `schemas/domains/service-calls.domain.json`
- `schemas/domains/equipment.domain.json`
- `schemas/domains/quotations.domain.json`
- `schemas/domains/invoices.domain.json`

### Registration Flow Diagrams

- `docs/flowchart%20TD` — detailed technical registration process flow
- `docs/flowchart%20LR` — registration swimlane flow
- `docs/flowchart%20LR%20non%20technical` — executive/non-technical registration flow
- `docs/sequenceDiagram` — API sequence diagram for registration
- `docs/user-registration-swimlane-pannable.html` — interactive pannable + zoomable swimlane viewer

### Why This Matters

- Maintains one consistent contract model from route to controller to model.
- Makes endpoint exposing and binding predictable as the system scales.
- Improves change safety by forcing contract + flow updates with implementation.
- Gives technical and non-technical stakeholders a shared view of logic and data movement.

## Authentication & Authorization

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
import { useAuth } from "./context/AuthContext";

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

User profile updates now follow two policy layers:

- **Immutable fields**: identity and system fields (for example `userName`, `_id`, `createdAt`, role/link control fields)
- **Write-once registration identifiers**: `businessRegistrationNumber`, `taxNumber`, `vatNumber`

Write-once behavior:

- Non-superAdmin users can set registration identifiers when empty.
- After first save, those identifiers are locked for non-superAdmin users.
- SuperAdmin overrides of existing values require legal evidence payload (`registrationChangeEvidence`).

Legal override evidence fields:

- `legalDocumentType`
- `legalDocumentReference`
- `legalDocumentUri` (http/https)
- `legalChangeReason` (minimum 15 chars)

See [AUTH_GUIDE.md](AUTH_GUIDE.md) for detailed authentication documentation.

## Development Workflow

### Development Rule: Secret And Local TLS Handling

This repository follows a strict development rule for secrets and local HTTPS assets:

1. Secret values must live in local environment files or an external secret manager, never in tracked source files.
2. Local TLS certificate and key files are treated as secret material and must remain on the developer machine.
3. The repository may track only variable names, placeholder/example values, file-path references, documentation, and certificate inventory metadata.
4. When local TLS is required, configure file locations through `SSL_CERT_FILE`, `SSL_KEY_FILE`, `VITE_SSL_CERT_FILE`, and `VITE_SSL_KEY_FILE` instead of committing certificate contents.
5. If a secret or private key is ever staged by mistake, remove it from the commit immediately, rotate it if applicable, and document the incident in `SECURITY.md` when material exposure occurred.

Why this rule exists:

- It prevents accidental publication of reusable trust material such as private keys.
- It keeps the repository portable across developer machines and environments.
- It separates project documentation from machine-specific secrets.

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

   - Server runs on `https://localhost:5000`
   - Auto-reloads on file changes (nodemon)
   - Watch console for API requests and errors

3. **Start Frontend Client** (Terminal 2)

   ```bash
   cd client
   npm run dev
   ```

   - Client runs on `https://localhost:3000`
   - Hot module replacement (HMR) enabled
   - API requests proxied to backend

4. **Development Tips**
   - Use browser DevTools for debugging React components
   - Check server terminal for API errors and logs
   - MongoDB logs to `server/logs/server.log`
   - Use ESLint for code quality: `npm run lint`
   - Treat `.env` values and local TLS files as environment-specific secrets; commit docs and templates, not secret material

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

## Available Scripts

### Root Scripts

```bash
npm run install:all   # Install all dependencies (server + client)
npm run dev:server    # Start backend development server
npm run dev:client    # Start frontend development server
npm run build:client  # Build client for production
npm run test:postman:invoice-contract # Run tagged invoice contract validation via Newman
```

For required env vars and staging examples for this command, see [NPM_SCRIPTS.md quick run](NPM_SCRIPTS.md#quick-run-tagged-invoice-contract-validation).

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

## Project Architecture

### Data Flow

```text
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
4. **Field Protection** - Immutable identity fields + write-once registration identifiers with legal-evidence override controls
5. **Environment Variables** - Sensitive data in .env files
6. **Input Validation** - Mongoose schema validation

## Key Concepts

### Protected Field Rules

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

The customer registration form includes:

- **Address Autocomplete** - Google Places API integration
- **Geocoding** - Convert addresses to coordinates
- **Map Display** - Visual location confirmation
- **Customer-Only Intake** - Registers the customer profile without embedding a service-call booking flow
- **Profile-Based Business Onboarding** - Adds sites and machines from the business customer profile after registration

Requires `VITE_GOOGLE_MAPS_API_KEY` in `client/.env`.

## Troubleshooting

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

## Contributing

### Development Guidelines

1. **Code Style**
   - Use ESLint for JavaScript linting
   - Follow existing code structure and patterns
   - Add comments for complex logic

2. **Branch Architecture**

   This project follows a **parent → child → consolidation → production** branching model.
   Each branch represents a standalone, portable module that can be carried into other projects.

   ```text
   main                 ← Production (stable, never touched directly)
     └── consolidation  ← QA/merge point (all branches merged here before main)
           └── foundation    ← Base framework (parent of all features)
                 ├── feature/invoicing-engine
                 ├── feature/customer-portal
                 ├── feature/field-agent-app
                 └── feature/<module-name>
   ```

   | Branch          | Purpose                                                                        |
   | --------------- | ------------------------------------------------------------------------------ |
   | `main`          | Stable production code only. Never commit here directly.                       |
   | `consolidation` | Integration branch. All features merge here for QA before promoting to `main`. |
   | `foundation`    | Living base framework. All feature branches are created from here.             |
   | `feature/*`     | Standalone module branches. Named after the functionality they deliver.        |

   **Workflow:**

   ```bash
   # Start a new module from foundation
   git checkout foundation
   git checkout -b feature/your-module-name

   # Work on the feature, commit regularly
   git add .
   git commit -m "feat: Add new feature"

   # When ready, merge back to foundation
   git checkout foundation
   git merge feature/your-module-name

   # When foundation is stable, promote to consolidation for QA
   git checkout consolidation
   git merge foundation

   # Once QA passes, consolidation is merged into main
   git checkout main
   git merge consolidation
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

## Additional Documentation

- **[user-manual/README.md](user-manual/README.md)** - Human-facing manual index for setup, API, workflows, security, and user-story navigation
- **[AUTH_GUIDE.md](AUTH_GUIDE.md)** - Complete authentication system documentation
- **[LOGGING_GUIDE.md](LOGGING_GUIDE.md)** - Logging system and best practices
- **[PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md)** - Detailed codebase structure
- **[FIELD_PERMISSIONS.md](FIELD_PERMISSIONS.md)** - Field-level permission rules
- **[PROFILE_EDITING_GUIDE.md](PROFILE_EDITING_GUIDE.md)** - User profile editing guide
- **[AI_ASSISTANT_GUIDE.md](AI_ASSISTANT_GUIDE.md)** - AI assistant briefing and recent changes log
- **[API_COLLECTION.md](API_COLLECTION.md)** - API inventory, integration structure, and API management plan
- **[user-manual/setup/postman-local-https-runbook.md](user-manual/setup/postman-local-https-runbook.md)** - Single end-to-end path for local HTTPS setup, JWT auth, and Postman run order
- **[schemas/project.schema.json](schemas/project.schema.json)** - Root JSON Schema registry that wires all shared and domain API contracts
- **[schemas/shared/common.types.json](schemas/shared/common.types.json)** - Shared reusable primitives, enums, and endpoint descriptor schema
- **[docs/flowchart%20LR](docs/flowchart%20LR)** - Technical registration swimlane flow
- **[docs/flowchart%20LR%20non%20technical](docs/flowchart%20LR%20non%20technical)** - Executive registration flow
- **[docs/sequenceDiagram](docs/sequenceDiagram)** - Registration sequence diagram for API docs
- **[docs/user-registration-swimlane-pannable.html](docs/user-registration-swimlane-pannable.html)** - Interactive pannable registration flow diagram
- **[NPM_SCRIPTS.md](NPM_SCRIPTS.md)** - Complete npm scripts reference (root, client, and server)
- **[DEV_CHEATSHEET.md](DEV_CHEATSHEET.md)** - Practical developer command cheatsheet with descriptions
- **[certs/README.md](certs/README.md)** - Local HTTPS certificate placement and generation guidance
- **[certs/CERTIFICATE_INVENTORY.md](certs/CERTIFICATE_INVENTORY.md)** - Tracked local certificate metadata and verification history
- **[server/tests/postman/POSTMAN_INSTRUCTIONS.md](server/tests/postman/POSTMAN_INSTRUCTIONS.md)** - HTTPS-aware Postman execution guide for the registration suite
- **[server/tests/postman/test-scripts/README.txt](server/tests/postman/test-scripts/README.txt)** - Reusable Postman snippet library, environment imports, and tagged Newman runner usage

## Recent Updates

### March 26, 2026 — Postman Reusable Script Library + Tagged Invoice Contract Runner

- ✅ Added reusable Postman script library at `server/tests/postman/test-scripts/` with copy/paste-ready request snippets and templates
- ✅ Added import-ready Postman environments:
   - `server/tests/postman/test-scripts/templates/postman-environment.local-https.json`
   - `server/tests/postman/test-scripts/templates/postman-environment.local-http.json`
   - `server/tests/postman/test-scripts/templates/postman-environment.staging.json`
- ✅ Added tagged invoice contract-validation runner:
   - `npm run test:postman:invoice-contract`
   - Uses `server/tests/postman/test-scripts/snippets/tags.invoice-contract-validation.json` to decide which snippets execute
   - Requires `AUTH_TOKEN` and `SERVICE_CALL_ID` (optional `BASE_URL` override)

### March 26, 2026 — API Contract Plumbing via JSON Schemas + Registration Flow Models

- ✅ Added a full JSON Schema registry under `schemas/` for shared and per-domain API contracts
- ✅ Added root schema wiring in `schemas/project.schema.json` for cross-domain visibility
- ✅ Added registration process flow diagrams in `docs/` (technical, executive, swimlane, and sequence)
- ✅ Added interactive pannable registration swimlane viewer: `docs/user-registration-swimlane-pannable.html`
- ✅ Standardized API plumbing policy: every new API must be represented in schema registry + flow documentation

### March 25, 2026 — Local HTTPS and QA Documentation Alignment

- ✅ Standardized local development on shared root HTTPS certificates in `certs/`
- ✅ Added certificate inventory and expiry verification workflow (`npm run certs:check`)
- ✅ Updated setup docs, env examples, startup scripts, and Postman instructions for `https://localhost:3000` and `https://localhost:5000`
- ✅ Updated Postman collection defaults so imports now point at the HTTPS backend immediately

### March 23, 2026 — Role-Aware UI System & Pro-forma Workflow Hardening

**Backend Enhancements:**

- ✅ **Strict Invoice Workflow Validation:** Implemented state machine for invoice lifecycle with required email validation before customer approval
- ✅ **Extended Invoice Schema:** Added lifecycle timestamps (`sentAt`, `approvedAt`, `rejectedAt`, `finalizedAt`) and payment tracking fields
- ✅ **Improved Customer Resolution:** Enhanced service call auto-linking with fallback chain (booking email → cached customer → manual selection)
- ✅ **Expanded Test Coverage:** Added comprehensive unit tests for workflow transitions and customer resolution logic

**Frontend UX Enhancements:**

- ✅ **Global Entity Legend:** Added persistent color-coded entity legend to sidebar for consistent visual language across all pages
- ✅ **Role Context Chips:** Every operational page now displays user role (Super Admin ↔ Field Agent/Operational) and access mode
- ✅ **Color-Coded Entity Headers:** Applied colored entity chips to all operational pages matching sidebar legend:
  - Indigo for Customers
  - Amber for Service Calls
  - Orange for Quotations
  - Emerald for Invoices/Pro-Forma
- ✅ **Pro-forma Modal Enhancement:** SiteInstructionModal now includes role/entity context for clarity
- ✅ **Public Invoice UI:** InvoiceApprovalPage includes context chips for public customer approval flows
- ✅ **Auth Header Fix:** Enhanced Axios fallback logic to support multiple user object key patterns

**Impact:** Users can now instantly distinguish operational context through consistent visual design, and invoice workflows are hardened with strict validation rules preventing incomplete customer approvals.

## Support

For issues, questions, or contributions:

- **GitHub Issues:** [https://github.com/Derikcoder/test-app/issues](https://github.com/Derikcoder/test-app/issues)
- **Email:** [drckvanzyl@gmail.com](mailto:drckvanzyl@gmail.com)

## License

ISC

---

Built with the MERN Stack.
