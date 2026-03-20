# Profile Editing Feature - User Guide

## Overview
The profile page supports role-aware editing with immutable and write-once policy enforcement, including legal-evidence override support for superAdmin users.

## Accessing the Profile Editor

1. **Navigate to**: http://localhost:3000/profile
2. **Click**: "Edit Profile" button in the top-right corner
3. **Edit**: Update any of the editable fields
4. **Save**: Click "Save Changes" to persist your updates

## What You Can Edit ✏️

### ✅ Editable Fields (Can be Changed)

| Field | Description | Notes |
|-------|-------------|-------|
| **Email** | Contact email address | Must be valid email format |
| **Phone Number** | Business phone number | Any format accepted |
| **Business Name** | Business display/legal name | Editable by user |
| **Registration Number** | Official registration number | Write-once for non-superAdmin |
| **Tax Number** | Tax identification number | Write-once for non-superAdmin |
| **VAT Number** | VAT registration number | Write-once for non-superAdmin |
| **Physical Address** | Business address | Multiline text field |
| **Website** | Business website URL | Optional - must start with http/https |
| **Password** | Account password | Optional - min 6 characters |

### 🔒 Protected Fields (Cannot be Changed)

These fields are **permanently locked** in profile updates:

- **Username** - Login identifier
- **Created Date** - Account creation timestamp

## Features

### Visual Indicators
- **Green badges** (✏️ Editable) - Fields you can modify
- **Gray badges** (🔒 Protected) - Fields that are locked
- Protected fields are shown with disabled styling (gray background)

### Password Change
- Optional - leave blank to keep current password
- Must enter both "New Password" and "Confirm Password" if changing
- Minimum 6 characters required
- Passwords must match

### Validation & Feedback
- **Success Message**: Green banner appears when profile is updated
- **Error Messages**: Red banner shows if validation fails
- **Real-time validation**: Form validates before submission
- **Loading State**: "Saving..." indicator during API call

### Safety Features
- **Cancel Button**: Reverts all changes without saving
- **Protected Field Detection**: Backend blocks attempts to modify locked fields
- **Auto-dismiss**: Success messages disappear after 5 seconds

## Step-by-Step Guide

### To Update Contact Information:

1. Click **"Edit Profile"** button
2. Update fields like:
   - Email (must be valid format)
   - Phone number
   - Physical address
3. Click **"Save Changes"**
4. See success confirmation
5. Changes are immediately reflected

### To Change Password:

1. Click **"Edit Profile"**
2. Scroll to "Change Password" section (yellow box)
3. Enter **New Password** (min 6 chars)
4. Enter **Confirm Password** (must match)
5. Click **"Save Changes"**
6. Password is updated - use it for next login

### To Capture Registration Identifiers (First-Time):

1. Click **"Edit Profile"**
2. Find the registration/tax section
3. Enter empty values for:
   - Registration Number
   - Tax Number
   - VAT Number
4. Click **"Save Changes"**

Once saved, these fields become locked for non-superAdmin users.

### SuperAdmin Legal Override Flow:

When a superAdmin changes an already populated registration/tax/VAT value:

1. Provide legal evidence fields in the same form:
   - Legal Document Type
   - Legal Document Reference
   - Legal Document URL
   - Legal Change Reason
2. Submit profile update
3. Backend validates legal evidence and records immutable legal override audit entry

## Error Handling

### Common Errors:

**"Passwords do not match"**
- Solution: Ensure both password fields contain the same value

**"Password must be at least 6 characters"**
- Solution: Use a longer password

**"Cannot update protected fields"**
- You attempted to modify immutable identity/system fields

**"Registration identifiers cannot be edited after they are first saved"**
- Non-superAdmin attempted to change existing registration/tax/VAT values

**"Valid legal documentation is required to update existing registration identifiers"**
- SuperAdmin attempted override without complete legal evidence payload

**"Failed to update profile"**
- Check your internet connection
- Ensure you're logged in (token valid)
- Try logging out and back in

## Technical Details

### Frontend Components
- **UserProfile.jsx** - Main profile component with edit mode
- **AuthContext.jsx** - Manages user state and updates
- **api/axios.js** - HTTP client for API calls

### API Endpoints Used
- `PUT /api/auth/profile` - Updates user profile
- `GET /api/auth/field-permissions` - Returns field permissions

### State Management
- User data stored in React Context
- Synced with localStorage for persistence
- Auto-updates across all components
- New JWT token returned on update

## Security

### What's Protected:
✅ Protected fields cannot be changed via UI or API
✅ JWT authentication required for all updates
✅ Password hashing on server side
✅ Input validation on both frontend and backend
✅ Audit logging of all update attempts

### Best Practices:
- Always use strong passwords (6+ characters minimum)
- Keep your email up to date for account recovery
- Verify changes after saving
- Log out on shared devices

## Testing the Feature

### Quick Test:
1. Go to http://localhost:3000/profile
2. Click "Edit Profile"
3. Change your phone number to "+27-999-888-7777"
4. Click "Save Changes"
5. Verify the change appears immediately
6. Refresh the page - change should persist

### Password Test:
1. Click "Edit Profile"
2. Enter new password (min 6 chars)
3. Confirm password
4. Save changes
5. Log out
6. Log back in with new password

## Troubleshooting

**Edit button doesn't appear:**
- Ensure you're logged in
- Check that you're on the profile page

**Changes don't save:**
- Check browser console for errors
- Verify server is running (localhost:5000)
- Check your authentication token hasn't expired

**Profile doesn't update in localStorage:**
- Clear browser cache
- Log out and log back in
- Check browser's Application > Local Storage

## Next Steps

After successfully updating your profile, you can:
- View updated information in read-only mode
- Make additional edits anytime by clicking "Edit Profile"
- Log out knowing your changes are saved
- All changes sync across browser sessions

---

**Support**: If you encounter issues, check the browser console (F12) for detailed error messages.
