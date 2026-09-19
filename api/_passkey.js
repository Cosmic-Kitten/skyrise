qconst crypto = require("crypto");
const { Redis } = require("@upstash/redis");

const kv = Redis.fromEnv();

function getOrigin(request) {
  return process.env.PASSKEY_ORIGIN || (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `${request.headers["x-forwarded-proto"] || "http"}://${request.headers.host}`);
}

function getRpId(request) {
  return process.env.PASSKEY_RP_ID || new URL(getOrigin(request)).hostname;
}

function getSessionId(request, response) {
  const cookie = request.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)passkey_session=([^;]+)/);
  const sessionId = match ? decodeURIComponent(match[1]) : crypto.randomBytes(24).toString("hex");
  if (!match) {
    response.setHeader("Set-Cookie", `passkey_session=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600`);
  }
  return sessionId;
}

function json(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

function requireMethod(request, response, method) {
  if (request.method !== method) {
    json(response, 405, { error: "Method not allowed" });
    return false;
  }
  return true;
}

module.exports = { getOrigin, getRpId, getSessionId, json, kv, requireMethod };
