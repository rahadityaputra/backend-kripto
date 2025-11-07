import crypto from "crypto";

function loadKeyFromEnv(envName: string): Buffer {
  const v = process.env[envName];
  if (!v) {
      if (envName === "AES_KEY") return Buffer.from("0123456789abcdef0123456789abcdef", "hex");
      if (envName === "CHACHA_KEY") return Buffer.from("fedcba9876543210fedcba9876543210", "hex");
      throw new Error(`${envName} is missing`);
  }

  try {
    const b = Buffer.from(v, "base64");
    if (b.length === 32) return b;
  } catch {}

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

export function superEncrypt(plainText: string): Buffer {
  // AES-GCM
  const ivAes = crypto.randomBytes(12);
  const aes = crypto.createCipheriv("aes-256-gcm", AES_KEY, ivAes);
  const ctAes = Buffer.concat([aes.update(Buffer.from(plainText, "utf8")), aes.final()]);
  const tagAes = aes.getAuthTag(); // 16 bytes

  const inner = Buffer.concat([ivAes, tagAes, ctAes]); 

  // ChaCha20-Poly1305
  const ivCha = crypto.randomBytes(12);
  const chacha = crypto.createCipheriv("chacha20-poly1305", CHACHA_KEY, ivCha, { authTagLength: 16 });
  const ctCha = Buffer.concat([chacha.update(inner), chacha.final()]);
  const tagCha = chacha.getAuthTag();

  return Buffer.concat([ivCha, tagCha, ivAes, tagAes, ctCha]); 
}

export function superDecrypt(pkg: Buffer): string {
  if (pkg.length < 56) throw new Error("Invalid package length");
  
  const ivCha = pkg.slice(0, 12);
  const tagCha = pkg.slice(12, 28);
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