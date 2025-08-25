const express = require("express");
const WebSocket = require("ws");
const http = require("http");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Serve static files
app.use(express.static("public"));

// Create HTTP server
const server = http.createServer(app);

// WebSocket server on the same port as HTTP server
const wss = new WebSocket.Server({ server });

// Track sessions to demonstrate the cookie issue
const sessions = new Map();

// Generate session ID
function generateSessionId() {
  return "session-" + Math.random().toString(36).substr(2, 9);
}

// WebSocket connection handler
wss.on("connection", (ws, req) => {
  console.log("\n🔌 New WebSocket connection attempt");

  // Parse cookies from the request
  const cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(";").forEach((cookie) => {
      const [name, value] = cookie.trim().split("=");
      cookies[name] = value;
    });
  }

  console.log("📥 Received cookies:", cookies);

  const sessionCookie = cookies["test-session-id"];

  if (sessionCookie) {
    // Second+ connection with existing cookie
    if (sessions.has(sessionCookie)) {
      console.log(
        "❌ ERROR: Received stale session cookie that should have been cleared!"
      );
      console.log(
        `❌ Session ${sessionCookie} was already used and should be deleted`
      );

      // Simulate 404 error like the real issue
      ws.close(1008, "Session already used - cookie should have been cleared");
      return;
    } else {
      console.log(
        "⚠️  WARNING: Received unknown session cookie:",
        sessionCookie
      );
      ws.close(1008, "Unknown session");
      return;
    }
  }

  // First connection or clean connection (no cookie)
  const sessionId = generateSessionId();
  sessions.set(sessionId, { created: Date.now() });

  console.log(
    "✅ SUCCESS: No cookie received, creating new session:",
    sessionId
  );

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    console.log("📨 Received message:", data);

    if (data.type === "set_cookie") {
      // This is where we would set the cookie in a real HTTP response
      // But WebSocket doesn't have HTTP response headers, so we'll simulate
      console.log("🍪 Would set cookie: test-session-id=" + sessionId);
      ws.send(
        JSON.stringify({
          type: "cookie_set",
          sessionId: sessionId,
          message: "Cookie would be set via HTTP response",
        })
      );
    }

    if (data.type === "clear_cookie") {
      // Simulate clearing the cookie (like Max-Age=0)
      console.log("🗑️  Would clear cookie: test-session-id=; Max-Age=0");

      // Mark session as used/expired
      sessions.delete(sessionId);

      ws.send(
        JSON.stringify({
          type: "cookie_cleared",
          message: "Cookie cleared with Max-Age=0 (browser should delete it)",
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("🔌 WebSocket connection closed");
  });

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "connected",
      sessionId: sessionId,
      message: "Connected successfully - no stale cookie detected",
    })
  );
});

// HTTP route to set/clear cookies (simulates the real server behavior)
app.get("/set-cookie", (req, res) => {
  const sessionId = generateSessionId();
  sessions.set(sessionId, { created: Date.now() });

  console.log("🍪 Setting cookie via HTTP:", sessionId);

  // Dynamic domain for both localhost and production
  const domain = req.get("host").split(":")[0]; // Remove port if present

  res.cookie("test-session-id", sessionId, {
    domain: domain === "localhost" ? "localhost" : undefined, // Let browser handle domain in production
    path: "/",
    httpOnly: false, // Allow JavaScript access for testing
  });

  res.json({
    success: true,
    sessionId,
    message: "Cookie set successfully",
  });
});

app.get("/clear-cookie", (req, res) => {
  console.log("🗑️  Clearing cookie via HTTP with Max-Age=0");

  // Dynamic domain for both localhost and production
  const domain = req.get("host").split(":")[0]; // Remove port if present

  // This is the standard way to clear cookies - what Chrome should respect
  res.cookie("test-session-id", "", {
    domain: domain === "localhost" ? "localhost" : undefined, // Let browser handle domain in production
    path: "/",
    maxAge: 0, // This is Max-Age=0 - should delete the cookie immediately
    httpOnly: false,
  });

  // Clear from our session store
  const cookies = req.headers.cookie || "";
  const sessionMatch = cookies.match(/test-session-id=([^;]+)/);
  if (sessionMatch) {
    sessions.delete(sessionMatch[1]);
  }

  res.json({
    success: true,
    message: "Cookie cleared with Max-Age=0 - browser should delete it",
  });
});

app.get("/status", (req, res) => {
  const cookies = req.headers.cookie || "";
  const sessionMatch = cookies.match(/test-session-id=([^;]+)/);

  res.json({
    receivedCookie: sessionMatch ? sessionMatch[1] : null,
    activeSessions: Array.from(sessions.keys()),
    allCookies: cookies,
  });
});

server.listen(port, () => {
  console.log(`🌍 HTTP Server running on port ${port}`);
  console.log(`🔌 WebSocket Server running on same port ${port}`);
  console.log("\n📋 Test Instructions:");
  console.log("1. Open the web interface in Chrome and Safari");
  console.log('2. Click "Set Cookie" then "Connect WebSocket" - should work');
  console.log('3. Click "Clear Cookie" then "Connect WebSocket" again');
  console.log("4. Chrome should fail (sends stale cookie), Safari should work");

  if (process.env.NODE_ENV === "production") {
    console.log("\n🌐 Production deployment detected");
    console.log("WebSocket URL should be: wss://your-domain.railway.app");
  }
});
