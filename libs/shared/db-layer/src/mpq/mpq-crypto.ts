/**
 * MPQ (Mo'PaQ) cryptography — a faithful port of the StormLib hash/encrypt primitives that every
 * MPQ v1 archive (WotLK 3.3.5a) relies on. The Storm "crypt table" seeds a custom string hash used
 * both to locate files in the hash table and to (de)crypt the hash/block tables.
 *
 * Pure + dependency-free, so it is fully unit-testable.
 */

const CRYPT_TABLE_SIZE = 0x500;

function buildStormBuffer(): Uint32Array {
  const table = new Uint32Array(CRYPT_TABLE_SIZE);
  let seed = 0x00100001;
  for (let index1 = 0; index1 < 0x100; index1++) {
    for (let index2 = index1, i = 0; i < 5; i++, index2 += 0x100) {
      seed = (seed * 125 + 3) % 0x2aaaab;
      const temp1 = (seed & 0xffff) << 0x10;
      seed = (seed * 125 + 3) % 0x2aaaab;
      const temp2 = seed & 0xffff;
      table[index2] = (temp1 | temp2) >>> 0;
    }
  }
  return table;
}

const STORM_BUFFER = buildStormBuffer();

export enum MpqHashType {
  TableOffset = 0,
  NameA = 1,
  NameB = 2,
  FileKey = 3,
}

/** Hash a (case-insensitive, backslash-separated) file name with the given hash type. */
export function hashString(name: string, type: MpqHashType): number {
  const normalized = name.replace(/\//g, '\\').toUpperCase();
  let seed1 = 0x7fed7fed;
  let seed2 = 0xeeeeeeee;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i) & 0xff;
    seed1 = (STORM_BUFFER[(type << 8) + ch] ^ ((seed1 + seed2) >>> 0)) >>> 0;
    seed2 = (ch + seed1 + seed2 + seed2 * 32 + 3) >>> 0;
  }
  return seed1 >>> 0;
}

/** Decrypt a block of little-endian dwords in place, using the StormLib key schedule. */
export function decryptBlock(data: Uint32Array, key: number): void {
  let seed = 0xeeeeeeee;
  let k = key >>> 0;
  for (let i = 0; i < data.length; i++) {
    seed = (seed + STORM_BUFFER[0x400 + (k & 0xff)]) >>> 0;
    const ch = (data[i] ^ ((k + seed) >>> 0)) >>> 0;
    data[i] = ch;
    k = (((((~k << 0x15) >>> 0) + 0x11111111) >>> 0) | (k >>> 0x0b)) >>> 0;
    seed = (ch + seed + seed * 32 + 3) >>> 0;
  }
}

/** Encrypt a block of little-endian dwords in place (inverse of {@link decryptBlock}). */
export function encryptBlock(data: Uint32Array, key: number): void {
  let seed = 0xeeeeeeee;
  let k = key >>> 0;
  for (let i = 0; i < data.length; i++) {
    seed = (seed + STORM_BUFFER[0x400 + (k & 0xff)]) >>> 0;
    const ch = data[i] >>> 0;
    data[i] = (ch ^ ((k + seed) >>> 0)) >>> 0;
    k = (((((~k << 0x15) >>> 0) + 0x11111111) >>> 0) | (k >>> 0x0b)) >>> 0;
    seed = (ch + seed + seed * 32 + 3) >>> 0;
  }
}
