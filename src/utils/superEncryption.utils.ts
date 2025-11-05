// crypto-super.ts
import crypto from "crypto";

/**
 * Helpers to read AES/ChaCha keys from env (support base64 / hex / raw)
 */
function loadKeyFromEnv(envName: string): Buffer {
  const v = process.env[envName];
  if (!v) throw new Error(`${envName} is missing`);
  // try base64
  try {
    const b = Buffer.from(v, "base64");
    if (b.length === 32) return b;
  } catch {}
  // try hex
  try {
    const h = Buffer.from(v, "hex");
    if (h.length === 32) return h;
  } catch {}
  // raw
  const raw = Buffer.from(v);
  if (raw.length >= 32) return raw.slice(0, 32);
  throw new Error(`${envName} must decode to 32 bytes (base64/hex/raw)`);
}

const AES_KEY = loadKeyFromEnv("AES_KEY"); // 32 bytes
const CHACHA_KEY = loadKeyFromEnv("CHACHA_KEY"); // 32 bytes

/**
 * Super-encrypt:
 * 1) AES-256-GCM encrypt(plaintext) -> iv_aes(12), tag_aes(16), ciphertext_aes
 * 2) Build inner = iv_aes || tag_aes || ciphertext_aes
 * 3) ChaCha20-Poly1305 encrypt(inner) -> iv_chacha(12), tag_chacha(16), ciphertext_chacha
 * 4) Return Buffer: iv_chacha||tag_chacha||iv_aes||tag_aes||ciphertext_chacha
 */
export function superEncrypt(plainText: string): Buffer {
  // AES-GCM
  const ivAes = crypto.randomBytes(12);
  const aes = crypto.createCipheriv("aes-256-gcm", AES_KEY, ivAes);
  const ctAes = Buffer.concat([aes.update(Buffer.from(plainText, "utf8")), aes.final()]);
  const tagAes = aes.getAuthTag(); // 16 bytes

  const inner = Buffer.concat([ivAes, tagAes, ctAes]); // to be encrypted by ChaCha

  // ChaCha20-Poly1305
  const ivCha = crypto.randomBytes(12);
  const chacha = crypto.createCipheriv("chacha20-poly1305", CHACHA_KEY, ivCha, { authTagLength: 16 });
  // Optional: can set AAD (associated data) if desired, e.g. chacha.setAAD(Buffer.from("v1"));
  const ctCha = Buffer.concat([chacha.update(inner), chacha.final()]);
  const tagCha = chacha.getAuthTag();

  // package: iv_chacha | tag_chacha | iv_aes | tag_aes | ctCha
  return Buffer.concat([ivCha, tagCha, ivAes, tagAes, ctCha]);
}

export function superDecrypt(pkg: Buffer): string {
  if (pkg.length < 56) throw new Error("Invalid package length");
  const ivCha = pkg.slice(0, 12);
  const tagCha = pkg.slice(12, 28);
  const ivAes = pkg.slice(28, 40);
  const tagAes = pkg.slice(40, 56);
  const ctCha = pkg.slice(56);

  const chacha = crypto.createDecipheriv("chacha20-poly1305", CHACHA_KEY, ivCha, { authTagLength: 16 });
  chacha.setAuthTag(tagCha);
  const inner = Buffer.concat([chacha.update(ctCha), chacha.final()]);

  if (inner.length < 28) throw new Error("Inner decrypted too short");
  const innerIvAes = inner.slice(0, 12);
  const innerTagAes = inner.slice(12, 28);
  const ctAes = inner.slice(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", AES_KEY, innerIvAes);
  decipher.setAuthTag(innerTagAes);
  const plain = Buffer.concat([decipher.update(ctAes), decipher.final()]);
  return plain.toString("utf8");
}
