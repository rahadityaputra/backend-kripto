// util/crypto-super.ts
import crypto from 'crypto';

const MASTER_SECRET = process.env.MASTER_SECRET || 'please-set-master-secret';
const MASTER_SALT = process.env.MASTER_SALT || 'fixed-salt-please-change';

// derive two 32-byte keys from MASTER_SECRET
function deriveKeys(): { aesKey: Buffer; chachaKey: Buffer } {
  // simple derivation using HKDF if available; fallback to SHA256 slices
  const master = Buffer.from(MASTER_SECRET, 'utf8');
  const salt = Buffer.from(MASTER_SALT, 'utf8');

  // Node >=15 has hkdfSync; fallback to sha256
  if ((crypto as any).hkdfSync) {
    const aesKey = (crypto as any).hkdfSync('sha256', salt, master, 'aes-key', 32);
    const chachaKey = (crypto as any).hkdfSync('sha256', salt, master, 'chacha-key', 32);
    return { aesKey, chachaKey };
  } else {
    const hash = crypto.createHash('sha256').update(master).update(salt).digest();
    // expand to two keys by hashing with different info
    const aesKey = crypto.createHash('sha256').update(hash).update('aes').digest();
    const chachaKey = crypto.createHash('sha256').update(hash).update('chacha').digest();
    return { aesKey, chachaKey };
  }
}

export function superEncrypt(plainText: string): string {
  const { aesKey, chachaKey } = deriveKeys();

  // AES-256-GCM encrypt
  const ivAes = crypto.randomBytes(12);
  const cipherAes = crypto.createCipheriv('aes-256-gcm', aesKey, ivAes);
  const aesCipher = Buffer.concat([cipherAes.update(Buffer.from(plainText, 'utf8')), cipherAes.final()]);
  const aesTag = cipherAes.getAuthTag();

  // ChaCha20-Poly1305 encrypt the AES ciphertext
  const ivChacha = crypto.randomBytes(12);
  const cipherChacha = crypto.createCipheriv('chacha20-poly1305', chachaKey, ivChacha, { authTagLength: 16 });
  const chachaCipher = Buffer.concat([cipherChacha.update(aesCipher), cipherChacha.final()]);
  const chachaTag = cipherChacha.getAuthTag();

  const payload = {
    v: 1,
    aes: {
      iv: ivAes.toString('base64'),
      tag: aesTag.toString('base64'),
      ct: aesCipher.toString('base64')
    },
    chacha: {
      iv: ivChacha.toString('base64'),
      tag: chachaTag.toString('base64'),
      ct: chachaCipher.toString('base64')
    }
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function superDecrypt(b64payload: string): string {
  const { aesKey, chachaKey } = deriveKeys();
  const payloadJson = Buffer.from(b64payload, 'base64').toString('utf8');
  const payload = JSON.parse(payloadJson);

  // decode
  const ivAes = Buffer.from(payload.aes.iv, 'base64');
  const aesTag = Buffer.from(payload.aes.tag, 'base64');
  const aesCt = Buffer.from(payload.aes.ct, 'base64');

  const ivChacha = Buffer.from(payload.chacha.iv, 'base64');
  const chachaTag = Buffer.from(payload.chacha.tag, 'base64');
  const chachaCt = Buffer.from(payload.chacha.ct, 'base64');

  // First decrypt ChaCha -> yields AES ciphertext
  const decipherChacha = crypto.createDecipheriv('chacha20-poly1305', chachaKey, ivChacha, { authTagLength: 16 });
  decipherChacha.setAuthTag(chachaTag);
  const aesCipher = Buffer.concat([decipherChacha.update(chachaCt), decipherChacha.final()]);

  // Decrypt AES-GCM
  const decipherAes = crypto.createDecipheriv('aes-256-gcm', aesKey, ivAes);
  decipherAes.setAuthTag(aesTag);
  const plain = Buffer.concat([decipherAes.update(aesCipher), decipherAes.final()]);

  return plain.toString('utf8');
}
