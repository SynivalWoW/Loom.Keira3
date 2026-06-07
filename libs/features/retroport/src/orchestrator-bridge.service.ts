import { inject, Injectable } from '@angular/core';
import { ElectronService } from '@keira/shared/common-services';

export interface OrchestratorResult {
  success: boolean;
  [key: string]: unknown;
}

/**
 * Bridges the Angular renderer to the Python `loom_orchestrator.py` binary pipeline via
 * `child_process.spawn` (exposed by `ElectronService`). Streams stdout/stderr into a log
 * callback (for the dashboard's deployment log) and resolves with the orchestrator's parsed JSON
 * metadata — which the DBAL then turns into realm-aware SQL.
 */
@Injectable({
  providedIn: 'root',
})
export class OrchestratorBridgeService {
  private readonly electronService = inject(ElectronService);

  runOrchestrator(args: string[], onLog: (line: string) => void): Promise<OrchestratorResult> {
    return new Promise<OrchestratorResult>((resolve, reject) => {
      if (!this.electronService.isElectron()) {
        reject(new Error('Orchestrator requires Electron'));
        return;
      }

      const child = this.electronService.childProcess.spawn('python', ['loom_orchestrator.py', ...args]);
      let stdout = '';

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stdout += text;
        onLog(text);
      });

      child.stderr.on('data', (chunk: Buffer) => {
        onLog(`[stderr] ${chunk.toString()}`);
      });

      child.on('error', (err: Error) => {
        reject(err);
      });

      child.on('close', (code: number) => {
        if (code !== 0) {
          reject(new Error(`Orchestrator exited with code ${code}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout) as OrchestratorResult);
        } catch (e) {
          reject(new Error(`Failed to parse orchestrator output: ${(e as Error).message}`));
        }
      });
    });
  }
}
