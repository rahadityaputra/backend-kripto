import NodeRSA from "node-rsa";
import { logger } from "../config/logger.config";

const PRIVATE_KEY = process.env.RSA_PRIVATE_KEY!;

function loadKeyPair(): NodeRSA {
  if (!PRIVATE_KEY) {
    throw new Error("RSA_PRIVATE_KEY missing in environment");
  }

  const key = new NodeRSA(PRIVATE_KEY);
  key.setOptions({
    encryptionScheme: {
      scheme: "pkcs1_oaep",
      hash: "sha1",
    },
  });

  return key;
}

export function rsaEncrypt(data: string): string {
  try {
    return loadKeyPair().encrypt(data, "base64"); // uses PUBLIC part automatically ✅
  } catch (err) {
    logger.error("Encryption failed:", err);
    throw new Error("Failed to encrypt");
  }
}

export function rsaDecrypt(encrypted: string): string {
    const key = new NodeRSA(PRIVATE_KEY);
    key.setOptions({
      encryptionScheme: {
        scheme: "pkcs1_oaep",
        hash: "sha1",
      },
  });
  try {
    return key.decrypt(encrypted, "utf8"); // uses PRIVATE part automatically ✅
  } catch (err) {
    logger.error("Decryption failed:", err);
    throw new Error("Failed to decrypt (key mismatch or corrupted data)");
  }
}

export function rsaEncryptFields<T>(data: T, fields: (keyof T)[]): T {
  const newObj = { ...data };
  fields.forEach((field) => {
    if (typeof newObj[field] === "string") {
      newObj[field] = rsaEncrypt(newObj[field] as string) as any;
    }
  });
  return newObj;
}

export function rsaDecryptFields<T>(data: T, fields: (keyof T)[]): T {
  const newObj = { ...data };
  fields.forEach((field) => {
    if (typeof newObj[field] === "string") {
      newObj[field] = rsaDecrypt(newObj[field] as string) as any;
    }
  });
  return newObj;
}
