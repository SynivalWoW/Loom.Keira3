import { inject, Injectable } from '@angular/core';
import { ElectronService } from '@keira/shared/common-services';

import { addOrReplaceFile, Compressor, createArchive, extractFile, listFiles, MpqInputFile } from './mpq/mpq-archive';

/**
 * Filesystem-facing MPQ archive access for the DBC editor: open a `.dbc` (or any file) straight out
 * of a WotLK patch archive and write it back. The binary parsing/serialisation is the pure
 * `mpq/mpq-archive` module; this thin wrapper supplies bytes via `ElectronService.fs` and zlib via
 * `ElectronService.zlib` (both no-op outside Electron).
 */
@Injectable({
  providedIn: 'root',
})
export class MpqArchiveService {
  private readonly electronService = inject(ElectronService);

  private get compressor(): Compressor {
    const zlib = this.electronService.zlib;
    return {
      deflate: (data) => new Uint8Array(zlib.deflateSync(data)),
      inflate: (data) => new Uint8Array(zlib.inflateSync(data)),
    };
  }

  /** Extract a single file from the archive (e.g. `DBFilesClient\CreatureModelData.dbc`). */
  read(archivePath: string, fileName: string): Uint8Array {
    const buffer = new Uint8Array(this.electronService.fs.readFileSync(archivePath));
    return extractFile(buffer, fileName, this.compressor);
  }

  /** List the file names declared in the archive's `(listfile)`. */
  list(archivePath: string): string[] {
    const buffer = new Uint8Array(this.electronService.fs.readFileSync(archivePath));
    return listFiles(buffer, this.compressor);
  }

  /** Add or replace `fileName` inside an existing archive, persisting the result back to disk. */
  write(archivePath: string, fileName: string, data: Uint8Array): void {
    const buffer = new Uint8Array(this.electronService.fs.readFileSync(archivePath));
    const updated = addOrReplaceFile(buffer, fileName, data, this.compressor);
    this.electronService.fs.writeFileSync(archivePath, Buffer.from(updated));
  }

  /** Create a fresh archive containing `files` (a `(listfile)` is added automatically). */
  create(archivePath: string, files: MpqInputFile[]): void {
    const archive = createArchive(files, this.compressor);
    this.electronService.fs.writeFileSync(archivePath, Buffer.from(archive));
  }
}
