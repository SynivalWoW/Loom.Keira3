import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ElectronService } from '@keira/shared/common-services';
import { vi } from 'vitest';

import { DbcFileService } from './dbc-file.service';
import { MpqArchiveService } from './mpq-archive.service';

describe('DbcFileService', () => {
  let service: DbcFileService;
  const fs = { readFileSync: vi.fn(), writeFileSync: vi.fn() };
  const mpq = { read: vi.fn(), write: vi.fn() };

  beforeEach(() => {
    fs.readFileSync.mockReset();
    fs.writeFileSync.mockReset();
    mpq.read.mockReset();
    mpq.write.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ElectronService, useValue: { fs } },
        { provide: MpqArchiveService, useValue: mpq },
        DbcFileService,
      ],
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

  it('round-trips a table with a localized (loc) field', () => {
    const rows = [{ ID: 1, Name_Lang_1: 'Cat Form', Name_Lang_flags: 16776959 }];
    const parsed = service.parse(service.serialize('SpellShapeshiftForm', rows), 'SpellShapeshiftForm');
    expect(parsed.fields.length).toBe(35);
    expect(parsed.rows[0]['Name_Lang_1']).toBe('Cat Form');
    expect(parsed.rows[0]['Name_Lang_flags']).toBe(16776959);
    expect(parsed.rows[0]['Name_Lang_2']).toBe(''); // other locales empty
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

  it('round-trips a Spell.dbc row (int / float / array / loc columns)', () => {
    const rows = [
      {
        ID: 80042,
        Name_Lang_1: 'Solar Flare',
        Description_Lang_1: 'Burns the target.',
        Speed: 25.5,
        EffectBasePoints_1: 1234,
        Effect_1: 2,
        SpellIconID: 555,
      },
    ];
    const parsed = service.parse(service.serialize('Spell', rows), 'Spell');

    expect(parsed.fields.length).toBe(234);
    expect(parsed.rows[0]['ID']).toBe(80042);
    expect(parsed.rows[0]['Name_Lang_1']).toBe('Solar Flare');
    expect(parsed.rows[0]['Description_Lang_1']).toBe('Burns the target.');
    expect(parsed.rows[0]['Speed']).toBeCloseTo(25.5);
    expect(parsed.rows[0]['EffectBasePoints_1']).toBe(1234);
    expect(parsed.rows[0]['SpellIconID']).toBe(555);
    expect(parsed.rows[0]['Name_Lang_2']).toBe(''); // untouched locale defaults to empty
  });

  it('readFromMpq() parses a dbc extracted from an archive', () => {
    mpq.read.mockReturnValue(service.serialize('CreatureModelData', [{ ID: 42, ModelName: 'cat.m2' }]));
    const parsed = service.readFromMpq('/patch.mpq', 'DBFilesClient\\CreatureModelData.dbc', 'CreatureModelData');

    expect(mpq.read).toHaveBeenCalledWith('/patch.mpq', 'DBFilesClient\\CreatureModelData.dbc');
    expect(parsed.rows[0]['ID']).toBe(42);
    expect(parsed.rows[0]['ModelName']).toBe('cat.m2');
  });

  it('writeToMpq() serializes rows back into the archive', () => {
    service.writeToMpq('/patch.mpq', 'DBFilesClient\\CreatureModelData.dbc', 'CreatureModelData', [{ ID: 11 }]);

    expect(mpq.write).toHaveBeenCalledTimes(1);
    const [archivePath, fileName, data] = mpq.write.mock.calls[0];
    expect(archivePath).toBe('/patch.mpq');
    expect(fileName).toBe('DBFilesClient\\CreatureModelData.dbc');
    expect(service.parse(new Uint8Array(data), 'CreatureModelData').rows[0]['ID']).toBe(11);
  });
});
