# AI Assistant Guide - Field Service Management System

**Last Updated:** February 26, 2026  
**Project Version:** 1.0.0  
**Target Audience:** AI Code Assistants (GitHub Copilot, Cursor, etc.)

---

## 🚨 CRITICAL: Pre-Exit Protocol

**BEFORE allowing the user to quit/close the code editor, you MUST:**

1. **Display Alert**: Prompt user with:
   ```
   ⚠️ WAIT! Before closing, should I update the project documentation?
   - AI_ASSISTANT_GUIDE.md (this file)
   - PROJECT-STRUCTURE.md
   - README.md
   
   Changes may have been made that aren't reflected in docs.
   Update documentation now? (Recommended: Yes)
   ```

2. **If User Confirms**: Scan for significant changes in the last session:
   - New files created
   - Modified routes or API endpoints
   - Changed authentication logic
   - Updated database schemas
   - New components added
   - Modified environment variables

3. **Update These Files**:
   - `AI_ASSISTANT_GUIDE.md` - Update "Recent Changes" section
   - `PROJECT-STRUCTURE.md` - Reflect any structural changes
   - `README.md` - Update if new features or setup steps were added
   - Add timestamp and change summary

4. **Only Then**: Allow editor to close

**This ensures project documentation stays synchronized with codebase changes.**

---

## 📋 Quick Context

### What Is This Project?
A full-stack MERN (MongoDB, Express, React, Node.js) application for managing field service operations. It handles customer intake, field agent management, service call tracking, and includes Google Maps integration for location services.

### Business Context
- **Primary Users**: Service companies with field technicians (plumbers, HVAC, electricians, etc.)
- **Key Value**: Centralized management of agents, customers, and service requests
- **Critical Features**: Authentication, field-level permissions, job tracking, agent statistics

### Development Status
- ✅ Authentication system complete
- ✅ User/Agent/Customer/Service Call CRUD operations
- ✅ Field-level permissions implemented
- ✅ Google Maps integration setup
- ⚠️ Service Calls UI is placeholder (needs full implementation)
- ✅ Comprehensive logging system
- ✅ Industry-standard code comments throughout

---

## 🏗️ Architecture Overview

### Tech Stack

**Backend:**
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB 8.0+ (Mongoose ODM 8.0.3)
- **Authentication**: JWT (jsonwebtoken 9.0.3)
- **Security**: bcryptjs for password hashing
- **Dev Tools**: nodemon for hot-reload

**Frontend:**
- **Library**: React 18.2.0
- **Build Tool**: Vite 5.0.8
- **Routing**: React Router 6.30.3
- **HTTP Client**: Axios 1.6.2
- **Styling**: Tailwind CSS 3.4.0
- **Maps**: @react-google-maps/api 2.20.6

**Database:**
- **Type**: NoSQL (MongoDB)
- **Connection**: Local development (mongodb://localhost:27017)
- **Production**: MongoDB Atlas ready

### Project Structure

```
test-app/
├── server/                  # Backend API (Express + MongoDB)
│   ├── server.js           # Entry point, middleware setup
│   ├── config/
│   │   └── db.js           # MongoDB connection
│   ├── middleware/
│   │   ├── auth.middleware.js      # JWT verification
│   │   └── logger.middleware.js    # Request/error logging
│   ├── models/
│   │   ├── User.model.js           # SuperUser schema
│   │   ├── FieldServiceAgent.model.js
│   │   ├── Customer.model.js
│   │   └── ServiceCall.model.js
│   ├── controllers/
│   │   ├── auth.controller.js      # Registration, login, profile
│   │   ├── agent.controller.js     # Agent CRUD
│   │   ├── customer.controller.js  # Customer CRUD
│   │   └── serviceCall.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── agent.routes.js
│   │   ├── customer.routes.js
│   │   └── serviceCall.routes.js
│   └── logs/               # Application logs
│
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── main.jsx        # React entry point
│   │   ├── App.jsx         # Router configuration
│   │   ├── index.css       # Global styles + Tailwind
│   │   ├── api/
│   │   │   └── axios.js    # Axios instance configuration
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Global auth state
│   │   └── components/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── UserProfile.jsx
│   │       ├── FieldServiceAgents.jsx
│   │       ├── AgentProfile.jsx
│   │       ├── Customers.jsx      # Google Maps integration
│   │       ├── ServiceCalls.jsx   # ⚠️ Placeholder
│   │       └── Sidebar.jsx
│   ├── index.html
│   └── vite.config.js      # Dev server + proxy config
│
├── setup-and-run.sh        # Automated setup script
├── install-mongodb.sh      # MongoDB installation helper
├── README.md               # User-facing documentation
├── PROJECT-STRUCTURE.md    # Detailed architecture docs
├── AUTH_GUIDE.md           # Authentication system guide
├── LOGGING_GUIDE.md        # Logging system guide
└── AI_ASSISTANT_GUIDE.md   # This file
```

---

## 🔑 Key Concepts & Conventions

### 1. Field-Level Permissions

**Critical Feature**: Certain fields are immutable after creation to protect business-critical data.

**Protected Fields (User Model):**
- `userName` - Cannot change (identity)
- `businessName` - Cannot change (legal entity)
- `businessRegistrationNumber` - Cannot change (legal identifier)
- `createdAt` - System-managed
- `_id` - Database identifier
- `isSuperUser` - Security flag

**Implementation:**
- Models define `IMMUTABLE_FIELDS` and `EDITABLE_FIELDS` arrays
- Controllers validate update requests against these arrays
- Attempts to modify protected fields return 403 Forbidden
- See: `server/models/User.model.js` and `server/controllers/auth.controller.js`

**Why This Matters:**
- Prevents accidental modification of legal identifiers
- Maintains data integrity for accounting/compliance
- Protects against malicious field manipulation

### 2. Authentication Flow

**Registration:**
1. User submits form → `POST /api/auth/register`
2. Backend validates all required fields
3. Password hashed with bcrypt (10 salt rounds)
4. User created in MongoDB
5. JWT generated with 30-day expiration
6. Token + user data returned to client
7. Client stores in localStorage via AuthContext

**Login:**
1. User submits credentials → `POST /api/auth/login`
2. Backend finds user by email
3. Password compared with hashed version
4. JWT generated and returned
5. Client stores and redirects to `/profile`

**Protected Routes:**
1. Client includes JWT in request header: `Authorization: Bearer <token>`
2. Server middleware (`protect`) extracts token
3. Token verified with JWT_SECRET
4. User ID decoded from token
5. User fetched from database (password excluded)
6. User attached to `req.user` for controllers
7. Request continues or 401 if invalid

**Token Storage:**
- Stored in localStorage (key: 'userInfo')
- Persists across browser sessions
- Cleared on logout
- Managed by AuthContext

### 3. Environment Variables

**Server (.env - server/):**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/field-service-db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

**Client (.env - client/):**
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

**⚠️ Security Notes:**
- `.env` files are gitignored
- Never commit API keys or secrets
- JWT_SECRET must be strong in production
- Google Maps API key needs billing enabled

### 4. API Proxy Configuration

**How It Works:**
- Vite dev server (port 3000) proxies `/api/*` to backend (port 5000)
- Configured in `client/vite.config.js`
- Client makes requests to `/api/auth/login` (relative)
- Vite forwards to `http://localhost:5000/api/auth/login`
- Avoids CORS issues in development

**Production:**
- Build client: `npm run build` (creates `dist/`)
- Serve static files from Express
- API and frontend on same origin

### 5. Logging System

**Request Logging:**
- Every HTTP request logged to console and `server/logs/request.log`
- Includes: timestamp, method, URL, IP, body (passwords masked)
- Use `requestLogger` middleware

**Error Logging:**
- All errors logged to console and `server/logs/error.log`
- Includes: timestamp, stack trace, request context
- Use `errorLogger` middleware or `logError()` function

**General Logging:**
- `logInfo(message)` - Informational messages
- `logError(message, error)` - Error messages

**Files:**
- `server/middleware/logger.middleware.js`
- `server/logs/` directory

### 6. Database Relationships

**User (SuperUser):**
- No direct references (top-level entity)
- Creates Agents, Customers, and Service Calls

**FieldServiceAgent:**
- Reference: `createdBy` → User._id
- Referenced by: ServiceCall.assignedAgent

**Customer:**
- Reference: `createdBy` → User._id
- Referenced by: ServiceCall.customer

**ServiceCall:**
- Reference: `createdBy` → User._id
- Reference: `customer` → Customer._id
- Reference: `assignedAgent` → FieldServiceAgent._id

**Mongoose Population:**
- Use `.populate('customer')` to get customer details in service call queries
- Use `.populate('assignedAgent')` for agent details

### 7. Auto-Generated Fields

**Service Call Numbers:**
- Format: `SC-000001`, `SC-000002`, etc.
- Auto-generated by pre-save hook if not provided
- Sequential numbering based on document count
- See: `server/models/ServiceCall.model.js`

**Timestamps:**
- All models have `timestamps: true`
- Automatically adds `createdAt` and `updatedAt`
- Updated automatically by Mongoose

---

## 🔧 Common Development Tasks

### Adding a New API Endpoint

1. **Define Route** (`server/routes/*.routes.js`):
   ```javascript
   router.get('/new-endpoint', protect, controllerFunction);
   ```

2. **Create Controller** (`server/controllers/*.controller.js`):
   ```javascript
   export const controllerFunction = async (req, res) => {
     try {
       // Logic here
       res.json({ data });
     } catch (error) {
       res.status(500).json({ message: error.message });
     }
   };
   ```

3. **Add JSDoc Comments**:
   ```javascript
   /**
    * @route   GET /api/resource/new-endpoint
    * @desc    Description of what it does
    * @access  Private/Public
    */
   ```

4. **Update Documentation**:
   - Add endpoint to README.md API Documentation section
   - Update AI_ASSISTANT_GUIDE.md if significant

### Adding a New React Component

1. **Create Component** (`client/src/components/NewComponent.jsx`):
   ```jsx
   /**
    * @file NewComponent.jsx
    * @description Component purpose
    */
   import { useState } from 'react';
   
   const NewComponent = () => {
     // Component logic
     return (
       <div>Component JSX</div>
     );
   };
   
   export default NewComponent;
   ```

2. **Add Route** (`client/src/App.jsx`):
   ```jsx
   <Route path="/new-route" element={
     <ProtectedRoute>
       <NewComponent />
     </ProtectedRoute>
   } />
   ```

3. **Update Sidebar** (`client/src/components/Sidebar.jsx`):
   - Add navigation link if needed

4. **Style with Tailwind**:
   - Use existing color scheme (indigo for primary)
   - Follow responsive design patterns

### Database Schema Changes

1. **Update Model** (`server/models/*.model.js`):
   ```javascript
   newField: {
     type: String,
     required: [true, 'Error message'],
     trim: true,
   }
   ```

2. **Update EDITABLE_FIELDS/IMMUTABLE_FIELDS** if needed

3. **Update Controller** to handle new field

4. **Update Frontend Forms** to capture new data

5. **Test Migration** (MongoDB is schema-less, but validate existing data)

### Adding Middleware

1. **Create Middleware** (`server/middleware/custom.middleware.js`):
   ```javascript
   export const customMiddleware = (req, res, next) => {
     // Middleware logic
     next(); // Must call next() to continue
   };
   ```

2. **Apply to Routes**:
   ```javascript
   // Global: app.use(customMiddleware);
   // Route: router.get('/', customMiddleware, controller);
   ```

3. **Document in server.js** if global

---

## 🐛 Debugging Guide

### Backend Issues

**MongoDB Connection Failed:**
- Check if MongoDB is running: `sudo systemctl status mongod`
- Verify MONGO_URI in `server/.env`
- Check MongoDB logs: `sudo journalctl -u mongod`

**JWT Token Issues:**
- Verify JWT_SECRET matches in server/.env
- Check token in request header: `Authorization: Bearer <token>`
- Token expires in 30 days - may need to re-login
- Use browser DevTools → Application → Local Storage to inspect token

**API Endpoint Not Found:**
- Check route is registered in `server.js`
- Verify HTTP method matches (GET, POST, PUT, DELETE)
- Check for typos in route path
- Ensure middleware order is correct

**CORS Errors:**
- Verify `cors()` middleware is applied
- Check Vite proxy configuration in `client/vite.config.js`
- Backend must be running on port 5000

### Frontend Issues

**Component Not Rendering:**
- Check route is defined in `App.jsx`
- Verify component is exported properly
- Check browser console for React errors
- Use React DevTools to inspect component tree

**API Calls Failing:**
- Check Network tab in browser DevTools
- Verify backend server is running
- Check Axios interceptor isn't blocking request
- Verify endpoint URL is correct

**AuthContext Issues:**
- User is null after refresh → Check localStorage
- Login not persisting → Verify `login()` is called with complete user data
- Protected routes not working → Check `useAuth()` hook usage

**Tailwind Styles Not Applying:**
- Verify `index.css` imports Tailwind directives
- Check `tailwind.config.js` content paths
- Rebuild if styles changed: `npm run dev` (Vite handles HMR)

---

## 📝 Code Style & Standards

### JavaScript/JSX

**File Headers:**
```javascript
/**
 * @file filename.js
 * @description Purpose and functionality
 * @module ModuleName
 */
```

**Function Documentation:**
```javascript
/**
 * Function description
 * 
 * @async
 * @function functionName
 * @param {Type} paramName - Description
 * @returns {Type} Description
 * 
 * @example
 * functionName(param);
 */
```

**Naming Conventions:**
- Components: PascalCase (`UserProfile.jsx`)
- Functions: camelCase (`getUserProfile`)
- Constants: UPPER_SNAKE_CASE (`JWT_SECRET`)
- Files: kebab-case for configs (`vite.config.js`)

**Import Order:**
1. External libraries (react, express, etc.)
2. Internal modules (controllers, models)
3. Relative imports (./components)

**Async/Await:**
- Always use try-catch for async operations
- Handle errors gracefully
- Log errors with context

### React Patterns

**Hooks:**
- `useState` for local state
- `useEffect` for side effects
- `useContext` (via `useAuth()`) for global auth state
- `useNavigate` for programmatic navigation

**Conditional Rendering:**
```jsx
{loading && <Spinner />}
{error && <ErrorMessage />}
{data && <DataDisplay />}
```

**Event Handlers:**
- Prefix with `handle`: `handleSubmit`, `handleChange`
- Use arrow functions to preserve `this` context

**Styling:**
- Tailwind CSS utility classes
- Responsive: `sm:`, `md:`, `lg:` prefixes
- Colors: `indigo-600` (primary), `red-600` (errors)

### API Design

**RESTful Endpoints:**
- GET `/api/resource` - List all
- GET `/api/resource/:id` - Get one
- POST `/api/resource` - Create
- PUT `/api/resource/:id` - Update
- DELETE `/api/resource/:id` - Delete

**Response Format:**
```javascript
// Success
res.json({ 
  [data],
  message: 'Optional success message'
});

// Error
res.status(400).json({ 
  message: 'Error description',
  details: 'Additional info (dev only)'
});
```

**Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (no/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Server Error

---

## 🧪 Testing Guidelines

### Manual Testing Checklist

**Authentication:**
- [ ] Register new user with all fields
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (verify error)
- [ ] Access protected route without token (verify redirect)
- [ ] Logout and verify token cleared
- [ ] Refresh page while logged in (verify session persists)

**Profile Management:**
- [ ] View profile displays all fields
- [ ] Update editable fields successfully
- [ ] Attempt to update protected fields (verify blocked)
- [ ] Update password (verify re-hashing)

**Agent Management:**
- [ ] Create new agent
- [ ] View all agents
- [ ] View single agent with job stats
- [ ] Update agent information
- [ ] Delete agent

**Customer Management:**
- [ ] Create new customer with address
- [ ] Google Maps autocomplete works
- [ ] View all customers
- [ ] Update customer details
- [ ] Delete customer

**Service Calls:**
- [ ] View service calls list
- [ ] (Placeholder - needs implementation)

### API Testing with curl

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "businessName": "Test Business",
    "businessRegistrationNumber": "REG123",
    "taxNumber": "TAX123",
    "vatNumber": "VAT123",
    "phoneNumber": "+27123456789",
    "physicalAddress": "123 Test St"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

**Get Profile (with token):**
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Environment variables set for production
- [ ] JWT_SECRET changed to strong random value
- [ ] MongoDB Atlas connection string configured
- [ ] Google Maps API key has billing enabled
- [ ] Remove console.log statements (or use conditional logging)
- [ ] Update CORS settings for production domain
- [ ] Build client: `npm run build`
- [ ] Test production build locally

### Environment Setup

**Server:**
- [ ] `NODE_ENV=production`
- [ ] `MONGO_URI=mongodb+srv://...`
- [ ] `JWT_SECRET=<strong-random-string>`
- [ ] `PORT=5000` (or cloud provider's PORT)

**Client:**
- [ ] `VITE_API_URL=https://your-api-domain.com`
- [ ] `VITE_GOOGLE_MAPS_API_KEY=<production-key>`

### Post-Deployment

- [ ] Test all API endpoints
- [ ] Verify authentication flow
- [ ] Test Google Maps integration
- [ ] Monitor error logs
- [ ] Set up log rotation
- [ ] Configure SSL/HTTPS
- [ ] Set up database backups

---

## 📚 Additional Resources

### Documentation Files
- **README.md** - User-facing setup and API docs
- **PROJECT-STRUCTURE.md** - Detailed architectural breakdown
- **AUTH_GUIDE.md** - Authentication system deep-dive
- **LOGGING_GUIDE.md** - Logging best practices
- **FIELD_PERMISSIONS.md** - Field permission details
- **PROFILE_EDITING_GUIDE.md** - Profile editing rules

### External Documentation
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Mongoose Docs](https://mongoosejs.com/docs/guide.html)
- [React Router](https://reactrouter.com/en/main)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [JWT.io](https://jwt.io/)
- [Google Maps API](https://developers.google.com/maps/documentation)

### Git Repository
- **Remote**: https://github.com/Derikcoder/test-app
- **Branch**: main
- **Last Commit**: Initial commit with full-stack application

---

## 🔄 Recent Changes

### 2026-02-26
- ✅ Initialized git repository
- ✅ Pushed to GitHub (https://github.com/Derikcoder/test-app)
- ✅ Created automated setup script (setup-and-run.sh)
- ✅ Updated README.md with comprehensive documentation
- ✅ Added industry-standard comments throughout codebase
- ✅ Created AI_ASSISTANT_GUIDE.md (this file)

**Modified Files:**
- All server files (added JSDoc comments)
- All client files (added JSDoc comments)
- README.md (comprehensive rewrite)
- New: setup-and-run.sh
- New: AI_ASSISTANT_GUIDE.md

**Next Steps:**
- Implement full ServiceCalls.jsx component
- Add unit tests
- Set up CI/CD pipeline
- Add more comprehensive error handling

---

## 💡 Tips for AI Assistants

### When Suggesting Code Changes

1. **Always check existing patterns first**
   - Look at similar files for naming conventions
   - Follow existing code style (async/await, error handling)
   - Use same import structure

2. **Maintain documentation**
   - Add JSDoc comments to new functions
   - Update this file if architecture changes
   - Keep README.md in sync with features

3. **Security considerations**
   - Never log sensitive data (passwords, tokens)
   - Always validate user input
   - Use parameterized queries (Mongoose handles this)
   - Check field permissions before updates

4. **Error handling**
   - Wrap async operations in try-catch
   - Return appropriate HTTP status codes
   - Log errors with context
   - Show user-friendly error messages

5. **Testing mindset**
   - Consider edge cases
   - Validate required fields
   - Test with invalid data
   - Check authentication requirements

### Common User Requests & Solutions

**"Add a new field to User model"**
→ Update User.model.js, add to EDITABLE_FIELDS or IMMUTABLE_FIELDS, update controller validation, update frontend form

**"Why isn't my API call working?"**
→ Check: Backend running? Correct endpoint? JWT token included? CORS enabled? Check Network tab

**"How do I protect a route?"**
→ Backend: Add `protect` middleware. Frontend: Wrap in `<ProtectedRoute>`

**"Database connection failing"**
→ Check MongoDB running, verify MONGO_URI, check MongoDB logs

**"How do I add Google Maps to a component?"**
→ See Customers.jsx for example implementation with @react-google-maps/api

---

## 📊 Project Metrics

**Lines of Code:** ~3,000+ (with comments)  
**API Endpoints:** 20+  
**React Components:** 8  
**Database Models:** 4  
**Middleware:** 2  
**Test Coverage:** TBD (tests not yet implemented)

---

## 🎯 Known Issues & TODOs

### High Priority
- [ ] Implement full ServiceCalls.jsx component (currently placeholder)
- [ ] Add form validation library (Formik or React Hook Form)
- [ ] Implement actual token refresh mechanism
- [ ] Add unit tests (Jest + React Testing Library)

### Medium Priority
- [ ] Add pagination to list views
- [ ] Implement search/filter functionality
- [ ] Add data export features (CSV)
- [ ] Dashboard with statistics
- [ ] Email notifications for service calls

### Low Priority
- [ ] Dark mode support
- [ ] Mobile app (React Native)
- [ ] Real-time updates (Socket.io)
- [ ] Advanced reporting

---

## ⚙️ Assistant Configuration

### Preferred Responses

**When user asks for help:**
1. Check this guide first
2. Provide specific file references
3. Include code examples
4. Explain why, not just what

**When suggesting changes:**
1. Show before/after code
2. Explain implications
3. Note any documentation updates needed
4. Consider security/performance

**When debugging:**
1. Ask clarifying questions
2. Request error messages/logs
3. Suggest systematic troubleshooting
4. Provide multiple solutions if possible

---

## 📞 Support & Contact

**Developer:** Derick van Zyl  
**Email:** drckvanzyl@gmail.com  
**GitHub:** https://github.com/Derikcoder/test-app  
**Issues:** https://github.com/Derikcoder/test-app/issues

---

**Remember:** Before closing the editor, prompt user to update this file and other documentation to reflect any changes made during the session. This keeps the project maintainable and helps future developers (human and AI) understand the system.

---

*This guide is living documentation. Update it whenever significant changes are made to the project.*
