import CryptoJS from "crypto-js";

export async function sha1(data: string): Promise<string> {
  const buffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-1", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function md5(data: string): string {
  return CryptoJS.MD5(data).toString();
}

export function aesEcbEncrypt(data: string, key: string): string {
  const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(key), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.ciphertext.toString().toUpperCase();
}

export function base64Encode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function base64Decode(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function aesCbcEncrypt(plaintext: string, key: string, iv: string): string {
  return CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Utf8.parse(key), {
    iv: CryptoJS.enc.Utf8.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
}

// --- KW XOR encoding for lyric requests ---
const KW_LYRIC_KEY = new TextEncoder().encode("yeelion");

export function kwLyricParam(id: string, isLyricx = true): string {
  let params = `user=12345,web,web,web&requester=localhost&req=1&rid=MUSIC_${id}`;
  if (isLyricx) params += "&lrcx=1";
  const bufStr = new TextEncoder().encode(params);
  const output = new Uint16Array(bufStr.length);
  for (let i = 0; i < bufStr.length; i++) {
    output[i] = KW_LYRIC_KEY[i % KW_LYRIC_KEY.length] ^ bufStr[i];
  }
  return btoa(String.fromCharCode(...output));
}
