import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FileDialogService } from '@keira/shared/common-services';
import { DbcFileService, expandFields } from '@keira/shared/db-layer';
import { PageObject, TranslateTestingModule } from '@keira/shared/test-utils';
import { vi } from 'vitest';

import { DbcEditorComponent } from './dbc-editor.component';

class DbcEditorPage extends PageObject<DbcEditorComponent> {
  get loadBtn() {
    return this.query<HTMLButtonElement>('#load-btn');
  }
  get saveBtn() {
    return this.query<HTMLButtonElement>('#save-btn');
  }
  get addRowBtn() {
    return this.query<HTMLButtonElement>('#add-row-btn');
  }
  get browseBtn() {
    return this.query<HTMLButtonElement>('#browse-btn');
  }
  get browseMpqBtn() {
    return this.query<HTMLButtonElement>('#browse-mpq-btn');
  }
  get status() {
    return this.query<HTMLParagraphElement>('#dbc-status');
  }
  get tabs() {
    return Array.from(this.fixture.nativeElement.querySelectorAll<HTMLButtonElement>('.dbc-tab'));
  }
  get headers() {
    return Array.from(this.fixture.nativeElement.querySelectorAll<HTMLTableCellElement>('.dbc-grid thead th'));
  }
  tab(name: string) {
    return this.query<HTMLButtonElement>(`.dbc-tab[data-tab="${name}"]`);
  }
}

describe('DbcEditorComponent', () => {
  const dbcFile = { read: vi.fn(), write: vi.fn(), readFromMpq: vi.fn(), writeToMpq: vi.fn() };
  const fileDialog = { pickFile: vi.fn() };
  const parsed = {
    fields: [
      { name: 'ID', type: 'int' as const },
      { name: 'ModelName', type: 'string' as const },
    ],
    rows: [{ ID: 1, ModelName: 'foo.m2' }],
  };

  beforeEach(() => {
    dbcFile.read.mockReset().mockReturnValue(parsed);
    dbcFile.write.mockReset();
    dbcFile.readFromMpq.mockReset().mockReturnValue(parsed);
    dbcFile.writeToMpq.mockReset();
    fileDialog.pickFile.mockReset();

    TestBed.configureTestingModule({
      imports: [DbcEditorComponent, TranslateTestingModule],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        { provide: DbcFileService, useValue: dbcFile },
        { provide: FileDialogService, useValue: fileDialog },
      ],
    }).compileComponents();
  });

  function setup() {
    const fixture = TestBed.createComponent(DbcEditorComponent);
    const page = new DbcEditorPage(fixture);
    page.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const component = fixture.componentInstance as any;
    return { fixture, page, component };
  }

  it('loads a dbc and renders the grid', () => {
    const { page, component } = setup();
    page.setInputValueById('dbcPath', '/patch/CreatureModelData.dbc');
    page.clickElement(page.loadBtn);

    expect(dbcFile.read).toHaveBeenCalledWith('/patch/CreatureModelData.dbc', component.table);
    expect(page.status.innerText).toContain('Loaded 1 rows');
    expect(page.query<HTMLInputElement>('.dbc-cell')).toBeTruthy();
  });

  it('shows an error when the dbc cannot be read', () => {
    dbcFile.read.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const { page, component } = setup();
    page.clickElement(page.loadBtn);
    expect(page.status.innerText).toContain('Error: ENOENT');
    expect(component.rows().length).toBe(0);
  });

  it('adds and deletes rows', () => {
    const { page, component } = setup();
    page.clickElement(page.loadBtn);
    expect(component.rows().length).toBe(1);

    page.clickElement(page.addRowBtn);
    expect(component.rows().length).toBe(2);
    expect(component.rows()[1]).toEqual({ ID: 0, ModelName: '' }); // blank row from the field defs

    page.clickElement(page.query<HTMLButtonElement>('.delete-row-btn'));
    expect(component.rows().length).toBe(1);
  });

  it('edits a cell value (leaving other rows untouched)', () => {
    const { page, component } = setup();
    page.clickElement(page.loadBtn);
    page.clickElement(page.addRowBtn); // a second row so the map's "unchanged" branch is exercised
    page.setInputValue(page.query<HTMLInputElement>('.dbc-cell'), '999');
    expect(component.rows()[0].ID).toBe('999');
    expect(component.rows()[1]).toEqual({ ID: 0, ModelName: '' });
  });

  it('saves the rows back to the dbc', () => {
    const { page, component } = setup();
    page.setInputValueById('dbcPath', '/out.dbc');
    page.clickElement(page.loadBtn);
    page.clickElement(page.saveBtn);

    expect(dbcFile.write).toHaveBeenCalledWith('/out.dbc', component.table, component.rows());
    expect(page.status.innerText).toContain('Saved 1 rows');
  });

  it('shows an error when saving fails', () => {
    dbcFile.write.mockImplementation(() => {
      throw new Error('EACCES');
    });
    const { page } = setup();
    page.clickElement(page.loadBtn);
    page.clickElement(page.saveBtn);
    expect(page.status.innerText).toContain('Error: EACCES');
  });

  it('fills the dbc path from the native file picker', async () => {
    fileDialog.pickFile.mockResolvedValue('/abs/patch/CreatureModelData.dbc');
    const { page, component } = setup();
    page.clickElement(page.browseBtn);
    await page.whenStable();

    expect(fileDialog.pickFile).toHaveBeenCalledWith([{ name: 'DBC', extensions: ['dbc'] }]);
    expect(component.dbcPath).toBe('/abs/patch/CreatureModelData.dbc');
  });

  it('leaves the dbc path unchanged when the picker is cancelled', async () => {
    fileDialog.pickFile.mockResolvedValue(null);
    const { page, component } = setup();
    component.dbcPath = '/existing.dbc';
    page.clickElement(page.browseBtn);
    await page.whenStable();

    expect(component.dbcPath).toBe('/existing.dbc');
  });

  it('fills the mpq path from the native file picker', async () => {
    fileDialog.pickFile.mockResolvedValue('/abs/Data/patch-4.mpq');
    const { page, component } = setup();
    page.clickElement(page.browseMpqBtn);
    await page.whenStable();

    expect(fileDialog.pickFile).toHaveBeenCalledWith([{ name: 'MPQ', extensions: ['mpq', 'MPQ'] }]);
    expect(component.mpqPath).toBe('/abs/Data/patch-4.mpq');
  });

  it('leaves the mpq path unchanged when the picker is cancelled', async () => {
    fileDialog.pickFile.mockResolvedValue(null);
    const { page, component } = setup();
    component.mpqPath = '/existing.mpq';
    page.clickElement(page.browseMpqBtn);
    await page.whenStable();

    expect(component.mpqPath).toBe('/existing.mpq');
  });

  it('loads a dbc from inside an mpq archive when one is selected', () => {
    const { page, component } = setup();
    component.mpqPath = '/Data/patch-4.mpq';
    page.setInputValueById('dbcPath', 'DBFilesClient\\CreatureModelData.dbc');
    page.clickElement(page.loadBtn);

    expect(dbcFile.readFromMpq).toHaveBeenCalledWith('/Data/patch-4.mpq', 'DBFilesClient\\CreatureModelData.dbc', component.table);
    expect(dbcFile.read).not.toHaveBeenCalled();
    expect(page.status.innerText).toContain('Loaded 1 rows');
  });

  it('saves a dbc back into the mpq archive when one is selected', () => {
    const { page, component } = setup();
    component.mpqPath = '/Data/patch-4.mpq';
    page.setInputValueById('dbcPath', 'DBFilesClient\\CreatureModelData.dbc');
    page.clickElement(page.loadBtn);
    page.clickElement(page.saveBtn);

    expect(dbcFile.writeToMpq).toHaveBeenCalledWith(
      '/Data/patch-4.mpq',
      'DBFilesClient\\CreatureModelData.dbc',
      component.table,
      component.rows(),
    );
    expect(dbcFile.write).not.toHaveBeenCalled();
    expect(page.status.innerText).toContain('Saved 1 rows');
  });

  it('shows no tabs for a table without field groups', () => {
    const { page } = setup(); // default table = CreatureDisplayInfo (ungrouped)
    page.clickElement(page.loadBtn);
    expect(page.tabs.length).toBe(0);
  });

  it('renders field-group tabs for Spell.dbc and filters the grid to the active tab', () => {
    // Make the mock return the real expanded Spell columns so grouping is meaningful.
    const spellCols = expandFields('Spell');
    dbcFile.read.mockReturnValue({ fields: spellCols, rows: [{ ID: 1 }] });

    const { page, component } = setup();
    component.table = 'Spell';
    page.clickElement(page.loadBtn);

    const tabNames = page.tabs.map((t) => t.getAttribute('data-tab'));
    expect(tabNames).toEqual([
      'All',
      'General',
      'Attributes',
      'Costs & Reagents',
      'Cast & Cooldown',
      'Targeting',
      'Proc & Aura State',
      'Effects',
      'Text & Visuals',
    ]);

    // "All" shows every column (234 + the index header + the actions header).
    expect(page.headers.length).toBe(spellCols.length + 2);

    // Switching to "General" narrows the grid and hides Effect columns.
    page.clickElement(page.tab('General'));
    const generalHeaders = page.headers.map((h) => h.textContent?.trim());
    expect(generalHeaders).toContain('Category');
    expect(generalHeaders).not.toContain('EffectBasePoints_1');
    expect(component.activeTab()).toBe('General');

    // The Effects tab exposes the effect columns instead.
    page.clickElement(page.tab('Effects'));
    expect(page.headers.map((h) => h.textContent?.trim())).toContain('EffectBasePoints_1');
  });

  it('falls back to all columns when the active tab matches no group', () => {
    dbcFile.read.mockReturnValue({ fields: expandFields('Spell'), rows: [{ ID: 1 }] });
    const { component } = setup();
    component.table = 'Spell';
    component.load();
    component.activeTab.set('NoSuchTab'); // defensive: an unknown tab shows every column
    expect(component.visibleFields()).toBe(component.fields());
  });
});
