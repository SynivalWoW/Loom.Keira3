import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { MysqlQueryService, SqliteService } from '@keira/shared/db-layer';
import { SelectPageObject, TranslateTestingModule } from '@keira/shared/test-utils';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ToastrModule } from 'ngx-toastr';
import { of } from 'rxjs';
import { instance, mock } from 'ts-mockito';
import { PlayerShapeshiftModel } from '@keira/shared/acore-world-model';
import { SelectShapeshiftComponent } from './select-shapeshift.component';
import { ShapeshiftHandlerService } from '../shapeshift-handler.service';

describe('SelectShapeshift integration tests', () => {
  class SelectShapeshiftPage extends SelectPageObject<SelectShapeshiftComponent> {}

  function setup() {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockImplementation(() => undefined as any);
    const queryService = TestBed.inject(MysqlQueryService);
    const querySpy = vi.spyOn(queryService, 'query').mockReturnValue(of([{ max: 1 }]));

    const fixture: ComponentFixture<SelectShapeshiftComponent> = TestBed.createComponent(SelectShapeshiftComponent);
    const page = new SelectShapeshiftPage(fixture);
    fixture.autoDetectChanges(true);
    fixture.detectChanges();
    return { page, navigateSpy, querySpy };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ToastrModule.forRoot(), ModalModule.forRoot(), TranslateTestingModule],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        ShapeshiftHandlerService,
        { provide: SqliteService, useValue: instance(mock(SqliteService)) },
      ],
    }).compileComponents();
  });

  it('should correctly initialise', async () => {
    const { page, querySpy } = setup();
    await page.fixture.whenStable();
    page.expectNewEntityFree();
    expect(querySpy).toHaveBeenCalledWith('SELECT MAX(ShapeshiftID) AS max FROM player_shapeshift_model;');
    expect(page.queryWrapper.innerText).toContain('SELECT * FROM `player_shapeshift_model` LIMIT 50');
  });

  it('searching by ShapeshiftID should build the right query', () => {
    const { page, querySpy } = setup();
    querySpy.mockClear();

    page.setInputValueById('search-ShapeshiftID', '1');
    page.setInputValue(page.searchLimitInput, '100');

    const expectedQuery = "SELECT * FROM `player_shapeshift_model` WHERE (`ShapeshiftID` LIKE '%1%') LIMIT 100";
    expect(page.queryWrapper.innerText).toContain(expectedQuery);

    page.clickElement(page.searchBtn);
    expect(querySpy).toHaveBeenCalledTimes(1);
    expect(querySpy.mock.calls.at(-1)![0]).toBe(expectedQuery);
  });

  it('selecting a row navigates to the form editor', () => {
    const { page, navigateSpy, querySpy } = setup();
    const results = [
      { ShapeshiftID: 1, RaceID: 4, GenderID: 0, CustomizationID: 0, DisplayID: 80043 },
      { ShapeshiftID: 1, RaceID: 6, GenderID: 0, CustomizationID: 0, DisplayID: 80044 },
    ] as PlayerShapeshiftModel[];

    querySpy.mockClear();
    querySpy.mockReturnValue(of(results));

    page.clickElement(page.searchBtn);
    expect(page.getDatatableRowExternal(0).innerText).toContain('80043');

    page.clickElement(page.getDatatableCellExternal(1, 0));
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(['shapeshift/form']);
  });
});
