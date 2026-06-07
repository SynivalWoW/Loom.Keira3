import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ElectronService } from '@keira/shared/common-services';
import { vi } from 'vitest';

import { DbcReaderService } from './dbc-reader.service';
import { DisplayIdValidatorService } from './display-id-validator.service';

/** Build a minimal WDBC buffer with the given record ids in field 0. */
function buildWdbc(ids: number[]): Uint8Array {
  const recordSize = 4;
  const buffer = new Uint8Array(20 + ids.length * recordSize + 1);
  buffer.set([0x57, 0x44, 0x42, 0x43], 0); // 'WDBC'
  const view = new DataView(buffer.buffer);
  view.setUint32(4, ids.length, true);
  view.setUint32(8, 1, true);
  view.setUint32(12, recordSize, true);
  view.setUint32(16, 1, true);
  ids.forEach((id, i) => view.setUint32(20 + i * recordSize, id, true));
  return buffer;
}

describe('DisplayIdValidatorService', () => {
  const fs = { readFileSync: vi.fn() };
  const isElectron = vi.fn<() => unknown>();
  let service: DisplayIdValidatorService;

  beforeEach(() => {
    fs.readFileSync.mockReset();
    isElectron.mockReset().mockReturnValue('renderer');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ElectronService, useValue: { isElectron, fs } },
        DbcReaderService,
        DisplayIdValidatorService,
      ],
    });
    service = TestBed.inject(DisplayIdValidatorService);
    service.creatureDisplayInfoDbcPath.set('/patch/CreatureDisplayInfo.dbc');
  });

  it('returns "present" when the DisplayID is in the dbc', () => {
    fs.readFileSync.mockReturnValue(buildWdbc([80042, 80043]));
    expect(service.validate(80043)).toBe('present');
  });

  it('returns "orphaned" when the DisplayID is missing from the dbc', () => {
    fs.readFileSync.mockReturnValue(buildWdbc([80042, 80043]));
    expect(service.validate(99999)).toBe('orphaned');
  });

  it('returns "unvalidated" when no dbc path is set', () => {
    service.creatureDisplayInfoDbcPath.set('');
    expect(service.validate(80042)).toBe('unvalidated');
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  it('returns "unvalidated" when not running under Electron', () => {
    isElectron.mockReturnValue(undefined);
    expect(service.validate(80042)).toBe('unvalidated');
  });

  it('returns "unvalidated" when the dbc cannot be read', () => {
    fs.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(service.validate(80042)).toBe('unvalidated');
  });
});
