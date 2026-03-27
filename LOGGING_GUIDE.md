# Error Logging and Debugging Guide

## Error Logging System Enabled

Your application has comprehensive error logging to help debug issues.

## Log Files Location

All logs are stored in `server/logs/`.

### Log Files

- `error.log` - All errors and exceptions
- `request.log` - All HTTP requests and general info

## How to View Logs

### View Error Log (Real-time)

```bash
# From project root
tail -f server/logs/error.log

# Or watch for changes
watch -n 1 cat server/logs/error.log
```

### View Request Log (Real-time)

```bash
# From project root
tail -f server/logs/request.log

# Last 50 lines
tail -50 server/logs/request.log
```

### View All Errors

```bash
cat server/logs/error.log
```

### Clear Logs

```bash
# Clear error log
> server/logs/error.log

# Clear request log
> server/logs/request.log

# Or delete all logs
rm server/logs/*.log
```

## What Gets Logged

### Errors Logged

- All server exceptions with stack traces
- Database connection errors
- Registration failures such as missing fields or duplicate users
- Login failures such as invalid credentials
- `404` route-not-found errors
- Validation errors
- MongoDB errors

### Requests Logged

- All HTTP requests with method, URL, IP, and timestamp
- Server startup info
- Successful registrations
- Successful logins
- General application events

## Common Issues and How to Debug

### Registration Failing

1. Check the error log:

   ```bash
   cat server/logs/error.log
   ```

1. Look for:
   - MongoDB connection errors
   - Missing required fields
   - Duplicate email or username
   - Validation errors

1. Check the request log for registration attempts:

   ```bash
   grep "Registration" server/logs/request.log
   ```

### Login Failing

```bash
# Check for login errors
grep "Login" server/logs/error.log

# Check login attempts
grep "Login" server/logs/request.log
```

### MongoDB Not Connected

```bash
# Check logs for MongoDB connection messages
grep -i "mongo" server/logs/error.log
grep -i "mongo" server/logs/request.log
```

## Log Format

### Error Log Entry

```json
{
  "timestamp": "2026-02-24T10:00:00.000Z",
  "method": "POST",
  "url": "/api/auth/register",
  "ip": "::1",
  "error": {
    "message": "Email already registered",
    "stack": "Error: Email already registered\n    at ...",
    "status": 400
  },
  "body": {
    "email": "user@example.com",
    "userName": "testuser"
  }
}
```

### Request Log Entry

```json
{
  "timestamp": "2026-02-24T10:00:00.000Z",
  "method": "POST",
  "url": "/api/auth/register",
  "ip": "::1",
  "body": {
    "email": "user@example.com",
    "password": "***"
  }
}
```

## Tips

- Logs are automatically created when the server starts
- Logs persist between server restarts
- Passwords are masked as `***` in logs for security
- Error logs include full stack traces in development mode
- Console output shows real-time indicators:
  - `Info`
  - `Success`
  - `Error`
  - `Request`

## Testing Error Logging

Try these to test logging:

```bash
# Make a test registration request
curl -k -X POST https://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "testuser",
    "email": "test@example.com",
    "password": "test123"
  }'

# Then check error log (should show validation error for missing fields)
cat server/logs/error.log
```

## Next Steps

1. Try registration at `https://localhost:3000/register`
2. Check error logs if it fails: `cat server/logs/error.log`
3. Fix the issue based on the error message
4. Verify MongoDB is connected using the main [README.md](README.md)

Need help? The logs will usually show exactly what is going wrong.
