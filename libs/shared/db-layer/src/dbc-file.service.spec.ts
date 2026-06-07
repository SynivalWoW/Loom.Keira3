import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ElectronService } from '@keira/shared/common-services';
import { vi } from 'vitest';

import { DbcFileService } from './dbc-file.service';

describe('DbcFileService', () => {
  let service: DbcFileService;
  const fs = { readFileSync: vi.fn(), writeFileSync: vi.fn() };

  beforeEach(() => {
    fs.readFileSync.mockReset();
    fs.writeFileSync.mockReset();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: ElectronService, useValue: { fs } }, DbcFileService],
    });
    service = TestBed.inject(DbcFileService);
  });

  it('round-trips CreatureModelData (int/float/string columns)', () => {
    const rows = [{ ID: 80042, ModelName: 'Creature\\cat\\cat.m2', ModelScale: 1.0, CollisionWidth: 0.5 }];
    const parsed = service.parse(service.serialize('CreatureModelData', rows), 'CreatureModelData');

    expect(parsed.fields.length).toBe(28);
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0]['ID']).toBe(80042);
    expect(parsed.rows[0]['ModelName']).toBe('Creature\\cat\\cat.m2');
    expect(parsed.rows[0]['CollisionWidth']).toBeCloseTo(0.5);
    expect(parsed.rows[0]['Flags']).toBe(0); // unset -> default
  });

  it('expands CreatureDisplayInfo array columns on round-trip', () => {
    const rows = [{ ID: 1, ModelID: 2, TextureVariation_1: 'body', TextureVariation_2: 'eyes' }];
    const parsed = service.parse(service.serialize('CreatureDisplayInfo', rows), 'CreatureDisplayInfo');

    expect(parsed.fields.length).toBe(16);
    expect(parsed.rows[0]['ModelID']).toBe(2);
    expect(parsed.rows[0]['TextureVariation_1']).toBe('body');
    expect(parsed.rows[0]['TextureVariation_2']).toBe('eyes');
    expect(parsed.rows[0]['TextureVariation_3']).toBe('');
  });

  it('read() parses from the filesystem', () => {
    fs.readFileSync.mockReturnValue(service.serialize('CreatureModelData', [{ ID: 7, ModelName: 'x' }]));
    const parsed = service.read('/x.dbc', 'CreatureModelData');
    expect(parsed.rows[0]['ID']).toBe(7);
    expect(fs.readFileSync).toHaveBeenCalledWith('/x.dbc');
  });

  it('write() serializes to the filesystem', () => {
    service.write('/out.dbc', 'CreatureModelData', [{ ID: 9 }]);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync.mock.calls[0][0]).toBe('/out.dbc');
    // the written buffer round-trips back to the row
    const written = new Uint8Array(fs.writeFileSync.mock.calls[0][1]);
    expect(service.parse(written, 'CreatureModelData').rows[0]['ID']).toBe(9);
  });
});
