import { inject, Injectable } from '@angular/core';
import { ElectronService } from '@keira/shared/common-services';

export interface WdbcHeader {
  magic: string;
  recordCount: number;
  fieldCount: number;
  recordSize: number;
  stringBlockSize: number;
}

/**
 * Minimal binary .dbc (WDBC) reader used for §3.C relational validation — e.g. confirming a
 * CreatureDisplayInfo id exists in the Patch-T.mpq DBC before the DBAL drafts SQL that references
 * it (a missing reference surfaces in the UI as a "Critical Orphaned Reference").
 *
 * The pure parsing logic operates on a `Uint8Array`, so it is fully unit-testable; the thin
 * filesystem wrapper reads bytes through `ElectronService.fs` (no-op outside Electron).
 */
@Injectable({
  providedIn: 'root',
})
export class DbcReaderService {
  private readonly electronService = inject(ElectronService);

  parseHeader(buffer: Uint8Array): WdbcHeader {
    const magic = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);
    if (magic !== 'WDBC') {
      throw new Error(`Invalid DBC magic: ${magic}`);
    }

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    return {
      magic,
      recordCount: view.getUint32(4, true),
      fieldCount: view.getUint32(8, true),
      recordSize: view.getUint32(12, true),
      stringBlockSize: view.getUint32(16, true),
    };
  }

  /** True when a record whose first field equals `id` exists (CreatureDisplayInfo is keyed by id). */
  hasRecordId(buffer: Uint8Array, id: number): boolean {
    const header = this.parseHeader(buffer);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const dataStart = 20; // 5 x uint32 header

    for (let i = 0; i < header.recordCount; i++) {
      const offset = dataStart + i * header.recordSize;
      if (view.getUint32(offset, true) === id) {
        return true;
      }
    }
    return false;
  }

  readHeader(path: string): WdbcHeader {
    const data = this.electronService.fs.readFileSync(path);
    return this.parseHeader(new Uint8Array(data));
  }
}
