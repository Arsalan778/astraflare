import CryptoJS from 'crypto-js';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'astraflare-default-key-change-me';

export function encrypt(text) {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

export function decrypt(cipherText) {
  const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function hashSHA256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateApiKey() {
  const prefix = 'af';
  const token = crypto.randomBytes(24).toString('base64url');
  return `${prefix}_${token}`;
}