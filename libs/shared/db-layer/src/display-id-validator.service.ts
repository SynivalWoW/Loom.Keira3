import { inject, Injectable, signal } from '@angular/core';
import { ElectronService } from '@keira/shared/common-services';

import { DbcReaderService } from './dbc-reader.service';

export type DisplayIdStatus = 'present' | 'orphaned' | 'unvalidated';

/**
 * Validates that a DisplayID exists in the configured CreatureDisplayInfo.dbc (spec §3.C
 * "Critical Orphaned Reference"). SQL that references a DisplayID missing from the patch DBC will
 * render a red question mark / crash in-client — this catches typo'd or un-minted ids before the
 * SQL is run. Returns 'unvalidated' when no DBC path is set, when not running under Electron
 * (web build), or when the DBC can't be read.
 */
@Injectable({
  providedIn: 'root',
})
export class DisplayIdValidatorService {
  /** Path to the patch's CreatureDisplayInfo.dbc; set once and shared across editors. */
  readonly creatureDisplayInfoDbcPath = signal<string>('');

  private readonly electronService = inject(ElectronService);
  private readonly dbcReader = inject(DbcReaderService);

  validate(displayId: number): DisplayIdStatus {
    const path = this.creatureDisplayInfoDbcPath().trim();
    if (!path || !this.electronService.isElectron()) {
      return 'unvalidated';
    }

    try {
      const data = this.electronService.fs.readFileSync(path);
      return this.dbcReader.hasRecordId(new Uint8Array(data), displayId) ? 'present' : 'orphaned';
    } catch {
      return 'unvalidated';
    }
  }
}
