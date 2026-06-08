import { decryptBlock, encryptBlock, hashString, MpqHashType } from './mpq-crypto';

/**
 * Pure MPQ v1 archive reader/writer (the format WotLK 3.3.5a patch archives use). Operates on plain
 * byte buffers and round-trips, so it is fully unit-testable; the filesystem + zlib wiring lives in
 * `MpqArchiveService`.
 *
 * Supported on read: single-unit and multi-sector files, stored (uncompressed) or zlib-compressed.
 * Files are written as multi-sector zlib (matching what real archives look like). Encrypted files
 * and non-zlib compression (PKWARE implode, bzip2, …) are reported with a descriptive error rather
 * than silently mis-decoded — DBCs, the use case here, are neither encrypted nor implode-compressed.
 */

const MPQ_HEADER_SIGNATURE = 0x1a51504d; // 'MPQ\x1A' read as a little-endian uint32
const HEADER_SIZE = 32;
const HEADER_SEARCH_STRIDE = 0x200;
const ENTRY_SIZE = 16;

export const MPQ_FLAG_COMPRESS = 0x00000200;
export const MPQ_FLAG_ENCRYPTED = 0x00010000;
export const MPQ_FLAG_SINGLE_UNIT = 0x01000000;
export const MPQ_FLAG_EXISTS = 0x80000000;

export const MPQ_COMPRESSION_ZLIB = 0x02;

const FLAG_COMPRESS = MPQ_FLAG_COMPRESS;
const FLAG_ENCRYPTED = MPQ_FLAG_ENCRYPTED;
const FLAG_SINGLE_UNIT = MPQ_FLAG_SINGLE_UNIT;
const FLAG_EXISTS = MPQ_FLAG_EXISTS;
const COMPRESSION_ZLIB = MPQ_COMPRESSION_ZLIB;

const HASH_ENTRY_EMPTY = 0xffffffff;

const DEFAULT_SECTOR_SHIFT = 3; // sector size = 512 << 3 = 4096
const LISTFILE_NAME = '(listfile)';

export interface Compressor {
  deflate(data: Uint8Array): Uint8Array;
  inflate(data: Uint8Array): Uint8Array;
}

export interface MpqHeader {
  archiveSize: number;
  formatVersion: number;
  sectorSizeShift: number;
  hashTablePos: number;
  blockTablePos: number;
  hashTableCount: number;
  blockTableCount: number;
}

export interface HashEntry {
  name1: number;
  name2: number;
  locale: number;
  platform: number;
  blockIndex: number;
}

export interface BlockEntry {
  filePos: number;
  compressedSize: number;
  fileSize: number;
  flags: number;
}

export interface MpqArchive {
  headerOffset: number;
  header: MpqHeader;
  hashTable: HashEntry[];
  blockTable: BlockEntry[];
}

export interface MpqInputFile {
  name: string;
  data: Uint8Array;
}

function normalizeName(name: string): string {
  return name.replace(/\//g, '\\');
}

function readDwords(view: DataView, byteOffset: number, count: number): Uint32Array {
  const out = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = view.getUint32(byteOffset + i * 4, true);
  }
  return out;
}

function writeDwords(view: DataView, byteOffset: number, data: Uint32Array): void {
  for (let i = 0; i < data.length; i++) {
    view.setUint32(byteOffset + i * 4, data[i], true);
  }
}

function findHeaderOffset(view: DataView, length: number): number {
  for (let offset = 0; offset + HEADER_SIZE <= length; offset += HEADER_SEARCH_STRIDE) {
    if (view.getUint32(offset, true) === MPQ_HEADER_SIGNATURE) {
      return offset;
    }
  }
  throw new Error('Not an MPQ archive (header signature not found)');
}

export function parseArchive(buffer: Uint8Array): MpqArchive {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const headerOffset = findHeaderOffset(view, buffer.length);

  const header: MpqHeader = {
    archiveSize: view.getUint32(headerOffset + 0x08, true),
    formatVersion: view.getUint16(headerOffset + 0x0c, true),
    sectorSizeShift: view.getUint16(headerOffset + 0x0e, true),
    hashTablePos: view.getUint32(headerOffset + 0x10, true),
    blockTablePos: view.getUint32(headerOffset + 0x14, true),
    hashTableCount: view.getUint32(headerOffset + 0x18, true),
    blockTableCount: view.getUint32(headerOffset + 0x1c, true),
  };

  const hashRaw = readDwords(view, headerOffset + header.hashTablePos, header.hashTableCount * 4);
  decryptBlock(hashRaw, hashString('(hash table)', MpqHashType.FileKey));
  const hashTable: HashEntry[] = [];
  for (let i = 0; i < header.hashTableCount; i++) {
    const b = i * 4;
    hashTable.push({
      name1: hashRaw[b],
      name2: hashRaw[b + 1],
      locale: hashRaw[b + 2] & 0xffff,
      platform: (hashRaw[b + 2] >>> 16) & 0xffff,
      blockIndex: hashRaw[b + 3],
    });
  }

  const blockRaw = readDwords(view, headerOffset + header.blockTablePos, header.blockTableCount * 4);
  decryptBlock(blockRaw, hashString('(block table)', MpqHashType.FileKey));
  const blockTable: BlockEntry[] = [];
  for (let i = 0; i < header.blockTableCount; i++) {
    const b = i * 4;
    blockTable.push({ filePos: blockRaw[b], compressedSize: blockRaw[b + 1], fileSize: blockRaw[b + 2], flags: blockRaw[b + 3] });
  }

  return { headerOffset, header, hashTable, blockTable };
}

function findHashEntry(archive: MpqArchive, fileName: string): HashEntry | undefined {
  const { hashTable } = archive;
  const size = hashTable.length;
  const start = hashString(fileName, MpqHashType.TableOffset) & (size - 1);
  const nameA = hashString(fileName, MpqHashType.NameA);
  const nameB = hashString(fileName, MpqHashType.NameB);
  for (let i = 0; i < size; i++) {
    const entry = hashTable[(start + i) & (size - 1)];
    if (entry.blockIndex === HASH_ENTRY_EMPTY) {
      return undefined;
    }
    if (entry.name1 === nameA && entry.name2 === nameB) {
      return entry;
    }
  }
  /* istanbul ignore next -- created archives always keep a free slot, so the EMPTY stop hits first */
  return undefined;
}

function inflateMasked(payload: Uint8Array, compressor: Compressor): Uint8Array {
  const mask = payload[0];
  if (mask === COMPRESSION_ZLIB) {
    return compressor.inflate(payload.subarray(1));
  }
  throw new Error(`Unsupported MPQ compression mask 0x${mask.toString(16)}`);
}

function readFileData(buffer: Uint8Array, archive: MpqArchive, block: BlockEntry, compressor: Compressor): Uint8Array {
  if ((block.flags & FLAG_ENCRYPTED) !== 0) {
    throw new Error('Encrypted MPQ files are not supported');
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const dataStart = archive.headerOffset + block.filePos;

  if ((block.flags & FLAG_SINGLE_UNIT) !== 0) {
    const raw = buffer.subarray(dataStart, dataStart + block.compressedSize);
    if (block.compressedSize < block.fileSize) {
      if ((block.flags & FLAG_COMPRESS) !== 0) {
        return inflateMasked(raw, compressor);
      }
      throw new Error('Unsupported MPQ compression: PKWARE implode');
    }
    return raw.subarray(0, block.fileSize);
  }

  const sectorSize = 512 << archive.header.sectorSizeShift;
  const sectorCount = Math.max(1, Math.ceil(block.fileSize / sectorSize));
  const offsets = readDwords(view, dataStart, sectorCount + 1);
  const out = new Uint8Array(block.fileSize);
  let written = 0;
  for (let i = 0; i < sectorCount; i++) {
    const raw = buffer.subarray(dataStart + offsets[i], dataStart + offsets[i + 1]);
    const expected = Math.min(sectorSize, block.fileSize - i * sectorSize);
    const sector = raw.length >= expected ? raw.subarray(0, expected) : inflateMasked(raw, compressor);
    out.set(sector.subarray(0, expected), written);
    written += expected;
  }
  return out;
}

export function extractFile(buffer: Uint8Array, fileName: string, compressor: Compressor): Uint8Array {
  const archive = parseArchive(buffer);
  const hashEntry = findHashEntry(archive, fileName);
  const block = hashEntry && archive.blockTable[hashEntry.blockIndex];
  if (!block) {
    throw new Error(`File not found in MPQ: ${fileName}`);
  }
  return readFileData(buffer, archive, block, compressor);
}

export function listFiles(buffer: Uint8Array, compressor: Compressor): string[] {
  const text = new TextDecoder().decode(extractFile(buffer, LISTFILE_NAME, compressor));
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function safeListFiles(buffer: Uint8Array, compressor: Compressor): string[] {
  try {
    return listFiles(buffer, compressor);
  } catch {
    return [];
  }
}

/** Build a multi-sector, zlib-compressed file payload (sector offset table + per-sector data). */
function buildSectoredPayload(data: Uint8Array, sectorSize: number, compressor: Compressor): { bytes: Uint8Array; flags: number } {
  const sectorCount = Math.max(1, Math.ceil(data.length / sectorSize));
  const sectors: Uint8Array[] = [];
  for (let i = 0; i < sectorCount; i++) {
    const chunk = data.subarray(i * sectorSize, Math.min((i + 1) * sectorSize, data.length));
    const deflated = compressor.deflate(chunk);
    if (deflated.length + 1 < chunk.length) {
      const sector = new Uint8Array(deflated.length + 1);
      sector[0] = COMPRESSION_ZLIB;
      sector.set(deflated, 1);
      sectors.push(sector);
    } else {
      sectors.push(chunk.slice());
    }
  }

  const tableBytes = (sectorCount + 1) * 4;
  const total = sectors.reduce((sum, sector) => sum + sector.length, tableBytes);
  const bytes = new Uint8Array(total);
  const view = new DataView(bytes.buffer);
  let offset = tableBytes;
  view.setUint32(0, tableBytes, true);
  for (let i = 0; i < sectorCount; i++) {
    bytes.set(sectors[i], offset);
    offset += sectors[i].length;
    view.setUint32((i + 1) * 4, offset, true);
  }
  return { bytes, flags: FLAG_EXISTS | FLAG_COMPRESS };
}

/** A file already laid out as its in-archive payload (low-level; used by the writer and tests). */
export interface MpqBuiltFile {
  name: string;
  bytes: Uint8Array;
  flags: number;
  fileSize: number;
}

type BuiltFile = MpqBuiltFile;

/** Smallest power of two strictly greater than `count` (min 4), so a fresh table always has a free slot. */
function hashTableCapacity(count: number): number {
  let size = 4;
  while (size <= count) {
    size <<= 1;
  }
  return size;
}

function placeHashEntry(hashTable: HashEntry[], fileName: string, blockIndex: number): boolean {
  const size = hashTable.length;
  const start = hashString(fileName, MpqHashType.TableOffset) & (size - 1);
  const nameA = hashString(fileName, MpqHashType.NameA);
  const nameB = hashString(fileName, MpqHashType.NameB);
  for (let i = 0; i < size; i++) {
    const idx = (start + i) & (size - 1);
    if (hashTable[idx].blockIndex === HASH_ENTRY_EMPTY) {
      hashTable[idx] = { name1: nameA, name2: nameB, locale: 0, platform: 0, blockIndex };
      return true;
    }
  }
  return false;
}

function emptyHashEntry(): HashEntry {
  return { name1: HASH_ENTRY_EMPTY, name2: HASH_ENTRY_EMPTY, locale: 0xffff, platform: 0xffff, blockIndex: HASH_ENTRY_EMPTY };
}

function serializeArchive(headerOffset: number, prefix: Uint8Array, files: BuiltFile[], hashCount: number): Uint8Array {
  const dataStart = headerOffset + HEADER_SIZE;
  const dataSize = files.reduce((sum, file) => sum + file.bytes.length, 0);
  const hashTablePos = dataStart + dataSize - headerOffset;
  const blockTablePos = hashTablePos + hashCount * ENTRY_SIZE;
  const totalSize = headerOffset + blockTablePos + files.length * ENTRY_SIZE;

  const out = new Uint8Array(totalSize);
  out.set(prefix.subarray(0, headerOffset), 0);
  const view = new DataView(out.buffer);

  view.setUint32(headerOffset + 0x00, MPQ_HEADER_SIGNATURE, true);
  view.setUint32(headerOffset + 0x04, HEADER_SIZE, true);
  view.setUint32(headerOffset + 0x08, totalSize - headerOffset, true);
  view.setUint16(headerOffset + 0x0c, 0, true);
  view.setUint16(headerOffset + 0x0e, DEFAULT_SECTOR_SHIFT, true);
  view.setUint32(headerOffset + 0x10, hashTablePos, true);
  view.setUint32(headerOffset + 0x14, blockTablePos, true);
  view.setUint32(headerOffset + 0x18, hashCount, true);
  view.setUint32(headerOffset + 0x1c, files.length, true);

  const hashTable: HashEntry[] = Array.from({ length: hashCount }, emptyHashEntry);
  const blockRaw = new Uint32Array(files.length * 4);
  let pos = dataStart;
  files.forEach((file, b) => {
    out.set(file.bytes, pos);
    placeHashEntry(hashTable, file.name, b);
    blockRaw[b * 4 + 0] = pos - headerOffset;
    blockRaw[b * 4 + 1] = file.bytes.length;
    blockRaw[b * 4 + 2] = file.fileSize;
    blockRaw[b * 4 + 3] = file.flags >>> 0;
    pos += file.bytes.length;
  });

  const hashRaw = new Uint32Array(hashCount * 4);
  hashTable.forEach((entry, i) => {
    hashRaw[i * 4 + 0] = entry.name1;
    hashRaw[i * 4 + 1] = entry.name2;
    hashRaw[i * 4 + 2] = ((entry.platform & 0xffff) << 16) | (entry.locale & 0xffff);
    hashRaw[i * 4 + 3] = entry.blockIndex;
  });
  encryptBlock(hashRaw, hashString('(hash table)', MpqHashType.FileKey));
  encryptBlock(blockRaw, hashString('(block table)', MpqHashType.FileKey));
  writeDwords(view, headerOffset + hashTablePos, hashRaw);
  writeDwords(view, headerOffset + blockTablePos, blockRaw);

  return out;
}

function buildFile(name: string, data: Uint8Array, compressor: Compressor): BuiltFile {
  const { bytes, flags } = buildSectoredPayload(data, 512 << DEFAULT_SECTOR_SHIFT, compressor);
  return { name: normalizeName(name), bytes, flags, fileSize: data.length };
}

/** Serialize pre-built file payloads into a complete archive (low-level entry point for tests). */
export function buildArchive(files: MpqBuiltFile[], headerOffset = 0, hashCount = hashTableCapacity(files.length)): Uint8Array {
  const prefix = new Uint8Array(headerOffset);
  return serializeArchive(headerOffset, prefix, files, hashCount);
}

/** Create a fresh archive from scratch, always emitting a `(listfile)`. */
export function createArchive(inputFiles: MpqInputFile[], compressor: Compressor): Uint8Array {
  const real = inputFiles.filter((file) => normalizeName(file.name).toLowerCase() !== LISTFILE_NAME);
  const listContent = new TextEncoder().encode(real.map((file) => normalizeName(file.name)).join('\r\n'));
  const all: MpqInputFile[] = [...real, { name: LISTFILE_NAME, data: listContent }];
  const built = all.map((file) => buildFile(file.name, file.data, compressor));
  return serializeArchive(0, new Uint8Array(0), built, hashTableCapacity(built.length));
}

/** Append `data` as a new/updated file, rewriting the hash + block tables (old data is left as dead space). */
function writeFileEntry(buffer: Uint8Array, fileName: string, data: Uint8Array, compressor: Compressor): Uint8Array {
  const archive = parseArchive(buffer);
  const built = buildFile(fileName, data, compressor);
  const headerOffset = archive.headerOffset;
  const newFilePos = buffer.length - headerOffset;

  const existing = findHashEntry(archive, fileName);
  let blockIndex: number;
  if (existing) {
    blockIndex = existing.blockIndex;
  } else {
    blockIndex = archive.blockTable.length;
    archive.blockTable.push({ filePos: 0, compressedSize: 0, fileSize: 0, flags: 0 });
    if (!placeHashEntry(archive.hashTable, fileName, blockIndex)) {
      throw new Error('MPQ hash table is full; cannot add a new file');
    }
  }
  archive.blockTable[blockIndex] = {
    filePos: newFilePos,
    compressedSize: built.bytes.length,
    fileSize: built.fileSize,
    flags: built.flags,
  };

  const hashCount = archive.hashTable.length;
  const payloadAbs = buffer.length;
  const hashTableAbs = payloadAbs + built.bytes.length;
  const blockTableAbs = hashTableAbs + hashCount * ENTRY_SIZE;
  const totalSize = blockTableAbs + archive.blockTable.length * ENTRY_SIZE;

  const out = new Uint8Array(totalSize);
  out.set(buffer, 0);
  out.set(built.bytes, payloadAbs);
  const view = new DataView(out.buffer);

  view.setUint32(headerOffset + 0x08, totalSize - headerOffset, true);
  view.setUint32(headerOffset + 0x10, hashTableAbs - headerOffset, true);
  view.setUint32(headerOffset + 0x14, blockTableAbs - headerOffset, true);
  view.setUint32(headerOffset + 0x18, hashCount, true);
  view.setUint32(headerOffset + 0x1c, archive.blockTable.length, true);

  const hashRaw = new Uint32Array(hashCount * 4);
  archive.hashTable.forEach((entry, i) => {
    hashRaw[i * 4 + 0] = entry.name1;
    hashRaw[i * 4 + 1] = entry.name2;
    hashRaw[i * 4 + 2] = ((entry.platform & 0xffff) << 16) | (entry.locale & 0xffff);
    hashRaw[i * 4 + 3] = entry.blockIndex;
  });
  encryptBlock(hashRaw, hashString('(hash table)', MpqHashType.FileKey));
  writeDwords(view, hashTableAbs, hashRaw);

  const blockRaw = new Uint32Array(archive.blockTable.length * 4);
  archive.blockTable.forEach((entry, i) => {
    blockRaw[i * 4 + 0] = entry.filePos;
    blockRaw[i * 4 + 1] = entry.compressedSize;
    blockRaw[i * 4 + 2] = entry.fileSize;
    blockRaw[i * 4 + 3] = entry.flags >>> 0;
  });
  encryptBlock(blockRaw, hashString('(block table)', MpqHashType.FileKey));
  writeDwords(view, blockTableAbs, blockRaw);

  return out;
}

/** Add or replace a single file inside an existing archive, keeping the `(listfile)` in sync. */
export function addOrReplaceFile(buffer: Uint8Array, fileName: string, data: Uint8Array, compressor: Compressor): Uint8Array {
  const written = writeFileEntry(buffer, fileName, data, compressor);
  if (normalizeName(fileName).toLowerCase() === LISTFILE_NAME) {
    return written;
  }
  const names = new Set(safeListFiles(written, compressor));
  names.add(normalizeName(fileName));
  const listContent = new TextEncoder().encode([...names].join('\r\n'));
  return writeFileEntry(written, LISTFILE_NAME, listContent, compressor);
}
