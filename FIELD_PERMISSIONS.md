# Field Permissions Guide

## Overview
The user profile system has field-level permissions that protect critical information while allowing updates to operational data.

## Protected Fields (CANNOT be updated)
These fields are **immutable** through normal profile updates:

| Field | Description | Reason |
|-------|-------------|--------|
| `userName` | User's login name | Identity field - cannot be changed |
| `role` | Principal role | Controlled via admin workflows |
| `fieldServiceAgentProfile` | Linked field agent profile | Managed by admin link endpoints |
| `customerProfile` | Linked customer profile | Managed by admin link endpoints |
| `createdAt` | Account creation date | Historical record - automatic |
| `_id` | User ID | System identifier |
| `isSuperUser` | Super user status | Security protection |

## Editable Fields (CAN be updated)
These fields can be modified by the user, subject to policy checks:

| Field | Description | Example |
|-------|-------------|---------|
| `email` | Contact email address | `newemail@example.com` |
| `password` | Account password | Requires min 6 characters |
| `businessName` | Registered business name display | `My Updated Business Name` |
| `taxNumber` | Tax identification number | `TAX-123456` |
| `vatNumber` | VAT registration number | `VAT-789012` |
| `businessRegistrationNumber` | Official registration number | `REG-123456` |
| `phoneNumber` | Business phone number | `+27-123-456-7890` |
| `physicalAddress` | Business physical address | `456 New Street, City` |
| `websiteAddress` | Business website URL | `https://example.com` |
| `isActive` | Account active status | `true` / `false` |

## Write-Once Registration Identifier Policy

`businessRegistrationNumber`, `taxNumber`, and `vatNumber` are write-once for non-superAdmin users:

- If current value is empty, user can save initial value.
- Once set, non-superAdmin updates are blocked with `403`.
- SuperAdmin can override existing values only with valid legal evidence.

Required superAdmin legal evidence payload (`registrationChangeEvidence`):
- `legalDocumentType`
- `legalDocumentReference`
- `legalDocumentUri` (must be http/https URL)
- `legalChangeReason` (minimum 15 characters)

## API Endpoints

### Get Field Permissions
```bash
GET /api/auth/field-permissions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "editable": ["email", "password", "businessName", "businessRegistrationNumber", "taxNumber", "vatNumber", "phoneNumber", "physicalAddress", "websiteAddress", "isActive"],
  "protected": ["userName", "createdAt", "_id", "isSuperUser", "role", "fieldServiceAgentProfile", "customerProfile"],
  "info": {
    "editable": "These fields can be updated by the user",
    "protected": "These fields are immutable and cannot be changed after account creation"
  }
}
```

### Update User Profile
```bash
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "+27-123-456-7890",
  "taxNumber": "TAX-NEW-999",
  "websiteAddress": "https://newdomain.com"
}
```

**Success Response (200):**
```json
{
  "_id": "...",
  "userName": "johndoe",
  "email": "john@example.com",
  "phoneNumber": "+27-123-456-7890",
  "taxNumber": "TAX-NEW-999",
  "websiteAddress": "https://newdomain.com",
  "message": "Profile updated successfully",
  "token": "..."
}
```

**Error Response - Protected Field (403):**
```json
{
  "message": "Cannot update protected fields",
  "protectedFields": ["businessName"],
  "info": "Only superAdmin can update registration identifiers after initial capture"
}
```

## Example Usage

### ✅ ALLOWED - Update editable fields:
```javascript
await fetch('/api/auth/profile', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phoneNumber: '+27-987-654-3210',
    email: 'newemail@company.com',
    websiteAddress: 'https://mycompany.co.za'
  })
});
```

### ❌ BLOCKED - Attempt to update protected field:
```javascript
await fetch('/api/auth/profile', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userName: 'new-username',            // ❌ This will be rejected
    phoneNumber: '+27-987-654-3210'     // ✅ This would work alone
  })
});
// Returns 403 error: "Cannot update protected fields"
```

## Testing

### Test 1: View Permissions
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/auth/field-permissions
```

### Test 2: Update Allowed Fields
```bash
curl -X PUT http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+27-123-456-7890", "taxNumber": "TAX-999"}'
```

### Test 3: Test Protection (Should Fail)
```bash
curl -X PUT http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"businessName": "Hacked Name"}'
```
Expected: `403 Forbidden` with message about protected fields

## Implementation Details

### Model Level (server/models/User.model.js)
- Core protected fields enforced via `IMMUTABLE_FIELDS`
- Static arrays define `EDITABLE_FIELDS` and `IMMUTABLE_FIELDS`

### Controller Level (server/controllers/auth.controller.js)
- `updateUserProfile` validates attempted changes
- Blocks updates if immutable fields are modified
- Enforces write-once registration identifiers for non-superAdmin
- Requires legal evidence for superAdmin registration identifier overrides
- Logs all attempts for security audit
- Returns detailed error messages

### Security Benefits
1. **Data Integrity**: Legal and identity information cannot be tampered
2. **Audit Trail**: All update attempts are logged
3. **Clear Errors**: Users get informative feedback
4. **Flexibility**: Operational data can be updated as needed
