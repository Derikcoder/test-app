# Project Structure

This document provides a structured, enterprise-grade overview of the codebase. It is intended to help engineers, QA, and ops teams quickly understand where key responsibilities live and how the system is organized.

## Root
- AUTH_GUIDE.md: Authentication usage and API expectations.
- FIELD_PERMISSIONS.md: Field-level permissions and immutable fields policy.
- LOGGING_GUIDE.md: Logging policy and usage guidelines.
- PROFILE_EDITING_GUIDE.md: Profile editing rules and examples.
- PROJECT-STRUCTURE.md: This document.
- install-mongodb.sh: MongoDB install helper script.
- package.json: Root scripts that orchestrate client/server workflows.
- client/: React + Vite frontend application.
- server/: Express + MongoDB backend API.

## Client Application (client/)
- index.html: Vite HTML entry. Contains the debug script tag used by the React devtools debugger.
- vite.config.js: Vite configuration, dev server and API proxy settings.
- tailwind.config.js, postcss.config.js: Styling pipeline configuration.
- .env: Frontend runtime configuration (VITE_ prefixed variables).
- src/: Application source code.

### Client Source (client/src/)
- main.jsx: React bootstrap and root render.
- App.jsx: Router and protected route configuration.
- index.css: Global styles and Tailwind base layers.
- api/axios.js: Axios instance and API base config.
- context/AuthContext.jsx: Auth state, JWT handling, profile updates.
- components/: Page-level screens and shared UI components.

### Client Components (client/src/components/)
- Sidebar.jsx: Slide-in navigation and primary app shell menu.
- Login.jsx, Register.jsx: Authentication UI.
- UserProfile.jsx: Profile display and edits with protected field logic.
- FieldServiceAgents.jsx: Agent CRUD screen.
- AgentProfile.jsx: Agent detail and job statistics view.
- Customers.jsx: Customer intake and service request form (including maps).
- ServiceCalls.jsx: Service calls screen placeholder.
- UserProfile_old.jsx, UserProfile_backup2.jsx: Local backups.

## Server Application (server/)
- server.js: Express bootstrap, middleware registration, routes, and API wiring.
- .env, .env.example: Backend environment configuration.
- config/db.js: MongoDB connection and initialization.
- logs/, server.log: Runtime logs and output.
- middleware/: Authentication and request logging.
- models/: Mongoose schemas and field protection rules.
- controllers/: API request handlers and validation logic.
- routes/: Express route definitions.

### Server Models (server/models/)
- User.model.js: User schema, immutable/editable field lists.
- FieldServiceAgent.model.js: Field agent schema and metadata.
- Customer.model.js: Customer schema and contact information.
- ServiceCall.model.js: Service call schema, statuses, and priority.
- Example.model.js: Example entity schema.

### Server Controllers (server/controllers/)
- auth.controller.js: Login, registration, and profile update logic.
- agent.controller.js: Field service agent CRUD.
- customer.controller.js: Customer CRUD.
- serviceCall.controller.js: Service call CRUD, status flow.

### Server Routes (server/routes/)
- auth.routes.js: Authentication endpoints.
- agent.routes.js: Agent endpoints.
- customer.routes.js: Customer endpoints.
- serviceCall.routes.js: Service call endpoints.
- example.routes.js: Example endpoints.

### Server Middleware (server/middleware/)
- auth.middleware.js: JWT verification and request protection.
- logger.middleware.js: Request and error logging helpers.

## Runtime Architecture
- Frontend (Vite) runs on port 3000 and proxies API calls to the backend.
- Backend (Express) runs on port 5000 and connects to MongoDB.
- MongoDB runs locally (default port 27017).

## Configuration and Environment
- Client environment variables must start with VITE_.
- Backend environment variables are read from server/.env.
- The client map picker relies on VITE_GOOGLE_MAPS_API_KEY.

## Data and Control Flow Overview
- UI events -> component state -> API calls via api/axios.js.
- API calls -> Express routes -> controllers -> Mongoose models.
- Authenticated routes require JWT via auth.middleware.js.
- Field-level protection enforced in controllers and model statics.

## Notes
- Some screens contain placeholders for future implementation (ServiceCalls.jsx).
- Backup files are present in components for reference and recovery.
