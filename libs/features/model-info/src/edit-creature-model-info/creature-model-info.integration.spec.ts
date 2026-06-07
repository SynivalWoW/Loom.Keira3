import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CreatureModelInfo } from '@keira/shared/acore-world-model';
import { MysqlQueryService, SqliteService } from '@keira/shared/db-layer';
import { EditorPageObject, TranslateTestingModule } from '@keira/shared/test-utils';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ToastrModule } from 'ngx-toastr';
import { of } from 'rxjs';
import { instance, mock } from 'ts-mockito';
import { CreatureModelInfoComponent } from './creature-model-info.component';
import { CreatureModelInfoHandlerService } from '../creature-model-info-handler.service';

describe('CreatureModelInfo integration tests', () => {
  class CreatureModelInfoPage extends EditorPageObject<CreatureModelInfoComponent> {}
  const id = 1;

  const expectedFullCreateQuery =
    'DELETE FROM `creature_model_info` WHERE (`DisplayID` = ' +
    id +
    ');\n' +
    'INSERT INTO `creature_model_info` (`DisplayID`, `BoundingRadius`, `CombatReach`, `Gender`, `DisplayID_Other_Gender`, `VerifiedBuild`) VALUES\n' +
    '(' +
    id +
    ', 0, 0, 0, 0, 0);\n';

  const originalEntity = new CreatureModelInfo();
  originalEntity.DisplayID = id;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ToastrModule.forRoot(), ModalModule.forRoot(), TranslateTestingModule],
      declarations: [],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        CreatureModelInfoHandlerService,
        { provide: SqliteService, useValue: instance(mock(SqliteService)) },
      ],
    }).compileComponents();
  });

  function setup(creatingNew: boolean) {
    const handlerService = TestBed.inject(CreatureModelInfoHandlerService);
    (handlerService as any)._selected = `${id}`;
    handlerService.isNew = creatingNew;

    const queryService = TestBed.inject(MysqlQueryService);
    const querySpy = vi.spyOn(queryService, 'query').mockReturnValue(of([]));
    vi.spyOn(queryService, 'selectAll').mockReturnValue(of(creatingNew ? [] : [originalEntity]));

    const fixture = TestBed.createComponent(CreatureModelInfoComponent);
    const page = new CreatureModelInfoPage(fixture);
    fixture.autoDetectChanges(true);
    fixture.detectChanges();
    return { page, querySpy, handlerService };
  }

  describe('Creating new', () => {
    it('should correctly initialise', () => {
      const { page } = setup(true);
      page.expectQuerySwitchToBeHidden();
      page.expectFullQueryToBeShown();
      page.expectFullQueryToContain(expectedFullCreateQuery);
    });

    it('should correctly update the unsaved status', () => {
      const { page, handlerService } = setup(true);
      expect(handlerService.isCreatureModelInfoUnsaved()).toBe(false);
      page.setInputValueById('Gender', 1);
      expect(handlerService.isCreatureModelInfoUnsaved()).toBe(true);
      page.setInputValueById('Gender', 0);
      expect(handlerService.isCreatureModelInfoUnsaved()).toBe(false);
    });

    it('changing a property and executing the query should correctly work', () => {
      const { page, querySpy } = setup(true);
      const expectedQuery =
        'DELETE FROM `creature_model_info` WHERE (`DisplayID` = 1);\n' +
        'INSERT INTO `creature_model_info` (`DisplayID`, `BoundingRadius`, `CombatReach`, `Gender`, `DisplayID_Other_Gender`, `VerifiedBuild`) VALUES\n' +
        '(1, 0, 0, 1, 0, 0);\n';
      querySpy.mockClear();

      page.setInputValueById('Gender', 1);
      page.expectFullQueryToContain(expectedQuery);

      page.clickExecuteQuery();
      expect(querySpy).toHaveBeenCalledTimes(1);
      expect(querySpy.mock.calls.at(-1)![0]).toContain(expectedQuery);
    });
  });

  describe('Editing existing', () => {
    it('should correctly initialise', () => {
      const { page } = setup(false);
      page.expectDiffQueryToBeShown();
      page.expectDiffQueryToBeEmpty();
      page.expectFullQueryToContain(expectedFullCreateQuery);
    });

    it('changing all properties and executing the query should correctly work', () => {
      const { page, querySpy } = setup(false);
      const expectedQuery =
        'UPDATE `creature_model_info` SET `BoundingRadius` = 1.5, `CombatReach` = 2.5, `Gender` = 1, ' +
        '`DisplayID_Other_Gender` = 100, `VerifiedBuild` = 12340 WHERE (`DisplayID` = 1);';
      querySpy.mockClear();

      page.setInputValueById('BoundingRadius', 1.5);
      page.setInputValueById('CombatReach', 2.5);
      page.setInputValueById('Gender', 1);
      page.setInputValueById('DisplayID_Other_Gender', 100);
      page.setInputValueById('VerifiedBuild', 12340);
      page.expectDiffQueryToContain(expectedQuery);

      page.clickExecuteQuery();
      expect(querySpy).toHaveBeenCalledTimes(1);
      expect(querySpy.mock.calls.at(-1)![0]).toContain(expectedQuery);
    });

    it('changing values should correctly update the queries', () => {
      const { page } = setup(false);
      page.setInputValueById('Gender', 2);
      page.expectDiffQueryToContain('UPDATE `creature_model_info` SET `Gender` = 2 WHERE (`DisplayID` = 1);');
      page.expectFullQueryToContain(
        'DELETE FROM `creature_model_info` WHERE (`DisplayID` = 1);\n' +
          'INSERT INTO `creature_model_info` (`DisplayID`, `BoundingRadius`, `CombatReach`, `Gender`, `DisplayID_Other_Gender`, `VerifiedBuild`) VALUES\n' +
          '(1, 0, 0, 2, 0, 0);\n',
      );
    });
  });
});
