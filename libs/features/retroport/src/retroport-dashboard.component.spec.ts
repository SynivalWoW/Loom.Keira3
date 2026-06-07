import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { RealmEnvironment, RetroportDbalService } from '@keira/shared/db-layer';
import { PageObject, TranslateTestingModule } from '@keira/shared/test-utils';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';

import { FileDialogService } from './file-dialog.service';
import { OrchestratorBridgeService } from './orchestrator-bridge.service';
import { RetroportDashboardComponent } from './retroport-dashboard.component';

class RetroportDashboardPage extends PageObject<RetroportDashboardComponent> {
  get realmLive(): HTMLButtonElement {
    return this.query<HTMLButtonElement>('#realm-live');
  }
  get realmPtr(): HTMLButtonElement {
    return this.query<HTMLButtonElement>('#realm-ptr');
  }
  get generateBtn(): HTMLButtonElement {
    return this.query<HTMLButtonElement>('#generate-sql-btn');
  }
  get runBtn(): HTMLButtonElement {
    return this.query<HTMLButtonElement>('#run-orchestrator-btn');
  }
  get browseBtn(): HTMLButtonElement {
    return this.query<HTMLButtonElement>('#browse-btn');
  }
  get targetFolderInput(): HTMLInputElement {
    return this.query<HTMLInputElement>('#targetFolder');
  }
  get generatedSql(): HTMLPreElement {
    return this.query<HTMLPreElement>('#generated-sql');
  }
  get metadata(): HTMLDivElement {
    return this.query<HTMLDivElement>('#metadata');
  }
  get log(): HTMLUListElement {
    return this.query<HTMLUListElement>('.deployment-log');
  }
}

describe('RetroportDashboardComponent', () => {
  const dbal = { buildItemTemplate: vi.fn(), insertShapeshiftModel: vi.fn() };
  const orchestrator = { runForModel: vi.fn() };
  const fileDialog = { pickDirectory: vi.fn() };
  const toastr = { error: vi.fn() };

  beforeEach(() => {
    dbal.buildItemTemplate.mockReset().mockReturnValue('ITEM_SQL');
    dbal.insertShapeshiftModel.mockReset().mockReturnValue('SHAPE_SQL');
    orchestrator.runForModel.mockReset();
    fileDialog.pickDirectory.mockReset();
    toastr.error.mockReset();

    TestBed.configureTestingModule({
      imports: [RetroportDashboardComponent, TranslateTestingModule],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        { provide: RetroportDbalService, useValue: dbal },
        { provide: OrchestratorBridgeService, useValue: orchestrator },
        { provide: FileDialogService, useValue: fileDialog },
        { provide: ToastrService, useValue: toastr },
      ],
    }).compileComponents();
  });

  function setup() {
    const fixture = TestBed.createComponent(RetroportDashboardComponent);
    const page = new RetroportDashboardPage(fixture);
    page.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const component = fixture.componentInstance as any;
    return { fixture, page, component };
  }

  it('defaults to the LIVE realm', () => {
    const { component } = setup();
    expect(component.realm()).toBe(RealmEnvironment.LIVE);
  });

  it('toggles to the PTR realm', () => {
    const { page, component } = setup();
    page.clickElement(page.realmPtr);
    expect(component.realm()).toBe(RealmEnvironment.PTR);
  });

  it('generates realm-aware SQL for both tables', () => {
    const { page, component } = setup();
    page.clickElement(page.generateBtn);

    expect(dbal.buildItemTemplate).toHaveBeenCalledWith(component.payload, RealmEnvironment.LIVE);
    expect(dbal.insertShapeshiftModel).toHaveBeenCalledWith(component.payload, RealmEnvironment.LIVE);
    expect(page.generatedSql.innerHTML).toContain('ITEM_SQL');
    expect(page.generatedSql.innerHTML).toContain('SHAPE_SQL');

    page.clickElement(page.realmPtr);
    page.clickElement(page.generateBtn);
    expect(dbal.buildItemTemplate).toHaveBeenLastCalledWith(component.payload, RealmEnvironment.PTR);
  });

  it('fills the target folder from the native picker', async () => {
    fileDialog.pickDirectory.mockResolvedValue('/abs/To Convert/Druid/WindsaberCat');
    const { page, component } = setup();
    page.clickElement(page.browseBtn);
    await page.whenStable();
    page.detectChanges();

    expect(fileDialog.pickDirectory).toHaveBeenCalled();
    expect(component.targetFolder).toBe('/abs/To Convert/Druid/WindsaberCat');
  });

  it('leaves the target folder unchanged when the picker is cancelled', async () => {
    fileDialog.pickDirectory.mockResolvedValue(null);
    const { page, component } = setup();
    page.clickElement(page.browseBtn);
    await page.whenStable();

    expect(component.targetFolder).toBe('');
  });

  it('warns and does nothing when no target folder is given', async () => {
    const { page } = setup();
    page.clickElement(page.runBtn);
    await page.whenStable();

    expect(toastr.error).toHaveBeenCalled();
    expect(orchestrator.runForModel).not.toHaveBeenCalled();
  });

  it('runs the orchestrator on the folder, captures the display id and auto-generates SQL', async () => {
    orchestrator.runForModel.mockImplementation((_script: string, _folder: string, _mapping: unknown, onLog: (line: string) => void) => {
      onLog('streamed line');
      return Promise.resolve({
        status: 'ok',
        internal_name: 'WindsaberCat',
        display_id: 1234567,
        nViews: 4,
        skin_count: 4,
        combiner_array: [0, 1, 2, 3],
        combiner_action: 'repaired',
        vertex_count: 9000,
        vertex_safe: true,
        emitter_safe: true,
        valid: true,
      });
    });

    const { page, component } = setup();
    page.setInputValueById('targetFolder', 'To Convert/Druid/WindsaberCat');
    page.clickElement(page.runBtn);
    await page.whenStable();
    page.detectChanges();

    expect(orchestrator.runForModel).toHaveBeenCalledWith(
      'loom_orchestrator.py',
      'To Convert/Druid/WindsaberCat',
      { internal_name: '', target_folder: '' },
      expect.any(Function),
    );
    // display id flowed from the orchestrator into the SQL payload
    expect(component.payload.displayId).toBe(1234567);
    // validation metadata + log + auto-generated SQL are all shown
    expect(page.metadata.innerHTML).toContain('4');
    expect(page.log.innerHTML).toContain('streamed line');
    expect(page.log.innerHTML).toContain('Repaired WindsaberCat');
    expect(page.generatedSql.innerHTML).toContain('ITEM_SQL');
    expect(component.running()).toBe(false);
  });

  it('handles a result without a display id and surfaces a missing-texture warning', async () => {
    orchestrator.runForModel.mockResolvedValue({
      status: 'ok',
      nViews: 2,
      vertex_safe: false,
      emitter_safe: false,
      missing_textures: ['CatEyes.blp'],
      valid: false,
    });

    const { page, component } = setup();
    page.setInputValueById('targetFolder', 'To Convert/Mage/ArcaneOrb');
    page.clickElement(page.runBtn);
    await page.whenStable();
    page.detectChanges();

    expect(component.payload.displayId).toBe(0); // unchanged — no display id returned
    expect(page.log.innerHTML).toContain('Repaired To Convert/Mage/ArcaneOrb');
    expect(page.metadata.innerHTML).toContain('CatEyes.blp'); // missing-texture warning rendered
    expect(page.metadata.innerHTML).toContain('over limit'); // vertex_safe=false branch
    expect(page.generatedSql.innerHTML).toContain('ITEM_SQL');
  });

  it('shows a toast and logs the error when the orchestrator fails', async () => {
    orchestrator.runForModel.mockReturnValue(Promise.reject(new Error('boom')));

    const { page, component } = setup();
    page.setInputValueById('targetFolder', 'To Convert/Druid/WindsaberCat');
    page.clickElement(page.runBtn);
    await page.whenStable();
    page.detectChanges();

    expect(toastr.error).toHaveBeenCalledWith('boom');
    expect(page.log.innerHTML).toContain('Error: boom');
    expect(component.running()).toBe(false);
  });
});
