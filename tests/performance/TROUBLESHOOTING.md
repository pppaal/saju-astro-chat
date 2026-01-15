# Performance Testing Troubleshooting

Common issues and solutions when running performance tests.

## Quick Diagnosis

Run this command to check if your server is ready:

```bash
npm run test:performance:check
```

---

## Error: "Hook timed out in 30000ms"

### Symptom
```
Error: Hook timed out in 30000ms.
If this is a long-running hook, pass a timeout value as the last argument
 ❯ tests/performance/api-endpoints.test.ts:49:1
```

### Cause
The server is not running or not accessible.

### Solution

**1. Start the development server first:**

```bash
# Terminal 1
npm run dev
```

Wait for the "Ready in X ms" message.

**2. Then run performance tests in another terminal:**

```bash
# Terminal 2
npm run test:performance
```

### Verify Server is Running

```bash
# Check if server responds
curl http://localhost:3000/api/auth/session

# Or use the built-in check
npm run test:performance:check
```

---

## Error: "Server not ready at http://localhost:3000"

### Symptom
```
Server not ready at http://localhost:3000 after 30000ms
```

### Causes & Solutions

#### 1. Server Not Started
**Check:** Is `npm run dev` running?
**Solution:** Start it in another terminal

#### 2. Wrong Port
**Check:** Is your server running on a different port?
**Solution:** Set the API_BASE_URL environment variable

```bash
# Windows CMD
set API_BASE_URL=http://localhost:4000
npm run test:performance

# Windows PowerShell
$env:API_BASE_URL="http://localhost:4000"
npm run test:performance

# macOS/Linux
API_BASE_URL=http://localhost:4000 npm run test:performance
```

#### 3. Server Still Starting
**Check:** Did you wait for "Ready" message?
**Solution:** Wait a bit longer, or increase timeout in test

#### 4. Firewall/Network Issues
**Check:** Can you access http://localhost:3000 in browser?
**Solution:** Check firewall, antivirus, or network settings

---

## Error: High Error Rates (>5%)

### Symptom
```
Error Rate: 10.00% ⚠️ (target: <1%)
HTTP Status:
  5xx: 500
```

### Causes & Solutions

#### 1. Server Overload
**Check:** Server logs for errors
**Solution:** Reduce test load

```typescript
// Edit tests/performance/api-endpoints.test.ts
const LIGHT_LOAD = 5;   // Reduce from 10
const MEDIUM_LOAD = 15; // Reduce from 25
const HEAVY_LOAD = 30;  // Reduce from 50
```

#### 2. Database Connection Issues
**Check:** Database connection pool exhausted
**Solution:** Increase connection pool or reduce load

#### 3. Rate Limiting
**Check:** Are requests being rate limited?
**Solution:** This might be expected behavior. Verify rate limit settings.

#### 4. Application Errors
**Check:** Server logs for stack traces
**Solution:** Fix application bugs before performance testing

---

## Error: "Cannot find module 'autocannon'"

### Symptom
```
Error: Cannot find module 'autocannon'
```

### Solution
```bash
npm install
# or
npm install autocannon @types/autocannon
```

---

## Error: "'k6' is not recognized"

### Symptom
```
'k6' is not recognized as an internal or external command
```

### Cause
K6 is not installed.

### Solution

**Option 1: Install K6**

```bash
# Windows
choco install k6

# macOS
brew install k6

# Linux - see docs/GETTING_STARTED_PERFORMANCE.md
```

**Option 2: Use Node.js tests instead**

```bash
# Use autocannon-based tests (no k6 needed)
npm run test:performance
```

---

## Error: Port Already in Use

### Symptom
```
Error: listen EADDRINUSE: address already in use :::3000
```

### Solution

**Windows:**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace <PID> with actual PID)
taskkill /PID <PID> /F
```

**macOS/Linux:**
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
```

---

## Tests Time Out After Starting

### Symptom
Tests start but individual tests timeout.

### Causes & Solutions

#### 1. Server Too Slow
**Check:** Server logs for slow operations
**Solution:**
- Optimize code
- Add caching
- Scale resources

#### 2. Database Slow
**Check:** Database query performance
**Solution:**
- Add indexes
- Optimize queries
- Check N+1 query problems

#### 3. Network Latency
**Check:** Are you testing remote server?
**Solution:** Increase timeouts or test local server

```typescript
// In tests/performance/api-endpoints.test.ts
const TEST_DURATION = 20; // Increase from 10 seconds
```

---

## Memory Issues

### Symptom
```
JavaScript heap out of memory
```

### Solution

**Increase Node.js memory:**

```bash
# Windows CMD
set NODE_OPTIONS=--max-old-space-size=4096
npm run dev

# Windows PowerShell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run dev

# macOS/Linux
NODE_OPTIONS=--max-old-space-size=4096 npm run dev
```

**Check for memory leaks:**
```bash
# Run endurance test to detect leaks
npm run test:load:endurance
```

---

## Inconsistent Results

### Symptom
Performance varies significantly between runs.

### Causes & Solutions

#### 1. Background Processes
**Solution:** Close other applications during tests

#### 2. System Resources
**Solution:** Monitor CPU/memory during tests

**Windows:**
```bash
# Task Manager (Ctrl+Shift+Esc)
# Watch CPU and Memory while tests run
```

**macOS:**
```bash
# Activity Monitor
# Or: top -o cpu
```

**Linux:**
```bash
htop
# or: top
```

#### 3. Database State
**Solution:** Reset database to known state before tests

#### 4. Network Conditions
**Solution:** Use local server for consistent results

---

## K6 Tests Fail But Node.js Tests Pass

### Possible Causes

1. **K6 not installed** - Install k6 or skip k6 tests
2. **Different behavior** - K6 runs differently than Node.js
3. **Environment variables** - K6 doesn't read .env files automatically

### Solution

```bash
# Set environment variables for k6
export API_BASE_URL=http://localhost:3000
export METRICS_TOKEN=your-token

# Then run k6 test
npm run test:load:basic
```

---

## Database Connection Errors

### Symptom
```
Error: Too many connections
Error: Connection pool exhausted
```

### Solution

**1. Check connection pool settings:**

Look for database configuration in your code:
```javascript
// Example - adjust pool size
{
  pool: {
    min: 2,
    max: 10  // Increase if needed
  }
}
```

**2. Reduce test load:**
Use fewer concurrent connections in tests.

**3. Close connections properly:**
Ensure application closes DB connections after use.

---

## Production Environment Issues

### Testing Production/Staging

**⚠️ Warning:** Only test non-production environments or with explicit permission!

**Solution:**
```bash
# Point to staging environment
API_BASE_URL=https://staging.your-app.com npm run test:performance

# Use lighter load for production
# Edit test files to reduce connections/duration
```

---

## Getting More Help

### 1. Check Logs

**Server logs:**
```bash
# Console where `npm run dev` is running
# Look for errors, warnings, slow queries
```

**Test output:**
```bash
# Performance test provides detailed metrics
# Look for patterns in failures
```

### 2. Run Diagnostic Commands

```bash
# Check server
npm run test:performance:check

# Check if server responds
curl http://localhost:3000/api/auth/session

# Check server health
curl http://localhost:3000/api/health
# (if you have a health endpoint)
```

### 3. Debug Mode

Add `console.log` to understand what's happening:

```typescript
// In tests/performance/api-endpoints.test.ts
console.log('Starting test...');
console.log('API_BASE:', API_BASE);
// ... your debugging
```

### 4. Reduce Test Scope

Start with minimal test to isolate issue:

```bash
# Create a simple test file
# tests/performance/simple-test.ts
import { runPerformanceTest } from './helpers';

async function test() {
  const result = await runPerformanceTest({
    url: 'http://localhost:3000/api/auth/session',
    connections: 1,
    duration: 5,
  });
  console.log(result);
}

test();
```

```bash
# Run it
npx tsx tests/performance/simple-test.ts
```

---

## Common Mistakes

### ❌ Don't Do This

```bash
# Starting server and tests in same terminal
npm run dev && npm run test:performance
# Server blocks, tests never run
```

```bash
# Running tests before server is ready
npm run dev &
npm run test:performance  # Too fast!
```

### ✅ Do This

```bash
# Terminal 1
npm run dev

# Wait for "Ready" message

# Terminal 2
npm run test:performance
```

Or use the check command:
```bash
npm run dev                     # Terminal 1
npm run test:performance:check  # Terminal 2 - verify first
npm run test:performance        # Terminal 2 - then run tests
```

---

## Still Having Issues?

1. **Read full documentation:**
   - [docs/PERFORMANCE_TESTING.md](../../docs/PERFORMANCE_TESTING.md)
   - [docs/GETTING_STARTED_PERFORMANCE.md](../../docs/GETTING_STARTED_PERFORMANCE.md)

2. **Check example output:**
   - Look at expected results in documentation
   - Compare with your output

3. **Simplify:**
   - Start with smallest test
   - Add complexity gradually
   - Isolate the problem

4. **Ask for help:**
   - Include error messages
   - Include steps to reproduce
   - Include system info (OS, Node version, etc.)

---

**Most issues are solved by: Starting the server first! 🚀**
