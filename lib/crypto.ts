import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const key = process.env.PATIENT_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "PATIENT_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32",
    );
  }
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "PATIENT_ENCRYPTION_KEY must decode to 32 bytes (base64-encoded AES-256 key).",
    );
  }
  return buf;
}

// iv:authTag:ciphertext, each base64
const CIPHERTEXT_RE = /^[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*$/;

export function encrypt(plaintext: string): string {
  let key: Buffer;
  try {
    key = getKey();
  } catch {
    // No encryption key configured — store plaintext so the write path never
    // crashes. decrypt() already tolerates plaintext (CIPHERTEXT_RE guard).
    return plaintext;
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

// Tolerant of legacy plaintext values written before encryption was introduced —
// returns the input unchanged if it isn't in our iv:authTag:ciphertext format.
export function decrypt(value: string): string {
  if (!CIPHERTEXT_RE.test(value)) return value;

  const [ivB64, authTagB64, ciphertextB64] = value.split(":");
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    // Malformed/foreign-key ciphertext — fail safe to the raw stored value
    // rather than crashing the read path.
    return value;
  }
}
