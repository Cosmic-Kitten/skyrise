const { generateAuthenticationOptions } = require("@simplewebauthn/server");
const { getRpId, getSessionId, json, kv, requireMethod } = require("./_passkey");

module.exports = async function handler(request, response) {
  if (!requireMethod(request, response, "POST")) return;
  try {
    const username = String((request.body || {}).username || "").trim().toLowerCase();
    const user = username ? await kv.get(`passkey:user:${username}`) : null;
    const options = await generateAuthenticationOptions({
      rpID: getRpId(request),
      userVerification: "required",
      allowCredentials: user ? user.credentials.map(credential => ({ id: credential.id, transports: credential.transports })) : undefined,
      timeout: 60000
    });
    const sessionId = getSessionId(request, response);
    await kv.set(`passkey:authentication:${sessionId}`, { username, challenge: options.challenge }, { ex: 600 });
    return json(response, 200, options);
  } catch (error) {
    console.error(error);
    return json(response, 500, { error: "Could not start passkey sign-in." });
  }
};
