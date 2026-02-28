/**
 * Lightweight Google OAuth2 token provider.
 * Uses `jose` (already in project) instead of the heavy `googleapis` package.
 * Designed for the streaming endpoint to eliminate cold-start overhead.
 */
import { SignJWT, importPKCS8 } from "jose";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const TOKEN_TTL = 50 * 60 * 1000; // 50 min (Google tokens expire at 60 min)

// In-memory cache
let tokenCache: { token: string; expiresAt: number } | null = null;
let privateKeyCache: { key: CryptoKey; email: string; rawKey: string } | null = null;

function getServiceAccountJson(): { client_email: string; private_key: string } {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured");
  return JSON.parse(raw);
}

async function getPrivateKey() {
  const sa = getServiceAccountJson();
  if (privateKeyCache && privateKeyCache.rawKey === sa.private_key) {
    return { key: privateKeyCache.key, email: privateKeyCache.email };
  }
  const key = await importPKCS8(sa.private_key, "RS256");
  privateKeyCache = { key, email: sa.client_email, rawKey: sa.private_key };
  return { key, email: sa.client_email };
}

/**
 * Get a cached Google OAuth2 access token for Drive API.
 * On cold start: ~200ms (JWT sign + token exchange).
 * On warm: ~0ms (returns cached token).
 */
export async function getAccessTokenLite(): Promise<string> {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const { key, email } = await getPrivateKey();

  const assertion = await new SignJWT({ scope: DRIVE_SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setAudience(TOKEN_ENDPOINT)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${assertion}`,
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("No access_token in response");
  }

  tokenCache = { token: data.access_token, expiresAt: now + TOKEN_TTL };
  return data.access_token;
}
