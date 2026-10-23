// data/veri.json'u gzip ile sıkıştırıp SITE_PASSWORD ile şifreleyip public/veri.enc.json'a yazar (PBKDF2 + AES-GCM).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";
import { gzipSync } from "node:zlib";

if (!process.env.SITE_PASSWORD && existsSync(".env.local")) {
  for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = l.match(/^SITE_PASSWORD=(.*)$/);
    if (m) process.env.SITE_PASSWORD = m[1].trim();
  }
}
const sifre = process.env.SITE_PASSWORD?.trim();
if (!sifre) throw new Error("SITE_PASSWORD tanımlı değil (.env.local veya ortam değişkeni)");

const ITER = 310000;
const b64 = (u) => Buffer.from(u).toString("base64");
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const temel = await crypto.subtle.importKey("raw", new TextEncoder().encode(sifre), "PBKDF2", false, ["deriveKey"]);
const anahtar = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, temel, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const veri = gzipSync(readFileSync(new URL("../data/veri.json", import.meta.url)));
const sifreli = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, anahtar, veri);

mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/veri.enc.json", import.meta.url), JSON.stringify({ v: 2, iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(sifreli)) }));
console.log("public/veri.enc.json yazıldı");
