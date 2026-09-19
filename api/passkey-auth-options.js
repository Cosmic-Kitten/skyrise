const { generateAuthenticationOptions } = require("@simplewebauthn/server");
const { getRpId, getSessionId, json, requireMethod, requireStorage } = require("./_passkey");

module.exports = async function handler(request, response) {
  if (!requireMethod(request, response, "POST")) return;
  try {
    const kv = requireStorage();
    const options = await generateAuthenticationOptions({
      rpID: getRpId(request),
      userVerification: "required",
      timeout: 60000
    });
    const sessionId = getSessionId(request, response);
    await kv.set(`passkey:authentication:${sessionId}`, { challenge: options.challenge }, { ex: 600 });
    return json(response, 200, options);
  } catch (error) {
    console.error(error);
    return json(response, 500, { error: "Could not start passkey sign-in." });
  }
};
