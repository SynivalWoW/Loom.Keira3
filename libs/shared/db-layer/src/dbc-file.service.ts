import { inject, Injectable } from '@angular/core';
import { ElectronService } from '@keira/shared/common-services';

import { DbcFieldDef, expandFields } from './dbc-definitions';
import { MpqArchiveService } from './mpq-archive.service';

export type DbcCell = number | string;
export type DbcRow = Record<string, DbcCell>;

export interface ParsedDbc {
  fields: DbcFieldDef[];
  rows: DbcRow[];
}

const WDBC_MAGIC = [0x57, 0x44, 0x42, 0x43]; // 'WDBC'

/**
 * Binary WDBC reader/writer driven by the WDBX 12340 column definitions. The parse/serialize logic
 * is pure (operates on byte buffers) and round-trips; the read/write wrappers use ElectronService.fs.
 */
@Injectable({
  providedIn: 'root',
})
export class DbcFileService {
  private readonly electronService = inject(ElectronService);
  private readonly mpq = inject(MpqArchiveService);

  parse(buffer: Uint8Array, table: string): ParsedDbc {
    const fields = expandFields(table);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const recordCount = view.getUint32(4, true);
    const recordSize = view.getUint32(12, true);
    const dataStart = 20;
    const stringStart = dataStart + recordCount * recordSize;

    const readString = (offset: number): string => {
      let end = stringStart + offset;
      while (end < buffer.length && buffer[end] !== 0) {
        end++;
      }
      return String.fromCharCode(...buffer.subarray(stringStart + offset, end));
    };

    const rows: DbcRow[] = [];
    for (let r = 0; r < recordCount; r++) {
      const base = dataStart + r * recordSize;
      const row: DbcRow = {};
      fields.forEach((field, i) => {
        const offset = base + i * 4;
        if (field.type === 'string') {
          row[field.name] = readString(view.getUint32(offset, true));
        } else if (field.type === 'float') {
          row[field.name] = view.getFloat32(offset, true);
        } else {
          row[field.name] = view.getInt32(offset, true);
        }
      });
      rows.push(row);
    }
    return { fields, rows };
  }

  serialize(table: string, rows: DbcRow[]): Uint8Array {
    const fields = expandFields(table);
    const recordSize = fields.length * 4;

    const stringBytes: number[] = [0]; // offset 0 is the empty string
    const stringOffsets = new Map<string, number>([['', 0]]);
    const intern = (text: string): number => {
      const existing = stringOffsets.get(text);
      if (existing !== undefined) {
        return existing;
      }
      const offset = stringBytes.length;
      for (let i = 0; i < text.length; i++) {
        stringBytes.push(text.charCodeAt(i) & 0xff);
      }
      stringBytes.push(0);
      stringOffsets.set(text, offset);
      return offset;
    };

    const records = new Uint8Array(rows.length * recordSize);
    const recordView = new DataView(records.buffer);
    rows.forEach((row, r) => {
      fields.forEach((field, i) => {
        const offset = r * recordSize + i * 4;
        const value = row[field.name];
        if (field.type === 'string') {
          recordView.setUint32(offset, intern(`${value ?? ''}`), true);
        } else if (field.type === 'float') {
          recordView.setFloat32(offset, Number(value ?? 0), true);
        } else {
          recordView.setInt32(offset, Number(value ?? 0), true);
        }
      });
    });

    const out = new Uint8Array(20 + records.length + stringBytes.length);
    const outView = new DataView(out.buffer);
    out.set(WDBC_MAGIC, 0);
    outView.setUint32(4, rows.length, true);
    outView.setUint32(8, fields.length, true);
    outView.setUint32(12, recordSize, true);
    outView.setUint32(16, stringBytes.length, true);
    out.set(records, 20);
    out.set(Uint8Array.from(stringBytes), 20 + records.length);
    return out;
  }

  read(path: string, table: string): ParsedDbc {
    return this.parse(new Uint8Array(this.electronService.fs.readFileSync(path)), table);
  }

  write(path: string, table: string, rows: DbcRow[]): void {
    this.electronService.fs.writeFileSync(path, Buffer.from(this.serialize(table, rows)));
  }

  /** Parse a `.dbc` extracted from inside an MPQ archive (e.g. a WotLK patch). */
  readFromMpq(archivePath: string, fileName: string, table: string): ParsedDbc {
    return this.parse(this.mpq.read(archivePath, fileName), table);
  }

  /** Serialize rows and write them back into the MPQ archive as `fileName`. */
  writeToMpq(archivePath: string, fileName: string, table: string, rows: DbcRow[]): void {
    this.mpq.write(archivePath, fileName, this.serialize(table, rows));
  }
}
