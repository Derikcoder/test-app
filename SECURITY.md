# 🔒 Security Guide

## Security Audit Summary - February 26, 2026

This document outlines the security analysis and remediation steps taken on this project.

---

## ⚠️ Critical Issue - RESOLVED

### Exposed Google Maps API Key

**Date Discovered:** February 26, 2026
**Status:** ✅ RESOLVED

#### What Happened:
- A real Google Maps API key was accidentally hardcoded in `install-mongodb.sh`
- **Key:** (redacted)
- The file was tracked in git and pushed to the public GitHub repository
- The key was exposed in the following commits

#### Actions Taken:
1. ✅ Removed the API key from `install-mongodb.sh` in working directory
2. ✅ Cleaned all commits in git history using `git filter-branch`
3. ✅ Force-pushed cleaned history to GitHub
4. ✅ Created this security documentation
5. 🚨 **URGENT:** The API key must be disabled immediately

#### Required Action - YOU MUST DO THIS:
⚠️ **DISABLE THE COMPROMISED API KEY IMMEDIATELY**

The compromised API key must be revoked:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Find your project
3. Navigate to **Credentials**
4. Find the compromised API key
5. Click **Delete** to revoke it
6. Create a NEW Google Maps API key
7. Update `client/.env` with the new key (local only):
   ```
   VITE_GOOGLE_MAPS_API_KEY=your-new-api-key-here
   ```
8. Restrict the new key by HTTP referrer and API scope (Maps JavaScript API, Places API)

**Timeline:**
- This key was used in the initial project setup
- It was exposed on GitHub (public repository)
- Anyone with access to the git history could see this key
- The key remained valid until manually disabled in Google Cloud Console

---

## ✅ Security Status - All Clear

### Environment Files
- ✅ `.env` files are in `.gitignore`
- ✅ `.env.local` files are in `.gitignore`
- ✅ No `.env` files are tracked in git
- ✅ Only `.env.example` is tracked (as reference)
- ✅ Local TLS certificate/key artifacts are ignored; only docs and metadata under `certs/` are tracked

### Hardcoded Secrets
- ✅ No hardcoded passwords in source code
- ✅ No hardcoded JWT secrets in source code
- ✅ No database credentials in code
- ✅ All examples use placeholder values

### MongoDB Connection
- ✅ Connection string is in `.env` (not in git)
- ✅ Local development uses `mongodb://localhost:27017`
- ✅ Production setup uses environment variables

### JWT Authentication
- ✅ JWT secret is in `.env` only
- ✅ Secret is generated fresh during setup
- ✅ Secret should be changed for each environment

### Local TLS Certificate Handling
- ✅ Certificate file paths are configured through environment variables
- ✅ Raw `.pem`, `.key`, `.p12`, and `.pfx` files are not committed
- ✅ Repository tracks only certificate documentation and inventory metadata

### Authentication & Authorization
- ✅ Passwords are hashed with bcrypt (minimum 10 rounds)
- ✅ JWT tokens expire (check `auth.controller.js` for duration)
- ✅ Protected routes use middleware authentication
- ✅ Field-level permissions are enforced

---

## 🛡️ Security Best Practices for This Project

## Development Rule: Secret Material And Local TLS Assets

The following rule applies to all contributors and all branches in this repository.

### Rule

1. Secrets must be supplied through environment files, CI/CD secret injection, or a dedicated secret manager.
2. Raw local TLS assets, including `.pem`, `.key`, `.crt`, `.p12`, and `.pfx` files, are treated as secret material.
3. Raw secret material must never be committed to git, even when used only for local development.
4. Only the following may be tracked in git:
   - Environment variable names
   - Placeholder/example values
   - File-path references to local secret material
   - Documentation and handling instructions
   - Certificate inventory metadata that does not expose private contents
5. For local HTTPS development, the repository stores only references such as `SSL_CERT_FILE`, `SSL_KEY_FILE`, `VITE_SSL_CERT_FILE`, and `VITE_SSL_KEY_FILE`; the referenced files stay local.

### Rationale

- Private keys and certificate bundles are reusable trust artifacts. Once committed, they can be copied and reused outside the intended machine or environment.
- Keeping only env-configured references in git reduces exposure risk while preserving a repeatable setup process.
- The same rule keeps local development aligned with production secret-handling discipline.

### 1. Environment Variables
**✅ CORRECT:**
```bash
# In .env (never commit this!)
JWT_SECRET=your-secret-key-here
MONGODB_URI=mongodb://localhost:27017/test-app
SSL_CERT_FILE=../certs/localhost+1.pem
SSL_KEY_FILE=../certs/localhost+1-key.pem
VITE_GOOGLE_MAPS_API_KEY=your-api-key-here
VITE_SSL_CERT_FILE=../certs/localhost+1.pem
VITE_SSL_KEY_FILE=../certs/localhost+1-key.pem
```

**❌ WRONG:**
```javascript
// In source code (NEVER DO THIS!)
const secret = 'my-hardcoded-secret';
const apiKey = 'AIzaSy...';
```

Development rule implementation:
- Environment variables may store secret values directly or file paths to local secret material.
- For local HTTPS, the env files store only the certificate paths; the certificate contents remain local and untracked.
- `.env.example` may document expected variable names and placeholder paths, but it must never contain live secrets or private key contents.

### 2. Git Workflow
```bash
# Before committing:
git status  # Check for .env files
cat .gitignore  # Verify secrets are ignored

# After committing:
git log -p <file>  # Verify no secrets in history
```

Why this matters:
- Private keys and local certificates are reusable trust material. If committed, they can be copied, misused, or mistaken for production-safe assets.
- Keeping only env-configured paths in git separates reusable documentation from machine-specific secrets.

### 3. API Keys Management
- [ ] Use `.env` files for local development
- [ ] Use environment variables in production
- [ ] Rotate API keys regularly
- [ ] Monitor API key usage in provider dashboard
- [ ] Create service-specific API keys (don't reuse)
- [ ] Disable unused API keys immediately

### 4. Database Security
- [ ] Use strong MongoDB passwords (25+ characters)
- [ ] Enable MongoDB Atlas IP whitelist
- [ ] Use TLS/SSL connections (production)
- [ ] Enable MongoDB authentication
- [ ] Rotate credentials periodically

### 5. JWT Security
```javascript
// Example from auth.controller.js:
const token = jwt.sign(
  { userId: user._id },
  process.env.JWT_SECRET,  // ✅ From environment
  { expiresIn: '24h' }      // ✅ Set expiration
);
```

**Best Practices:**
- Use strong secrets (50+ random characters)
- Set reasonable expiration times
- Refresh tokens using separate endpoint
- Store tokens in httpOnly cookies (frontend config)
- Never log tokens or secrets

### 6. Code Review Checklist
Before committing code, verify:
- [ ] No hardcoded API keys
- [ ] No hardcoded passwords
- [ ] No hardcoded JWT secrets
- [ ] No database credentials in code
- [ ] No sensitive data in comments
- [ ] All secrets are in `.env`
- [ ] `.env` is in `.gitignore`
- [ ] Local certificate/key files are not staged
- [ ] Only certificate docs, metadata, and example paths are tracked

### 7. Deployment Security
```bash
# Set environment variables before deployment:

# Heroku
heroku config:set JWT_SECRET="<strong-random-token>"
heroku config:set MONGODB_URI="mongodb+srv://..."
heroku config:set VITE_GOOGLE_MAPS_API_KEY="<new-key>"

# AWS / Azure / DigitalOcean
# Use respective secret management service
```

### 8. Monitoring & Alerts
- [ ] Set up git hooks to prevent secret commits:
  ```bash
  # Install git-secrets: https://github.com/awslabs/git-secrets
  # Prevents accidental commits of credentials
  ```
- [ ] Monitor API key usage in provider dashboards
- [ ] Set up rate limiting on API endpoints
- [ ] Enable logging for all authentication events
- [ ] Review logs regularly for suspicious activity

---

## 📋 Security Checklist for Development

Before pushing code:
```bash
# 1. Check for secrets in staged files
git diff --cached | grep -E "password|secret|key|token"

# 2. Verify .env is not tracked
git ls-files | grep "\.env"
# Should only show .env.example (if at all)

# 3. Check commit message doesn't reference secrets
git log -1 --oneline

# 4. Verify .gitignore has proper entries
grep -E "\.env|\.key|secret" .gitignore

# 5. Before force push, ensure no history contains secrets
git log -S "AIzaSy" --all  # Search for API key pattern

# 6. Verify local TLS files are not tracked
git ls-files certs
```

---

## 🚨 If You Accidentally Commit a Secret:

**IMMEDIATE ACTIONS:**
1. **Revoke the secret immediately** (if it's an API key, password, etc.)
2. **Remove from git history:**
   ```bash
   # Create a fresh .env with new secrets
   # Then rewrite history:
   FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f \
     --tree-filter 'sed -i "s/old-secret/redacted/g" .env' HEAD
   
   # Force push
   git push -f origin main
   ```
3. **Notify team members** to fetch the updated history
4. **Update any dependent services** with new credentials

---

## 📚 Security Resources

### Tools & Services
- [**git-secrets**](https://github.com/awslabs/git-secrets) - Prevent secret commits
- [**npm audit**](https://docs.npmjs.com/cli/v6/commands/npm-audit) - Check dependencies for vulnerabilities
- [**Snyk**](https://snyk.io) - Continuous vulnerability scanning
- [**OWASP**](https://owasp.org) - Web security best practices
- [**Have I Been Pwned**](https://haveibeenpwned.com) - Check compromised credentials

### Dependency Security
```bash
# Check for vulnerabilities in dependencies
npm audit

# Update vulnerable packages
npm update

# Verify no malicious packages
npm ls
```

### MongoDB Security
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/security/security-checklist/)
- [Enable Authentication](https://docs.mongodb.com/manual/security/authentication/)
- [IP Whitelist in Atlas](https://docs.mongodb.com/manual/reference/security/)

---

## 📞 Incident Response

### If a secret is leaked:

1. **Immediate (within minutes):**
   - Disable the credential in the provider dashboard
   - Create a new credential
   - Update all places using the old credential

2. **Short-term (within hours):**
   - Clean git history (as done in this incident)
   - Force push updated history
   - Review git logs for other exposed data
   - Notify relevant team members

3. **Medium-term (within days):**
   - Implement git-secrets pre-commit hook
   - Update security documentation
   - Review access logs on services using the credential
   - Update incident response plan

4. **Long-term:**
   - Implement automated secret scanning
   - Rotate all secrets periodically
   - Implement secret management service
   - Conduct security training for team

---

## 🔄 Recent Changes

**Date:** February 26, 2026

### Issues Fixed:
- ❌ Removed exposed Google Maps API key from `install-mongodb.sh`
- ❌ Cleaned git history to remove API key from all commits
- ❌ Force-pushed cleaned history to GitHub
- ✅ Generated a new Google Maps API key (stored locally in client/.env)
- ✅ Updated documentation to emphasize client-side key exposure

### Files Updated:
- `install-mongodb.sh` - Replaced hardcoded key with placeholder
- `SECURITY.md` - Created this security guide

### Verification Done:
- ✅ Confirmed `.env` files are not tracked in git
- ✅ Confirmed no other hardcoded secrets in codebase
- ✅ Confirmed API key removed from git history
- ✅ Confirmed proper `.gitignore` configuration

### Next Steps for User:
1. **Confirm** the compromised API key is disabled in Google Cloud Console
2. **Restrict** the new API key by HTTP referrer and API scope
3. **Keep** `client/.env` local and never commit it
4. **Consider** implementing git-secrets to prevent future incidents

---

## ✨ Current Security Status

| Component | Status | Notes |
|-----------|--------|-------|
| Environment Variables | ✅ Secure | Properly ignored by git |
| Source Code Secrets | ✅ Secure | No hardcoded credentials |
| Git History | ✅ Cleaned | API key removed from all commits |
| Database | ✅ Secure | Uses environment variables |
| Authentication | ✅ Secure | JWT + bcrypt passwords |
| API Keys | ✅ Updated | New key generated; restrict by referrer and API scope |

---

## Questions or Concerns?

If you discover a security issue:
1. Do not commit it
2. Do not push it to GitHub
3. Create a local commit with "security:" prefix
4. Use `git filter-branch` to clean history before pushing
5. Force push with `git push -f origin main`

---

**Last Updated:** February 26, 2026  
**Next Review:** 90 days (or after any security incident)
