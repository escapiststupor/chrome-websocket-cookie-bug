# Chrome WebSocket Cookie Bug Reproduction

This minimal reproduction demonstrates Chrome's failure to properly clear cookies with `Max-Age=0` in WebSocket contexts, violating RFC 6265.

## 🐛 The Bug

**Expected (RFC 6265):** When server sends `Set-Cookie: name=; Max-Age=0`, browser MUST delete cookie immediately.

**Chrome's Behavior:** Cookie is not deleted, causing subsequent WebSocket connections to send stale cookies.

**Result:** Server receives unexpected cookie → returns 404 → WebSocket fails with close code 1006.

## 🧪 Testing

### Local Testing

```bash
npm install
npm start
```

Open http://localhost:3000 in Chrome and Safari to compare behavior.

### Deployment Testing (Recommended)

Deploy to a real domain to test cross-origin cookie behavior that matches the real-world scenario:

#### Option 1: Netlify (Recommended)

1. Push to GitHub
2. Deploy on Netlify with custom domain
3. Configure subdomain for WebSocket server

#### Option 2: Railway/Render

- Full-stack deployment with WebSocket support
- Custom domains available

#### Option 3: Vercel + Separate WebSocket Service

- Frontend on Vercel
- WebSocket server on Railway/Render

## 📋 Test Steps

1. **Set Cookie** - Creates session cookie via HTTP
2. **Connect WebSocket** - Should work (no existing cookie)
3. **Clear Cookie** - Server sends `Max-Age=0` to delete cookie
4. **Connect Again**:
   - ✅ **Safari/Firefox:** Works (cookie properly cleared)
   - ❌ **Chrome:** Fails (cookie not cleared, sends stale value)

## 🎯 Expected Results

- **Safari/Firefox:** Second connection succeeds
- **Chrome:** Second connection fails with 404 → Close code 1006

## 🔗 Specification Reference

This bug violates [RFC 6265](https://datatracker.ietf.org/doc/html/rfc6265) Section 4.1.1 regarding Max-Age attribute behavior.

## 📊 Bug Report Data

Use this reproduction case to file a Chromium bug report with:

- Specific test case
- Clear specification violation
- Cross-browser comparison
- Network logs showing the issue
