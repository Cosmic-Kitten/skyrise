# skyrise

## Passkeys on Vercel

The app includes real WebAuthn passkey registration and sign-in through the
`api/passkey-*.js` Vercel Functions. Passkey credentials are stored in Redis;
they are not stored in browser localStorage.

1. Import this repository into Vercel.
2. Create a Redis database from the Vercel Marketplace using Upstash Redis.
3. Add these environment variables in the Vercel project:

	- `UPSTASH_REDIS_REST_URL`
	- `UPSTASH_REDIS_REST_TOKEN`
	- `PASSKEY_RP_ID`: the production hostname, such as `skyrise.example.com`
	- `PASSKEY_ORIGIN`: the complete HTTPS origin, such as `https://skyrise.example.com`
	- `PASSKEY_RP_NAME`: `Sky Rise` (optional)

For a default Vercel deployment, `PASSKEY_RP_ID` and `PASSKEY_ORIGIN` can be
omitted and the deployment hostname is used. A custom domain is recommended
because passkeys are bound to the site origin and cannot be moved between
unrelated domains. Local development works on `http://localhost` in browsers
that support WebAuthn.