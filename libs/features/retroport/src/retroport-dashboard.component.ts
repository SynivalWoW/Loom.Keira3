import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

import { RealmEnvironment, RetroportDbalService, RetroportPayload } from '@keira/shared/db-layer';
import { FileDialogService } from './file-dialog.service';
import { OrchestratorBridgeService, OrchestratorResult } from './orchestrator-bridge.service';

const DEFAULT_ORCHESTRATOR_PATH = 'loom_orchestrator.py';

/**
 * Retroport DBAL dashboard. A single "Run Orchestrator" click drives the whole pipeline:
 *   1. runs the Python loom_orchestrator.py over the chosen To Convert/<Category>/<Model>/ folder,
 *   2. captures the returned display id + binary-validation metadata,
 *   3. auto-generates realm-aware item_template / player_shapeshift_model SQL for the LIVE/PTR
 *      toggle, previewed in the page and executable through Keira3's existing connection.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'keira-retroport-dashboard',
  templateUrl: './retroport-dashboard.component.html',
  styleUrls: ['./retroport-dashboard.component.scss'],
  imports: [TranslateModule, FormsModule],
})
export class RetroportDashboardComponent {
  protected readonly RealmEnvironment = RealmEnvironment;
  protected readonly realm = signal<RealmEnvironment>(RealmEnvironment.LIVE);
  protected readonly generatedSql = signal<string>('');
  protected readonly deploymentLog = signal<string[]>([]);
  protected readonly running = signal<boolean>(false);
  protected readonly metadata = signal<OrchestratorResult | null>(null);

  protected targetFolder = '';
  protected orchestratorPath = DEFAULT_ORCHESTRATOR_PATH;
  protected payload: RetroportPayload = { displayId: 0 };

  private readonly dbal = inject(RetroportDbalService);
  private readonly orchestrator = inject(OrchestratorBridgeService);
  private readonly fileDialog = inject(FileDialogService);
  private readonly toastr = inject(ToastrService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected setRealm(realm: RealmEnvironment): void {
    this.realm.set(realm);
  }

  protected async browse(): Promise<void> {
    const dir = await this.fileDialog.pickDirectory();
    if (dir) {
      this.targetFolder = dir;
      this.changeDetectorRef.markForCheck();
    }
  }

  protected generateSql(): void {
    const item = this.dbal.buildItemTemplate(this.payload, this.realm());
    const shapeshift = this.dbal.insertShapeshiftModel(this.payload, this.realm());
    this.generatedSql.set(`${item}\n${shapeshift}`);
  }

  protected appendLog(line: string): void {
    this.deploymentLog.update((log) => [...log, line]);
    this.changeDetectorRef.markForCheck();
  }

  protected async runOrchestrator(): Promise<void> {
    const folder = this.targetFolder.trim();
    if (!folder) {
      this.toastr.error('Enter the "To Convert" model folder to retroport first');
      return;
    }

    this.running.set(true);
    try {
      const mapping = { internal_name: this.payload.itemName ?? '', target_folder: '' };
      const result = await this.orchestrator.runForModel(this.orchestratorPath, folder, mapping, (line) => this.appendLog(line));
      this.metadata.set(result);

      // Drive the minted display id straight into the SQL payload.
      if (typeof result.display_id === 'number') {
        this.payload.displayId = result.display_id;
      }

      this.appendLog(
        `Repaired ${result.internal_name ?? folder}: nViews=${result.nViews}, ` +
          `combiner=[${(result.combiner_array ?? []).join(', ')}], emitter_safe=${result.emitter_safe}`,
      );

      // Auto-generate the realm-aware SQL with the metadata we just received.
      this.generateSql();
    } catch (e) {
      this.toastr.error((e as Error).message);
      this.appendLog(`Error: ${(e as Error).message}`);
    } finally {
      this.running.set(false);
      this.changeDetectorRef.markForCheck();
    }
  }
}
