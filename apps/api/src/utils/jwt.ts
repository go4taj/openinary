import crypto from "crypto";

// Very small JWT HS256 signer for demo purposes only.
// Do NOT use this in production.

const SECRET = process.env.JWT_SECRET || "openinary-demo-secret";

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function signJwt(payload: Record<string, any>) {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const toSign = `${headerB64}.${payloadB64}`;
  const signature = crypto.createHmac("sha256", SECRET).update(toSign).digest();
  const sigB64 = base64url(signature);
  return `${toSign}.${sigB64}`;
}

export function verifyJwt(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const toSign = `${headerB64}.${payloadB64}`;
    const expectedSig = base64url(crypto.createHmac("sha256", SECRET).update(toSign).digest());
    if (expectedSig !== sigB64) return null;

    const payloadJson = Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();
    const payload = JSON.parse(payloadJson);

    // Check expiration if present
    if (payload.exp && typeof payload.exp === "number") {
      if (Math.floor(Date.now() / 1000) > payload.exp) return null;
    }

    return payload as Record<string, any>;
  } catch (err) {
    return null;
  }
}
