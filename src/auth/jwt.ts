import * as jose from "jose";
import { readFile } from "fs/promises";

export interface JWTConfig {
  keyId: string;
  issuerId: string;
  privateKey: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function loadConfig(): Promise<JWTConfig> {
  const keyId = process.env.ASC_KEY_ID;
  const issuerId = process.env.ASC_ISSUER_ID;

  if (!keyId || !issuerId) {
    throw new Error(
      "Missing ASC_KEY_ID or ASC_ISSUER_ID environment variables. " +
        "Get these from App Store Connect > Users and Access > Keys."
    );
  }

  let privateKey = process.env.ASC_PRIVATE_KEY;
  if (!privateKey) {
    const keyPath = process.env.ASC_PRIVATE_KEY_PATH;
    if (!keyPath) {
      throw new Error(
        "Missing ASC_PRIVATE_KEY or ASC_PRIVATE_KEY_PATH environment variable. " +
          "Provide your .p8 key file path or inline key."
      );
    }
    privateKey = await readFile(keyPath, "utf-8");
  } else {
    // Handle escaped newlines from env vars
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  return { keyId, issuerId, privateKey };
}

export async function generateToken(config: JWTConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }

  const expiresAt = now + 20 * 60; // 20 minutes (Apple max)

  const privateKey = await jose.importPKCS8(config.privateKey, "ES256");

  const token = await new jose.SignJWT({})
    .setProtectedHeader({
      alg: "ES256",
      kid: config.keyId,
      typ: "JWT",
    })
    .setIssuer(config.issuerId)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .setAudience("appstoreconnect-v1")
    .sign(privateKey);

  cachedToken = { token, expiresAt };
  return token;
}

export function clearTokenCache(): void {
  cachedToken = null;
}
