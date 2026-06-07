import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ElectronService } from '@keira/shared/common-services';
import { vi } from 'vitest';

import { DbcReaderService } from './dbc-reader.service';

/** Build a minimal WDBC byte buffer with the given record ids in field 0. */
function buildWdbc(recordCount: number, fieldCount: number, recordSize: number, ids: number[] = []): Uint8Array {
  const stringBlockSize = 1;
  const buffer = new Uint8Array(20 + recordCount * recordSize + stringBlockSize);
  buffer.set([0x57, 0x44, 0x42, 0x43], 0); // 'WDBC'
  const view = new DataView(buffer.buffer);
  view.setUint32(4, recordCount, true);
  view.setUint32(8, fieldCount, true);
  view.setUint32(12, recordSize, true);
  view.setUint32(16, stringBlockSize, true);
  ids.forEach((id, index) => view.setUint32(20 + index * recordSize, id, true));
  return buffer;
}

describe('DbcReaderService', () => {
  let service: DbcReaderService;
  const fsMock = { readFileSync: vi.fn() };

  beforeEach(() => {
    fsMock.readFileSync.mockReset();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ElectronService, useValue: { fs: fsMock } }, DbcReaderService],
    });
    service = TestBed.inject(DbcReaderService);
  });

  it('parses a valid WDBC header', () => {
    const header = service.parseHeader(buildWdbc(2, 4, 16, [10, 20]));
    expect(header.magic).toBe('WDBC');
    expect(header.recordCount).toBe(2);
    expect(header.fieldCount).toBe(4);
    expect(header.recordSize).toBe(16);
    expect(header.stringBlockSize).toBe(1);
  });

  it('throws on an invalid magic', () => {
    const buffer = buildWdbc(0, 0, 0);
    buffer[0] = 0x58; // 'X'
    expect(() => service.parseHeader(buffer)).toThrow(/Invalid DBC magic/);
  });

  it('finds an existing record id', () => {
    expect(service.hasRecordId(buildWdbc(2, 1, 4, [10, 20]), 20)).toBe(true);
  });

  it('returns false for a missing id', () => {
    expect(service.hasRecordId(buildWdbc(2, 1, 4, [10, 20]), 99)).toBe(false);
  });

  it('returns false for an empty dbc', () => {
    expect(service.hasRecordId(buildWdbc(0, 1, 4, []), 1)).toBe(false);
  });

  it('reads a header from the filesystem through ElectronService', () => {
    const buffer = buildWdbc(1, 1, 4, [7]);
    fsMock.readFileSync.mockReturnValue(buffer);
    const header = service.readHeader('/patch/CreatureDisplayInfo.dbc');
    expect(fsMock.readFileSync).toHaveBeenCalledWith('/patch/CreatureDisplayInfo.dbc');
    expect(header.recordCount).toBe(1);
  });
});
