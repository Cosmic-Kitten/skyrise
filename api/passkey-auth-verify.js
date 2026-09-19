const { verifyAuthenticationResponse } = require("@simplewebauthn/server");
const { getOrigin, getRpId, getSessionId, json, kv, requireMethod } = require("./_passkey");

module.exports = async function handler(request, response) {
  if (!requireMethod(request, response, "POST")) return;
  try {
    const sessionId = getSessionId(request, response);
    const pending = await kv.get(`passkey:authentication:${sessionId}`);
    if (!pending) return json(response, 400, { error: "Passkey sign-in expired. Please try again." });

    const credentialId = request.body && request.body.id;
    const username = credentialId ? await kv.get(`passkey:credential:${credentialId}`) : null;
    const user = username ? await kv.get(`passkey:user:${username}`) : null;
    if (!user) return json(response, 401, { error: "That passkey is not registered." });
    const credential = user.credentials.find(item => item.id === credentialId);
    if (!credential) return json(response, 401, { error: "That passkey is not registered." });

    const verification = await verifyAuthenticationResponse({
      response: request.body,
      expectedChallenge: pending.challenge,
      expectedOrigin: getOrigin(request),
      expectedRPID: getRpId(request),
      credential: {
        id: credential.id,
        publicKey: Buffer.from(credential.publicKey, "base64url"),
        counter: credential.counter,
        transports: credential.transports
      },
      requireUserVerification: true
    });
    if (!verification.verified) return json(response, 401, { error: "Passkey sign-in was not verified." });

    credential.counter = verification.authenticationInfo.newCounter;
    await kv.set(`passkey:user:${user.username}`, user);
    await kv.del(`passkey:authentication:${sessionId}`);
    return json(response, 200, { verified: true, username: user.username });
  } catch (error) {
    console.error(error);
    return json(response, 401, { error: "Passkey sign-in failed." });
  }
};
