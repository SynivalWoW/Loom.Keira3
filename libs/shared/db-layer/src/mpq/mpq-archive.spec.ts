import * as zlib from 'node:zlib';

import {
  addOrReplaceFile,
  buildArchive,
  Compressor,
  createArchive,
  extractFile,
  listFiles,
  MPQ_COMPRESSION_PKWARE,
  MPQ_COMPRESSION_ZLIB,
  MPQ_FLAG_COMPRESS,
  MPQ_FLAG_ENCRYPTED,
  MPQ_FLAG_EXISTS,
  MPQ_FLAG_IMPLODE,
  MPQ_FLAG_SINGLE_UNIT,
  MpqBuiltFile,
} from './mpq-archive';

const compressor: Compressor = {
  deflate: (data) => new Uint8Array(zlib.deflateSync(data)),
  inflate: (data) => new Uint8Array(zlib.inflateSync(data)),
};

const enc = (text: string): Uint8Array => new TextEncoder().encode(text);
const dec = (data: Uint8Array): string => new TextDecoder().decode(data);

// blast.c reference PKWARE DCL stream → "AIAIAIAIAIAIA" (used to exercise the implode read path).
const PKWARE_STREAM = Uint8Array.from([0x00, 0x04, 0x82, 0x24, 0x25, 0x8f, 0x80, 0x7f]);
const PKWARE_TEXT = 'AIAIAIAIAIAIA';

/** A buffer that the zlib pass cannot shrink, forcing the "stored sector" path. */
function incompressible(size: number): Uint8Array {
  const out = new Uint8Array(size);
  let x = 12345;
  for (let i = 0; i < size; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out[i] = x & 0xff;
  }
  return out;
}

describe('mpq-archive', () => {
  it('creates an archive and extracts the files back (multi-sector zlib + small file)', () => {
    const modelData = new Uint8Array(9000); // > one 4096-byte sector, compressible
    for (let i = 0; i < modelData.length; i++) {
      modelData[i] = (i * 7) & 0xff;
    }
    const archive = createArchive(
      [
        { name: 'DBFilesClient\\CreatureModelData.dbc', data: modelData },
        { name: 'DBFilesClient\\CreatureDisplayInfo.dbc', data: enc('display info') },
        { name: 'README.txt', data: enc('hello world') },
      ],
      compressor,
    );

    expect(extractFile(archive, 'DBFilesClient\\CreatureModelData.dbc', compressor)).toEqual(modelData);
    expect(dec(extractFile(archive, 'README.txt', compressor))).toBe('hello world');
    // forward slashes resolve to the same file
    expect(dec(extractFile(archive, 'DBFilesClient/CreatureDisplayInfo.dbc', compressor))).toBe('display info');
    expect(listFiles(archive, compressor).sort()).toEqual(
      ['DBFilesClient\\CreatureDisplayInfo.dbc', 'DBFilesClient\\CreatureModelData.dbc', 'README.txt'].sort(),
    );
  });

  it('regenerates the (listfile) even if one is supplied as input', () => {
    const archive = createArchive(
      [
        { name: 'x.txt', data: enc('x') },
        { name: '(listfile)', data: enc('garbage-should-be-ignored') },
      ],
      compressor,
    );
    expect(listFiles(archive, compressor)).toEqual(['x.txt']);
  });

  it('stores incompressible data as raw sectors and reads it back intact', () => {
    const data = incompressible(5000); // 2 sectors, neither shrinks
    const archive = createArchive([{ name: 'r.bin', data }], compressor);
    expect(extractFile(archive, 'r.bin', compressor)).toEqual(data);
  });

  it('replaces an existing file without disturbing the others', () => {
    let archive = createArchive(
      [
        { name: 'a.txt', data: enc('AAA') },
        { name: 'b.txt', data: enc('BBB') },
      ],
      compressor,
    );
    archive = addOrReplaceFile(archive, 'a.txt', enc('CHANGED'), compressor);

    expect(dec(extractFile(archive, 'a.txt', compressor))).toBe('CHANGED');
    expect(dec(extractFile(archive, 'b.txt', compressor))).toBe('BBB');
    expect(listFiles(archive, compressor).sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('adds a brand-new file and keeps the (listfile) in sync', () => {
    let archive = createArchive(
      [
        { name: 'a.txt', data: enc('AAA') },
        { name: 'b.txt', data: enc('BBB') },
      ],
      compressor,
    );
    archive = addOrReplaceFile(archive, 'c.txt', enc('CCC'), compressor);

    expect(dec(extractFile(archive, 'c.txt', compressor))).toBe('CCC');
    expect(listFiles(archive, compressor).sort()).toEqual(['a.txt', 'b.txt', 'c.txt']);
  });

  it('creates a (listfile) when adding to an archive that has none', () => {
    const noList = buildArchive([{ name: 'only.bin', bytes: enc('only'), flags: MPQ_FLAG_EXISTS | MPQ_FLAG_SINGLE_UNIT, fileSize: 4 }]);
    const archive = addOrReplaceFile(noList, 'new.bin', enc('newdata'), compressor);

    expect(dec(extractFile(archive, 'new.bin', compressor))).toBe('newdata');
    expect(listFiles(archive, compressor)).toEqual(['new.bin']);
  });

  it('writes the (listfile) directly without recursing', () => {
    let archive = createArchive([{ name: 'x.txt', data: enc('x') }], compressor);
    archive = addOrReplaceFile(archive, '(listfile)', enc('x.txt\r\n\r\ny.txt'), compressor);
    // blank middle line is trimmed away
    expect(listFiles(archive, compressor).sort()).toEqual(['x.txt', 'y.txt']);
  });

  it('throws when the requested file is absent', () => {
    const archive = createArchive([{ name: 'present.txt', data: enc('hi') }], compressor);
    expect(() => extractFile(archive, 'missing.txt', compressor)).toThrow(/File not found in MPQ: missing.txt/);
  });

  it('throws when the hash table has no free slot for a new file', () => {
    const file = (name: string, body: string): MpqBuiltFile => ({
      name,
      bytes: enc(body),
      flags: MPQ_FLAG_EXISTS | MPQ_FLAG_SINGLE_UNIT,
      fileSize: body.length,
    });
    const full = buildArchive([file('a', '1'), file('b', '2'), file('c', '3'), file('d', '4')], 0, 4);
    expect(() => addOrReplaceFile(full, 'e', enc('5'), compressor)).toThrow(/hash table is full/);
  });

  it('rejects a buffer that is not an MPQ archive', () => {
    expect(() => extractFile(new Uint8Array(64), 'anything', compressor)).toThrow(/Not an MPQ archive/);
  });

  it('finds the header when the archive is embedded at a non-zero offset', () => {
    const data = enc('embedded');
    const archive = buildArchive(
      [{ name: 'h.bin', bytes: data, flags: MPQ_FLAG_EXISTS | MPQ_FLAG_SINGLE_UNIT, fileSize: data.length }],
      0x200,
    );
    expect(dec(extractFile(archive, 'h.bin', compressor))).toBe('embedded');
  });

  it('reads a single-unit stored file', () => {
    const data = enc('stored single unit');
    const archive = buildArchive([{ name: 's.bin', bytes: data, flags: MPQ_FLAG_EXISTS | MPQ_FLAG_SINGLE_UNIT, fileSize: data.length }]);
    expect(dec(extractFile(archive, 's.bin', compressor))).toBe('stored single unit');
  });

  it('reads a single-unit zlib-compressed file', () => {
    const raw = enc('hello '.repeat(50));
    const deflated = new Uint8Array(zlib.deflateSync(raw));
    const bytes = new Uint8Array(deflated.length + 1);
    bytes[0] = MPQ_COMPRESSION_ZLIB;
    bytes.set(deflated, 1);
    const archive = buildArchive([
      { name: 'z.bin', bytes, flags: MPQ_FLAG_EXISTS | MPQ_FLAG_SINGLE_UNIT | MPQ_FLAG_COMPRESS, fileSize: raw.length },
    ]);
    const result = extractFile(archive, 'z.bin', compressor);
    expect(result.length).toBe(raw.length);
    expect([...result]).toEqual([...raw]);
  });

  it('reports an unsupported compression mask', () => {
    const archive = buildArchive([
      {
        name: 'u.bin',
        bytes: Uint8Array.from([0xff, 1, 2, 3]),
        flags: MPQ_FLAG_EXISTS | MPQ_FLAG_SINGLE_UNIT | MPQ_FLAG_COMPRESS,
        fileSize: 100,
      },
    ]);
    expect(() => extractFile(archive, 'u.bin', compressor)).toThrow(/Unsupported MPQ compression mask 0xff/);
  });

  it('reads a single-unit file compressed with the PKWARE implode flag', () => {
    // MPQ_FILE_IMPLODE: the whole file is a raw DCL stream, no per-sector mask byte.
    const archive = buildArchive([
      {
        name: 'i.bin',
        bytes: PKWARE_STREAM,
        flags: MPQ_FLAG_EXISTS | MPQ_FLAG_SINGLE_UNIT | MPQ_FLAG_IMPLODE,
        fileSize: PKWARE_TEXT.length,
      },
    ]);
    expect(dec(extractFile(archive, 'i.bin', compressor))).toBe(PKWARE_TEXT);
  });

  it('reads a sector compressed with the PKWARE (0x08) mask', () => {
    // MPQ_FILE_COMPRESS with a 0x08 mask byte ahead of the DCL stream.
    const bytes = new Uint8Array(PKWARE_STREAM.length + 1);
    bytes[0] = MPQ_COMPRESSION_PKWARE;
    bytes.set(PKWARE_STREAM, 1);
    const archive = buildArchive([
      { name: 'p.bin', bytes, flags: MPQ_FLAG_EXISTS | MPQ_FLAG_SINGLE_UNIT | MPQ_FLAG_COMPRESS, fileSize: PKWARE_TEXT.length },
    ]);
    expect(dec(extractFile(archive, 'p.bin', compressor))).toBe(PKWARE_TEXT);
  });

  it('rejects encrypted files', () => {
    const archive = buildArchive([
      {
        name: 'e.bin',
        bytes: Uint8Array.from([1, 2, 3, 4]),
        flags: MPQ_FLAG_EXISTS | MPQ_FLAG_SINGLE_UNIT | MPQ_FLAG_ENCRYPTED,
        fileSize: 4,
      },
    ]);
    expect(() => extractFile(archive, 'e.bin', compressor)).toThrow(/Encrypted MPQ files are not supported/);
  });
});
