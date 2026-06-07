import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

import { RealmEnvironment, RetroportDbalService, RetroportPayload } from '@keira/shared/db-layer';
import { OrchestratorBridgeService } from './orchestrator-bridge.service';

/**
 * Retroport DBAL dashboard: a LIVE/PTR environment toggle, a payload form, a "Generate SQL"
 * action that previews realm-aware item_template / player_shapeshift_model SQL, and a
 * "Run Orchestrator" action that drives the Python pipeline and streams a deployment log.
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

  protected payload: RetroportPayload = { displayId: 0 };

  private readonly dbal = inject(RetroportDbalService);
  private readonly orchestrator = inject(OrchestratorBridgeService);
  private readonly toastr = inject(ToastrService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected setRealm(realm: RealmEnvironment): void {
    this.realm.set(realm);
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
    this.running.set(true);
    try {
      const result = await this.orchestrator.runOrchestrator(['--realm', this.realm()], (line) => this.appendLog(line));
      this.appendLog(`Done: success=${result.success}`);
    } catch (e) {
      this.toastr.error((e as Error).message);
      this.appendLog(`Error: ${(e as Error).message}`);
    } finally {
      this.running.set(false);
      this.changeDetectorRef.markForCheck();
    }
  }
}
