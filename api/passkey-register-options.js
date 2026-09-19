const { generateRegistrationOptions } = require("@simplewebauthn/server");
const { getRpId, getSessionId, json, kv, requireMethod } = require("./_passkey");

module.exports = async function handler(request, response) {
  if (!requireMethod(request, response, "POST")) return;
  try {
    const { username } = request.body || {};
    const normalizedUsername = String(username || "").trim().toLowerCase();
    if (!normalizedUsername || normalizedUsername.length > 40) {
      return json(response, 400, { error: "Enter a valid runner name first." });
    }

    const userKey = `passkey:user:${normalizedUsername}`;
    const existingUser = await kv.get(userKey);
    if (existingUser) return json(response, 409, { error: "That runner already exists." });

    const sessionId = getSessionId(request, response);
    const userIdBytes = cryptoRandomUserId();
    const userId = Buffer.from(userIdBytes).toString("base64url");
    const options = await generateRegistrationOptions({
      rpName: process.env.PASSKEY_RP_NAME || "Sky Rise",
      rpID: getRpId(request),
      userName: normalizedUsername,
      userDisplayName: normalizedUsername,
      userID: userIdBytes,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required"
      },
      timeout: 60000
    });

    await kv.set(`passkey:registration:${sessionId}`, { username: normalizedUsername, userId, challenge: options.challenge }, { ex: 600 });
    return json(response, 200, options);
  } catch (error) {
    console.error(error);
    return json(response, 500, { error: "Could not start passkey setup." });
  }
};

function cryptoRandomUserId() {
  return require("crypto").randomBytes(16);
}
