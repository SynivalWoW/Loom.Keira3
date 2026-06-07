import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { PlayerShapeshiftModel } from '@keira/shared/acore-world-model';
import { MysqlQueryService, SqliteService } from '@keira/shared/db-layer';
import { MultiRowEditorPageObject, TranslateTestingModule } from '@keira/shared/test-utils';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ToastrModule } from 'ngx-toastr';
import { of } from 'rxjs';
import { instance, mock } from 'ts-mockito';
import { ShapeshiftModelComponent } from './shapeshift-model.component';
import { ShapeshiftHandlerService } from '../shapeshift-handler.service';

class ShapeshiftModelPage extends MultiRowEditorPageObject<ShapeshiftModelComponent> {}

describe('ShapeshiftModel integration tests', () => {
  const id = 1; // ShapeshiftID 1 = CAT form

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ToastrModule.forRoot(), ModalModule.forRoot(), ShapeshiftModelComponent, RouterTestingModule, TranslateTestingModule],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        ShapeshiftHandlerService,
        { provide: SqliteService, useValue: instance(mock(SqliteService)) },
      ],
    }).compileComponents();
  });

  function setup(creatingNew: boolean) {
    const row0 = new PlayerShapeshiftModel();
    const row1 = new PlayerShapeshiftModel();
    row0.ShapeshiftID = row1.ShapeshiftID = id;
    row0.RaceID = 4;
    row0.DisplayID = 100;
    row1.RaceID = 6;
    row1.DisplayID = 200;

    const handlerService = TestBed.inject(ShapeshiftHandlerService);
    handlerService['_selected'] = `${id}`;
    handlerService.isNew = creatingNew;

    const queryService = TestBed.inject(MysqlQueryService);
    const querySpy = vi.spyOn(queryService, 'query').mockReturnValue(of([]));
    vi.spyOn(queryService, 'queryValue').mockReturnValue(of());
    vi.spyOn(queryService, 'selectAll').mockReturnValue(of(creatingNew ? [] : [row0, row1]));

    const fixture = TestBed.createComponent(ShapeshiftModelComponent);
    const page = new ShapeshiftModelPage(fixture);
    fixture.autoDetectChanges(true);
    fixture.detectChanges();
    return { handlerService, querySpy, fixture, page };
  }

  describe('Creating new', () => {
    it('should correctly initialise', () => {
      const { page } = setup(true);
      page.expectDiffQueryToBeEmpty();
      page.expectFullQueryToBeEmpty();
      expect(page.addNewRowBtn.disabled).toBe(false);
      expect(page.deleteSelectedRowBtn.disabled).toBe(true);
      expect(page.getInputById('RaceID').disabled).toBe(true);
      expect(page.getInputById('DisplayID').disabled).toBe(true);
      expect(page.getEditorTableRowsCount()).toBe(0);
    });

    it('should correctly update the unsaved status', () => {
      const { handlerService, page } = setup(true);
      expect(handlerService.isShapeshiftModelUnsaved()).toBe(false);
      page.addNewRow();
      expect(handlerService.isShapeshiftModelUnsaved()).toBe(true);
      page.deleteRow();
      expect(handlerService.isShapeshiftModelUnsaved()).toBe(false);
    });

    it('adding rows and executing the query should correctly work', () => {
      const { querySpy, page } = setup(true);
      const expectedQuery =
        'DELETE FROM `player_shapeshift_model` WHERE (`ShapeshiftID` = 1) AND (`RaceID` IN (0, 1));\n' +
        'INSERT INTO `player_shapeshift_model` (`ShapeshiftID`, `RaceID`, `CustomizationID`, `GenderID`, `DisplayID`) VALUES\n' +
        '(1, 0, 0, 0, 0),\n' +
        '(1, 1, 0, 0, 0);';
      querySpy.mockClear();

      page.addNewRow();
      page.addNewRow();
      expect(page.getEditorTableRowsCount()).toBe(2);
      page.expectDiffQueryToContain(expectedQuery);

      page.clickExecuteQuery();
      expect(querySpy).toHaveBeenCalledTimes(1);
      expect(querySpy.mock.calls.at(-1)![0]).toContain(expectedQuery);
    });

    it('adding a row and editing it updates the queries', () => {
      const { page } = setup(true);
      page.addNewRow();
      page.setInputValueById('RaceID', 22);
      page.setInputValueById('DisplayID', 80046);

      page.expectFullQueryToContain(
        'DELETE FROM `player_shapeshift_model` WHERE (`ShapeshiftID` = 1);\n' +
          'INSERT INTO `player_shapeshift_model` (`ShapeshiftID`, `RaceID`, `CustomizationID`, `GenderID`, `DisplayID`) VALUES\n' +
          '(1, 22, 0, 0, 80046);',
      );
    });
  });

  describe('Editing existing', () => {
    it('should correctly load existing rows', () => {
      const { page } = setup(false);
      page.expectDiffQueryToBeEmpty();
      expect(page.getEditorTableRowsCount()).toBe(2);
    });

    it('changing a row DisplayID produces the diff + full queries', () => {
      const { page } = setup(false);
      page.clickRowOfDatatable(1); // RaceID 6 row
      page.setInputValueById('DisplayID', 80044);

      page.expectDiffQueryToContain(
        'DELETE FROM `player_shapeshift_model` WHERE (`ShapeshiftID` = 1) AND (`RaceID` IN (6));\n' +
          'INSERT INTO `player_shapeshift_model` (`ShapeshiftID`, `RaceID`, `CustomizationID`, `GenderID`, `DisplayID`) VALUES\n' +
          '(1, 6, 0, 0, 80044);',
      );
    });
  });
});
