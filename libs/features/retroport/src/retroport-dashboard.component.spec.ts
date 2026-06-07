import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { RealmEnvironment, RetroportDbalService } from '@keira/shared/db-layer';
import { PageObject, TranslateTestingModule } from '@keira/shared/test-utils';
import { ToastrService } from 'ngx-toastr';
import { vi } from 'vitest';

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
  get generatedSql(): HTMLPreElement {
    return this.query<HTMLPreElement>('#generated-sql');
  }
  get log(): HTMLUListElement {
    return this.query<HTMLUListElement>('.deployment-log');
  }
}

describe('RetroportDashboardComponent', () => {
  const dbal = { buildItemTemplate: vi.fn(), insertShapeshiftModel: vi.fn() };
  const orchestrator = { runOrchestrator: vi.fn() };
  const toastr = { error: vi.fn() };

  beforeEach(() => {
    dbal.buildItemTemplate.mockReset().mockReturnValue('ITEM_SQL');
    dbal.insertShapeshiftModel.mockReset().mockReturnValue('SHAPE_SQL');
    orchestrator.runOrchestrator.mockReset();
    toastr.error.mockReset();

    TestBed.configureTestingModule({
      imports: [RetroportDashboardComponent, TranslateTestingModule],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        { provide: RetroportDbalService, useValue: dbal },
        { provide: OrchestratorBridgeService, useValue: orchestrator },
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

    // toggling the realm then regenerating targets PTR
    page.clickElement(page.realmPtr);
    page.clickElement(page.generateBtn);
    expect(dbal.buildItemTemplate).toHaveBeenLastCalledWith(component.payload, RealmEnvironment.PTR);
  });

  it('runs the orchestrator, streams the log and records success', async () => {
    orchestrator.runOrchestrator.mockImplementation((_args: string[], onLog: (line: string) => void) => {
      onLog('streamed line');
      return Promise.resolve({ success: true });
    });

    const { page, component } = setup();
    page.clickElement(page.runBtn);
    await page.whenStable();
    page.detectChanges();

    expect(orchestrator.runOrchestrator).toHaveBeenCalledWith(['--realm', 'LIVE'], expect.any(Function));
    expect(page.log.innerHTML).toContain('streamed line');
    expect(page.log.innerHTML).toContain('Done: success=true');
    expect(component.running()).toBe(false);
  });

  it('shows a toast and logs the error when the orchestrator fails', async () => {
    orchestrator.runOrchestrator.mockReturnValue(Promise.reject(new Error('boom')));

    const { page, component } = setup();
    page.clickElement(page.runBtn);
    await page.whenStable();
    page.detectChanges();

    expect(toastr.error).toHaveBeenCalledWith('boom');
    expect(page.log.innerHTML).toContain('Error: boom');
    expect(component.running()).toBe(false);
  });
});
