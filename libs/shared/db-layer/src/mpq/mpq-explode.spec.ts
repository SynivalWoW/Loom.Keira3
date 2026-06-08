import { explode } from './mpq-explode';

const dec = (data: Uint8Array): string => new TextDecoder().decode(data);

// Mark Adler's canonical blast.c reference vector: this DCL/pklib stream decodes to "AIAIAIAIAIAIA".
const REFERENCE = Uint8Array.from([0x00, 0x04, 0x82, 0x24, 0x25, 0x8f, 0x80, 0x7f]);
const REFERENCE_TEXT = 'AIAIAIAIAIAIA';

describe('mpq-explode', () => {
  it('decompresses the PKWARE DCL reference stream', () => {
    expect(dec(explode(REFERENCE, REFERENCE_TEXT.length))).toBe(REFERENCE_TEXT);
  });

  it('stops at the in-stream end marker when more output is requested than exists', () => {
    // Asking for more than the stream holds exercises the end-of-stream (519) break; the tail stays zero.
    const result = explode(REFERENCE, 64);
    expect(dec(result.subarray(0, REFERENCE_TEXT.length))).toBe(REFERENCE_TEXT);
    expect(result.length).toBe(64);
    expect(result[REFERENCE_TEXT.length]).toBe(0);
  });

  it('rejects an invalid literal mode', () => {
    expect(() => explode(Uint8Array.from([0x02, 0x04]), 10)).toThrow(/Invalid PKWARE literal mode/);
  });

  it('rejects a dictionary size below the valid range', () => {
    expect(() => explode(Uint8Array.from([0x00, 0x03]), 10)).toThrow(/Invalid PKWARE dictionary size/);
  });

  it('rejects a dictionary size above the valid range', () => {
    expect(() => explode(Uint8Array.from([0x00, 0x07]), 10)).toThrow(/Invalid PKWARE dictionary size/);
  });

  it('throws when the stream is truncated before producing the requested output', () => {
    // A valid header but no token bytes, while demanding output, runs the bit reader off the end.
    expect(() => explode(REFERENCE.subarray(0, 3), 64)).toThrow(/PKWARE stream truncated/);
  });
});
