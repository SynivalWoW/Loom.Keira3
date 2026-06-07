import { inject, Injectable } from '@angular/core';
import { ElectronService } from '@keira/shared/common-services';

/** Shape of the JSON the Python `loom_orchestrator.py` prints on stdout (see §7 validation). */
export interface OrchestratorResult {
  status?: string;
  internal_name?: string;
  target_folder?: string;
  entry?: string;
  display_id?: number;
  nViews?: number;
  skin_count?: number;
  global_flags?: number;
  combiner_array?: number[];
  combiner_action?: string;
  emitter_safe?: boolean;
  particles?: number;
  ribbons?: number;
  vertex_count?: number;
  vertex_safe?: boolean;
  missing_textures?: string[];
  anim_count?: number;
  is_md21?: boolean;
  valid?: boolean;
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

  /** Run `python <args...>` and resolve with the parsed JSON it prints. */
  runOrchestrator(args: string[], onLog: (line: string) => void): Promise<OrchestratorResult> {
    return new Promise<OrchestratorResult>((resolve, reject) => {
      if (!this.electronService.isElectron()) {
        reject(new Error('Orchestrator requires Electron'));
        return;
      }

      const child = this.electronService.childProcess.spawn('python', args);
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

  /**
   * Run the orchestrator over one `To Convert/<Category>/<ModelName>/` folder. Mirrors the CLI
   * contract `python loom_orchestrator.py <target_dir> <mapping_json> [--gen-dbc] [--display-id N]`.
   */
  runForModel(
    scriptPath: string,
    targetDir: string,
    mapping: Record<string, unknown>,
    onLog: (line: string) => void,
    options: { genDbc?: boolean; displayId?: number } = {},
  ): Promise<OrchestratorResult> {
    const args = [scriptPath, targetDir, JSON.stringify(mapping)];
    if (options.genDbc) {
      args.push('--gen-dbc');
    }
    if (typeof options.displayId === 'number') {
      args.push('--display-id', String(options.displayId));
    }
    return this.runOrchestrator(args, onLog);
  }
}
