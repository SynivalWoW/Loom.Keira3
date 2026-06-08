/**
 * PKWARE Data Compression Library "implode" decompressor (a.k.a. "explode") — a faithful port of
 * Mark Adler's public-domain `blast.c`, which is the canonical decoder for the DCL/pklib streams that
 * the original WoW 3.3.5a data MPQs use (compression mask 0x08 and the MPQ_FILE_IMPLODE flag).
 *
 * Pure + dependency-free. The MPQ block table always provides the exact decompressed size, so the
 * decode is driven by that size (it also honours the in-stream end-of-data marker).
 */

const MAXBITS = 13;

// Bit-length tables (run-length encoded: high nibble = repeat-1, low nibble = code length), from blast.c.
const LITERAL_LENGTHS = [
  11, 124, 8, 7, 28, 7, 188, 13, 76, 4, 10, 8, 12, 10, 12, 10, 8, 23, 8, 9, 7, 6, 7, 8, 7, 6, 55, 8, 23, 24, 12, 11, 7, 9, 11, 12, 6, 7, 22,
  5, 7, 24, 6, 11, 9, 6, 7, 22, 7, 11, 38, 7, 9, 8, 25, 11, 8, 11, 9, 12, 8, 12, 5, 38, 5, 38, 5, 11, 7, 5, 6, 21, 6, 10, 53, 8, 7, 24, 10,
  27, 44, 253, 253, 253, 252, 252, 252, 13, 12, 45, 12, 45, 12, 61, 12, 45, 44, 173,
];
const LENGTH_LENGTHS = [2, 35, 36, 53, 38, 23];
const DISTANCE_LENGTHS = [2, 20, 53, 230, 247, 151, 248];

const LENGTH_BASE = [3, 2, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 40, 72, 136, 264];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];

const END_OF_STREAM = 519;

interface Huffman {
  count: number[];
  symbol: number[];
}

/** Build a canonical Huffman table from a run-length-encoded bit-length list. */
function construct(rep: number[]): Huffman {
  const length: number[] = [];
  let symbol = 0;
  for (const r of rep) {
    let repeat = (r >> 4) + 1;
    const len = r & 15;
    while (repeat-- > 0) {
      length[symbol++] = len;
    }
  }
  const n = symbol;

  const count = new Array<number>(MAXBITS + 1).fill(0);
  for (let s = 0; s < n; s++) {
    count[length[s]]++;
  }

  const offs = new Array<number>(MAXBITS + 2).fill(0);
  for (let len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }

  const table = new Array<number>(n).fill(0);
  for (let s = 0; s < n; s++) {
    if (length[s] !== 0) {
      table[offs[length[s]]++] = s;
    }
  }
  return { count, symbol: table };
}

const litcode = construct(LITERAL_LENGTHS);
const lencode = construct(LENGTH_LENGTHS);
const distcode = construct(DISTANCE_LENGTHS);

/* istanbul ignore next -- the 2-byte-match case uses a 2-bit distance; faithful to blast.c, but no DCL fixture exercises it */
function distanceExtraBits(matchLen: number, dictBits: number): number {
  return matchLen === 2 ? 2 : dictBits;
}

/**
 * Decompress a PKWARE DCL stream into exactly `outputSize` bytes.
 *
 * @param input the imploded stream (begins with the 2-byte header: literal-mode + dictionary-size).
 * @param outputSize the decompressed length, as recorded in the MPQ block table.
 */
export function explode(input: Uint8Array, outputSize: number): Uint8Array {
  const lit = input[0];
  const dictBits = input[1];
  if (lit > 1) {
    throw new Error(`Invalid PKWARE literal mode: ${lit}`);
  }
  if (dictBits < 4 || dictBits > 6) {
    throw new Error(`Invalid PKWARE dictionary size: ${dictBits}`);
  }

  let pos = 2;
  let bitbuf = 0;
  let bitcnt = 0;

  const nextByte = (): number => {
    if (pos >= input.length) {
      throw new Error('PKWARE stream truncated');
    }
    return input[pos++];
  };

  const readBits = (need: number): number => {
    let val = bitbuf;
    while (bitcnt < need) {
      val |= nextByte() << bitcnt;
      bitcnt += 8;
    }
    bitbuf = val >>> need;
    bitcnt -= need;
    return val & ((1 << need) - 1);
  };

  // Decode one symbol, reading the bit-reversed canonical code (port of blast.c's `decode`).
  const decode = (h: Huffman): number => {
    let len = 1;
    let code = 0;
    let first = 0;
    let index = 0;
    let local = bitbuf;
    let left = bitcnt;
    let nextIdx = 1;
    // The literal/length/distance codes are complete (Kraft sum = 1), so every bit pattern resolves
    // within MAXBITS bits and this loop always returns; an over-long code would only arise from a
    // corrupt stream, in which case `nextByte` eventually reports the truncation.
    for (;;) {
      while (left > 0) {
        left--;
        code |= (local & 1) ^ 1;
        local >>>= 1;
        const count = h.count[nextIdx++];
        if (code < first + count) {
          bitbuf = local;
          bitcnt = (bitcnt - len) & 7;
          return h.symbol[index + (code - first)];
        }
        index += count;
        first += count;
        first <<= 1;
        code <<= 1;
        len++;
      }
      left = MAXBITS + 1 - len;
      local = nextByte();
      if (left > 8) {
        left = 8;
      }
    }
  };

  /* istanbul ignore next -- ASCII (coded-literal) mode is unused by Blizzard MPQs (always binary, lit === 0) */
  const readLiteral = (): number => (lit ? decode(litcode) : readBits(8));

  const out = new Uint8Array(outputSize);
  let outPos = 0;
  while (outPos < outputSize) {
    if (readBits(1)) {
      const lengthSymbol = decode(lencode);
      const len = LENGTH_BASE[lengthSymbol] + readBits(LENGTH_EXTRA[lengthSymbol]);
      if (len === END_OF_STREAM) {
        break;
      }
      const distExtra = distanceExtraBits(len, dictBits);
      const dist = (decode(distcode) << distExtra) + readBits(distExtra) + 1;
      for (let k = 0; k < len && outPos < outputSize; k++) {
        out[outPos] = out[outPos - dist];
        outPos++;
      }
    } else {
      out[outPos++] = readLiteral();
    }
  }
  return out;
}
