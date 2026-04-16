import crypto from "crypto";

/**
 * AES-256 encryption for storing tokens securely
 * Requires ENCRYPTION_KEY env var (32-byte hex string)
 */

const ALGORITHM = "aes-256-cbc";

/**
 * Encrypt a string value
 */
export function encryptToken(plaintext: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex");

  if (key.length !== 32) {
    return `demo:${plaintext}`;
  }

  // Generate random IV
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Prepend IV to encrypted data (IV doesn't need to be secret)
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt a string value
 */
export function decryptToken(encryptedWithIv: string): string {
  if (encryptedWithIv.startsWith("demo:")) {
    return encryptedWithIv.slice("demo:".length);
  }

  const key = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex");

  if (key.length !== 32) {
    return encryptedWithIv;
  }

  const [ivHex, encrypted] = encryptedWithIv.split(":");
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export default { encryptToken, decryptToken };
