import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileDialogService } from '@keira/shared/common-services';
import { DBC_TABLE_NAMES, DbcCell, DbcFieldDef, DbcFileService, DbcRow, groupColumns } from '@keira/shared/db-layer';
import { TranslateModule } from '@ngx-translate/core';

const ALL_TAB = 'All';

/**
 * In-GUI binary DBC editor for the retroport + spell tables, driven by the 3.3.5a (12340) column
 * definitions. Open a .dbc, edit/add/delete rows in a grid, save back to the .dbc — so the whole
 * DBC+SQL display chain (and Spell.dbc) can be managed without leaving Keira3.
 *
 * A .dbc can also be opened straight out of a WotLK patch MPQ: pick the archive, point the path
 * field at the file inside it (e.g. DBFilesClient\CreatureModelData.dbc), and saving writes it back
 * into the same archive. Wide tables (e.g. Spell.dbc, 234 columns) expose tabs that filter the grid
 * to one field group at a time.
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
  protected mpqPath = '';
  protected readonly fields = signal<DbcFieldDef[]>([]);
  protected readonly rows = signal<DbcRow[]>([]);
  protected readonly status = signal<string>('');
  protected readonly groups = signal<{ name: string; columns: DbcFieldDef[] }[] | null>(null);
  protected readonly activeTab = signal<string>(ALL_TAB);

  /** Tab labels for the loaded table (empty when the table has no groups). */
  protected readonly tabs = computed(() => {
    const groups = this.groups();
    return groups ? [ALL_TAB, ...groups.map((g) => g.name)] : [];
  });

  /** Columns shown in the grid: every column on the "All" tab, otherwise just the active group's. */
  protected readonly visibleFields = computed(() => {
    const groups = this.groups();
    const tab = this.activeTab();
    if (!groups || tab === ALL_TAB) {
      return this.fields();
    }
    return groups.find((g) => g.name === tab)?.columns ?? this.fields();
  });

  private readonly dbcFile = inject(DbcFileService);
  private readonly fileDialog = inject(FileDialogService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  protected async browse(): Promise<void> {
    const path = await this.fileDialog.pickFile([{ name: 'DBC', extensions: ['dbc'] }]);
    if (path) {
      this.dbcPath = path;
      this.changeDetectorRef.markForCheck();
    }
  }

  protected async browseMpq(): Promise<void> {
    const path = await this.fileDialog.pickFile([{ name: 'MPQ', extensions: ['mpq', 'MPQ'] }]);
    if (path) {
      this.mpqPath = path;
      this.changeDetectorRef.markForCheck();
    }
  }

  protected load(): void {
    try {
      // With an MPQ archive selected, the path field names the file inside it (e.g. DBFilesClient\Foo.dbc).
      const parsed = this.mpqPath
        ? this.dbcFile.readFromMpq(this.mpqPath, this.dbcPath, this.table)
        : this.dbcFile.read(this.dbcPath, this.table);
      this.fields.set(parsed.fields);
      this.rows.set(parsed.rows);
      this.groups.set(groupColumns(this.table));
      this.activeTab.set(ALL_TAB);
      this.status.set(`Loaded ${parsed.rows.length} rows from ${this.table}`);
    } catch (e) {
      this.fields.set([]);
      this.rows.set([]);
      this.groups.set(null);
      this.status.set(`Error: ${(e as Error).message}`);
    }
  }

  protected selectTab(tab: string): void {
    this.activeTab.set(tab);
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
      if (this.mpqPath) {
        this.dbcFile.writeToMpq(this.mpqPath, this.dbcPath, this.table, this.rows());
        this.status.set(`Saved ${this.rows().length} rows to ${this.dbcPath} in ${this.mpqPath}`);
      } else {
        this.dbcFile.write(this.dbcPath, this.table, this.rows());
        this.status.set(`Saved ${this.rows().length} rows to ${this.dbcPath}`);
      }
    } catch (e) {
      this.status.set(`Error: ${(e as Error).message}`);
    }
  }
}
