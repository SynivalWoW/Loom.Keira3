import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DBC_TABLE_NAMES, DbcCell, DbcFieldDef, DbcFileService, DbcRow } from '@keira/shared/db-layer';
import { TranslateModule } from '@ngx-translate/core';

/**
 * In-GUI binary DBC editor for the retroport tables (CreatureDisplayInfo / CreatureModelData),
 * driven by the WDBX 12340 column definitions. Open a .dbc, edit/add/delete rows in a grid, save
 * back to the .dbc — so the whole DBC+SQL display chain can be managed without leaving Keira3.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'keira-dbc-editor',
  templateUrl: './dbc-editor.component.html',
  styleUrls: ['./dbc-editor.component.scss'],
  imports: [TranslateModule, FormsModule],
})
export class DbcEditorComponent {
  protected readonly tables = DBC_TABLE_NAMES;
  protected table = DBC_TABLE_NAMES[0];
  protected dbcPath = '';
  protected readonly fields = signal<DbcFieldDef[]>([]);
  protected readonly rows = signal<DbcRow[]>([]);
  protected readonly status = signal<string>('');

  private readonly dbcFile = inject(DbcFileService);

  protected load(): void {
    try {
      const parsed = this.dbcFile.read(this.dbcPath, this.table);
      this.fields.set(parsed.fields);
      this.rows.set(parsed.rows);
      this.status.set(`Loaded ${parsed.rows.length} rows from ${this.table}`);
    } catch (e) {
      this.fields.set([]);
      this.rows.set([]);
      this.status.set(`Error: ${(e as Error).message}`);
    }
  }

  protected setCell(rowIndex: number, field: string, value: DbcCell): void {
    this.rows.update((rows) => rows.map((row, i) => (i === rowIndex ? { ...row, [field]: value } : row)));
  }

  protected addRow(): void {
    const blank: DbcRow = {};
    for (const field of this.fields()) {
      blank[field.name] = field.type === 'string' ? '' : 0;
    }
    this.rows.update((rows) => [...rows, blank]);
  }

  protected deleteRow(rowIndex: number): void {
    this.rows.update((rows) => rows.filter((_, i) => i !== rowIndex));
  }

  protected save(): void {
    try {
      this.dbcFile.write(this.dbcPath, this.table, this.rows());
      this.status.set(`Saved ${this.rows().length} rows to ${this.dbcPath}`);
    } catch (e) {
      this.status.set(`Error: ${(e as Error).message}`);
    }
  }
}
