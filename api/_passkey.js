const crypto = require("crypto");
const { Redis } = require("@upstash/redis");

const hasRedisConfig = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const kv = hasRedisConfig ? Redis.fromEnv() : null;

function requireStorage() {
  if (!kv) {
    const error = new Error("Passkey storage is not configured. Connect Upstash Redis to the Vercel project and redeploy.");
    error.code = "PASSKEY_STORAGE_NOT_CONFIGURED";
    throw error;
  }
  return kv;
}

function getOrigin(request) {
  const protocol = request.headers["x-forwarded-proto"] || "http";
  const requestOrigin = `${protocol}://${request.headers.host}`;
  if (!process.env.PASSKEY_ORIGIN) return requestOrigin;
  return new URL(process.env.PASSKEY_ORIGIN).hostname === new URL(requestOrigin).hostname
    ? process.env.PASSKEY_ORIGIN
    : requestOrigin;
}

function getRpId(request) {
  const requestRpId = new URL(getOrigin(request)).hostname;
  if (!process.env.PASSKEY_RP_ID) return requestRpId;
  return process.env.PASSKEY_RP_ID === requestRpId ? process.env.PASSKEY_RP_ID : requestRpId;
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

module.exports = { getOrigin, getRpId, getSessionId, json, kv, requireMethod, requireStorage };
