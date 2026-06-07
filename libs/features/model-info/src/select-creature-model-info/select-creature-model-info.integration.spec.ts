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
import { CreatureModelInfo } from '@keira/shared/acore-world-model';
import { SelectCreatureModelInfoComponent } from './select-creature-model-info.component';
import { CreatureModelInfoHandlerService } from '../creature-model-info-handler.service';

describe('SelectCreatureModelInfo integration tests', () => {
  class SelectCreatureModelInfoPage extends SelectPageObject<SelectCreatureModelInfoComponent> {}

  function setup() {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockImplementation(() => undefined as any);
    const queryService = TestBed.inject(MysqlQueryService);
    const querySpy = vi.spyOn(queryService, 'query').mockReturnValue(of([{ max: 1 }]));

    const fixture: ComponentFixture<SelectCreatureModelInfoComponent> = TestBed.createComponent(SelectCreatureModelInfoComponent);
    const page = new SelectCreatureModelInfoPage(fixture);
    const component = fixture.componentInstance;

    fixture.autoDetectChanges(true);
    fixture.detectChanges();
    return { page, component, navigateSpy, querySpy };
  }

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

  it('should correctly initialise', async () => {
    const { page, component, querySpy } = setup();
    await page.fixture.whenStable();
    expect(page.createInput.value).toEqual(`${component.customStartingId}`);
    page.expectNewEntityFree();
    expect(querySpy).toHaveBeenCalledWith('SELECT MAX(DisplayID) AS max FROM creature_model_info;');
    expect(page.queryWrapper.innerText).toContain('SELECT * FROM `creature_model_info` LIMIT 50');
  });

  for (const { displayId, gender, limit, expectedQuery } of [
    {
      displayId: 1,
      gender: 2,
      limit: '100',
      expectedQuery: "SELECT * FROM `creature_model_info` WHERE (`DisplayID` LIKE '%1%') AND (`Gender` LIKE '%2%') LIMIT 100",
    },
    {
      displayId: 2,
      gender: null,
      limit: '100',
      expectedQuery: "SELECT * FROM `creature_model_info` WHERE (`DisplayID` LIKE '%2%') LIMIT 100",
    },
  ]) {
    it(`searching an existing entity should correctly work [DisplayID: ${displayId}, Gender: ${gender}]`, () => {
      const { page, querySpy } = setup();
      querySpy.mockClear();

      page.setInputValueById('search-DisplayID', `${displayId}`);
      if (gender !== null) {
        page.setInputValueById('search-Gender', `${gender}`);
      }
      page.setInputValue(page.searchLimitInput, limit);

      expect(page.queryWrapper.innerText).toContain(expectedQuery);

      page.clickElement(page.searchBtn);

      expect(querySpy).toHaveBeenCalledTimes(1);
      expect(querySpy.mock.calls.at(-1)![0]).toBe(expectedQuery);
    });
  }

  it('searching and selecting an existing entity from the datatable should correctly work', () => {
    const { page, navigateSpy, querySpy } = setup();
    const results = [
      { DisplayID: 10, BoundingRadius: 0.3, CombatReach: 1.5, Gender: 0, DisplayID_Other_Gender: 0, VerifiedBuild: 12340 },
      { DisplayID: 20, BoundingRadius: 0.4, CombatReach: 1.6, Gender: 1, DisplayID_Other_Gender: 10, VerifiedBuild: 12340 },
    ] as CreatureModelInfo[];

    querySpy.mockClear();
    querySpy.mockReturnValue(of(results));

    page.clickElement(page.searchBtn);

    const row0 = page.getDatatableRowExternal(0);
    const row1 = page.getDatatableRowExternal(1);
    expect(row0.innerText).toContain('10');
    expect(row1.innerText).toContain('20');

    page.clickElement(page.getDatatableCellExternal(1, 0));

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(['model-info/model']);
  });
});
