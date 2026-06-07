import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfigService } from '@keira/shared/common-services';
import { instance, mock } from 'ts-mockito';

import { MysqlService } from './mysql.service';
import { RealmEnvironment } from './realm-environment';
import { RetroportDbalService } from './retroport-dbal.service';

describe('RetroportDbalService', () => {
  let service: RetroportDbalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        // MysqlQueryService is providedIn root; it only needs these collaborators to construct.
        { provide: MysqlService, useValue: instance(mock(MysqlService)) },
        { provide: ConfigService, useValue: instance(mock(ConfigService)) },
        RetroportDbalService,
      ],
    });
    service = TestBed.inject(RetroportDbalService);
  });

  const countOccurrences = (haystack: string, needle: RegExp): number => (haystack.match(needle) ?? []).length;

  describe('buildItemTemplate', () => {
    it('targets acore_world for LIVE and qualifies BOTH the DELETE and INSERT', () => {
      const sql = service.buildItemTemplate(
        { displayId: 80023, itemEntry: 56001, itemName: 'Artifact', itemClass: 4, itemSubclass: 0, inventoryType: 21 },
        RealmEnvironment.LIVE,
      );

      expect(sql).toContain('DELETE FROM `acore_world`.`item_template`');
      expect(sql).toContain('INSERT INTO `acore_world`.`item_template`');
      expect(countOccurrences(sql, /`acore_world`\.`item_template`/g)).toBe(2);
      expect(sql).toContain('56001');
      expect(sql).toContain('80023');
    });

    it('targets acoreptr_world for PTR', () => {
      const sql = service.buildItemTemplate({ displayId: 1 }, RealmEnvironment.PTR);
      expect(sql).toContain('`acoreptr_world`.`item_template`');
    });

    it('falls back to the custom starting id and empty name when item fields are omitted', () => {
      const sql = service.buildItemTemplate({ displayId: 5 }, RealmEnvironment.LIVE);
      expect(sql).toContain('90000'); // ITEM_TEMPLATE_CUSTOM_STARTING_ID
    });
  });

  describe('insertShapeshiftModel', () => {
    it('targets the acore_world DB for LIVE and qualifies BOTH statements', () => {
      const sql = service.insertShapeshiftModel(
        { displayId: 80040, shapeshiftId: 115, raceId: 0, customizationId: 255, genderId: 2 },
        RealmEnvironment.LIVE,
      );

      expect(sql).toContain('`acore_world`.`player_shapeshift_model`');
      expect(countOccurrences(sql, /`acore_world`\.`player_shapeshift_model`/g)).toBe(2);
      expect(sql).toContain('80040');
      expect(sql).toContain('115');
    });

    it('targets acoreptr_world for PTR and defaults the optional shapeshift fields', () => {
      const sql = service.insertShapeshiftModel({ displayId: 7 }, RealmEnvironment.PTR);
      expect(sql).toContain('`acoreptr_world`.`player_shapeshift_model`');
      expect(sql).toContain('7');
    });
  });
});
