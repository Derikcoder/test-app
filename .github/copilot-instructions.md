# Jestering Test Principles

## #Jestering Quick Reference Card

```markdown
┌─────────────────────────────────────────┐
│           #JESTERING CHEAT SHEET        │
├─────────────────────────────────────────┤
│ GIVEN  → Setup mocks and data          │
│ WHEN   → Execute the action            │
│ THEN   → Verify behavior               │
├─────────────────────────────────────────┤
│ ✅ MOCK: DB, API, email, files         │
│ ❌ DON'T MOCK: logic, validators       │
├─────────────────────────────────────────┤
│ createMock[Entity]() → factory         │
│ jest.clearAllMocks() → beforeEach      │
│ mockResolvedValue() → async mocks      │
├─────────────────────────────────────────┤
│ "customer approves pro-forma" ✅       │
│ "should approve" ❌                    │
└─────────────────────────────────────────┘
```

## Jestering Principles
- GIVEN/WHEN/THEN structure for every test
- Use reusable mock factories for all entities and Express objects
- Mocks only at system boundaries (DB, API, email, files)
- Descriptive, action-focused test names
- Explicit anti-pattern checklist (over-mocking, testing implementation details, shared state, magic strings)
- Factories ensure consistency, realism, and maintainability
- See TESTING_GUIDE.md for full details and examples
# GitHub Copilot Instructions

## AI Assistant Protocol

This file provides instructions for GitHub Copilot and other AI code assistants working on this project.

### 📖 Read First

**Before providing any code suggestions or making changes:**

1. Read [AI_ASSISTANT_GUIDE.md](../AI_ASSISTANT_GUIDE.md) - Comprehensive project briefing
2. Review [README.md](../README.md) - User-facing documentation
3. Check [PROJECT-STRUCTURE.md](../PROJECT-STRUCTURE.md) - Architecture details

These files contain critical context about:
- Project architecture and design decisions (Architecture overview, tech stack, file organization)
- Coding conventions and patterns (JSDoc, naming, async/await, React hooks)
- Security considerations (field-level permissions, JWT tokens, password hashing)
- Password reset system (new feature: email, tokens, recovery flow)
- Common pitfalls and solutions
- Development workflow and testing practices

### 🚨 Pre-Exit Protocol

**CRITICAL: When user indicates they want to close/quit the editor, you MUST:**

```
⚠️ WAIT! Before closing the editor, I need to check something.

Have any of these been modified in this session?
[ ] API endpoints or routes
[ ] Database models or schemas
[ ] Authentication logic
[ ] React components (added/removed)
[ ] Environment variables
[ ] Package dependencies

If YES to any, I should update the documentation:
- AI_ASSISTANT_GUIDE.md (Recent Changes section)
- PROJECT-STRUCTURE.md (if structure changed)
- README.md (if user-facing features changed)

May I update the documentation before you close? [Yes/No]
```

**If user confirms YES:**
1. Update `AI_ASSISTANT_GUIDE.md` → "Recent Changes" section with:
   - Date
   - List of files modified
   - Brief description of changes
   - Any new dependencies or configuration

2. Update `PROJECT-STRUCTURE.md` if:
   - New files/folders created
   - Files moved or renamed
   - Architecture significantly changed

3. Update `README.md` if:
   - New API endpoints added
   - Setup process changed
   - New features user-facing
   - Environment variables changed

### 📝 Code Suggestions Guidelines

**When suggesting code:**

1. **Match Existing Patterns**
   - Check similar files first
   - Use same import order
   - Follow naming conventions (see AI_ASSISTANT_GUIDE.md)
   - Copy JSDoc comment style

2. **Security First**
   - Never log passwords or JWT tokens
   - Always validate user input
   - Check field-level permissions before updates
   - Use `protect` middleware for private routes

3. **Documentation Required**
   - Add JSDoc comments to all new functions
   - Include @param, @returns, @description
   - Add inline comments for complex logic
   - Update relevant .md files if needed

4. **Error Handling**
   - Wrap async operations in try-catch
   - Return appropriate HTTP status codes (see guide)
   - Log errors with context using logger middleware
   - Show user-friendly error messages

5. **Testing Mindset**
   - Consider edge cases
   - Validate required fields
   - Test with invalid data
   - Verify authentication checks

### 🎯 Common Scenarios

**User: "Add a new API endpoint"**
→ Check: Similar endpoints in routes/, follow RESTful naming, add JSDoc, require auth if needed, update README.md

**User: "Create a new React component"**
→ Check: Similar components/, follow naming (PascalCase), add JSDoc, use Tailwind, add to routes if needed

**User: "Fix this error"**
→ Check: Error logs in server/logs/, Network tab if frontend, verify MongoDB running, check auth token

**User: "Why isn't this working?"**
→ Ask: Error message? Console logs? Network tab? Which part? Then reference guide

### 🏗️ Architecture Awareness

**Backend (Express + MongoDB):**
- Models define schema + field permissions
- Controllers handle business logic
- Routes define endpoints + apply middleware
- Middleware runs before controllers (order matters)

**Frontend (React + Vite):**
- AuthContext provides global auth state
- ProtectedRoute wraps authenticated pages
- Axios instance configured in api/axios.js
- Vite proxies /api/* to backend

**Key Relationships:**
- User creates Agents, Customers, ServiceCalls
- ServiceCalls reference Customer and Agent
- All models have createdBy → User

### 🔒 Field-Level Permissions

**CRITICAL CONCEPT:**

Some fields cannot be modified after creation:
- User: userName, businessName, businessRegistrationNumber
- Agent: firstName, lastName, employeeId
- Customer: businessName, customerId
- ServiceCall: callNumber

Controllers check against `Model.IMMUTABLE_FIELDS` before updates.

**Why:** Protects legal identifiers, prevents fraud, maintains audit trail.

### 🚀 Quick Commands

```bash
# Start everything
./setup-and-run.sh

# Start backend only
cd server && npm run dev

# Start frontend only
cd client && npm run dev

# Check MongoDB
sudo systemctl status mongod

# View logs
tail -f server/logs/error.log
tail -f server/logs/request.log
```

### 📚 Reference Files

| File | Purpose |
|------|---------|
| AI_ASSISTANT_GUIDE.md | **Primary briefing - READ THIS FIRST** |
| README.md | User setup guide + API docs |
| PROJECT-STRUCTURE.md | Detailed architecture |
| AUTH_GUIDE.md | Authentication deep-dive |
| LOGGING_GUIDE.md | Logging best practices |

### ⚡ Before Suggesting Code

**Quick Checklist:**
- [ ] Read relevant guide section?
- [ ] Checked similar existing code?
- [ ] Considered security implications?
- [ ] Planned error handling?
- [ ] Will add comments/JSDoc?
- [ ] Know which docs to update?

### 🤝 Working with Developer

**Good Practices:**
- Explain why, not just what
- Reference specific files/lines
- Provide multiple solution options
- Note trade-offs and implications
- Ask clarifying questions
- Confirm understanding before large changes

**Avoid:**
- Suggesting changes without understanding context
- Ignoring existing patterns
- Making breaking changes without warning
- Forgetting to update documentation
- Assuming user has expertise in all areas

---

**Remember:** This project has comprehensive inline comments in all files. Read the actual code when unsure about patterns or conventions.

**Last Updated:** 2026-02-26
