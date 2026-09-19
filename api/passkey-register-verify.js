const { verifyRegistrationResponse } = require("@simplewebauthn/server");
const { getOrigin, getRpId, getSessionId, json, requireMethod, requireStorage } = require("./_passkey");

module.exports = async function handler(request, response) {
  if (!requireMethod(request, response, "POST")) return;
  try {
    const kv = requireStorage();
    const sessionId = getSessionId(request, response);
    const pending = await kv.get(`passkey:registration:${sessionId}`);
    if (!pending) return json(response, 400, { error: "Passkey setup expired. Please try again." });

    const verification = await verifyRegistrationResponse({
      response: request.body,
      expectedChallenge: pending.challenge,
      expectedOrigin: getOrigin(request),
      expectedRPID: getRpId(request),
      requireUserVerification: true
    });

    if (!verification.verified || !verification.registrationInfo) {
      return json(response, 400, { error: "Passkey setup was not verified." });
    }

    const info = verification.registrationInfo;
    const credential = {
      id: info.credential.id,
      publicKey: Buffer.from(info.credential.publicKey).toString("base64url"),
      counter: info.credential.counter,
      transports: request.body.response && request.body.response.transports || []
    };
    await kv.set(`passkey:user:${pending.username}`, {
      username: pending.username,
      userId: pending.userId,
      credentials: [credential]
    });
    await kv.set(`passkey:credential:${credential.id}`, pending.username);
    await kv.del(`passkey:registration:${sessionId}`);
    return json(response, 200, { verified: true, username: pending.username });
  } catch (error) {
    console.error(error);
    return json(response, 400, { error: "Passkey setup failed." });
  }
};
