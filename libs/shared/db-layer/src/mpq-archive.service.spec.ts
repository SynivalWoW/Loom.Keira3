import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ElectronService } from '@keira/shared/common-services';
import * as zlib from 'node:zlib';
import { vi } from 'vitest';

import { MpqArchiveService } from './mpq-archive.service';

describe('MpqArchiveService', () => {
  let service: MpqArchiveService;
  const files = new Map<string, Buffer>();
  const fs = {
    readFileSync: vi.fn((path: string) => {
      const data = files.get(path);
      if (!data) {
        throw new Error(`ENOENT: ${path}`);
      }
      return data;
    }),
    writeFileSync: vi.fn((path: string, data: Buffer) => {
      files.set(path, Buffer.from(data));
    }),
  };

  beforeEach(() => {
    files.clear();
    fs.readFileSync.mockClear();
    fs.writeFileSync.mockClear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ElectronService, useValue: { fs, zlib } }, MpqArchiveService],
    });
    service = TestBed.inject(MpqArchiveService);
  });

  // A large, compressible buffer so create() actually deflates and read() inflates (exercising both paths).
  const compressibleDbc = (seed: number): Uint8Array => {
    const data = new Uint8Array(9000);
    for (let i = 0; i < data.length; i++) {
      data[i] = (i * 7 + seed) & 0xff;
    }
    return data;
  };

  it('creates an archive on disk, lists it, reads a file, then writes a replacement back', () => {
    const original = compressibleDbc(0);
    service.create('/patch.mpq', [
      { name: 'DBFilesClient\\CreatureModelData.dbc', data: original },
      { name: 'notes.txt', data: new TextEncoder().encode('notes') },
    ]);
    expect(fs.writeFileSync).toHaveBeenCalledWith('/patch.mpq', expect.any(Buffer));

    expect(service.list('/patch.mpq').sort()).toEqual(['DBFilesClient\\CreatureModelData.dbc', 'notes.txt']);
    expect([...service.read('/patch.mpq', 'DBFilesClient\\CreatureModelData.dbc')]).toEqual([...original]);

    const replacement = compressibleDbc(99);
    service.write('/patch.mpq', 'DBFilesClient\\CreatureModelData.dbc', replacement);

    expect([...service.read('/patch.mpq', 'DBFilesClient\\CreatureModelData.dbc')]).toEqual([...replacement]);
    expect(new TextDecoder().decode(service.read('/patch.mpq', 'notes.txt'))).toBe('notes');
  });
});
