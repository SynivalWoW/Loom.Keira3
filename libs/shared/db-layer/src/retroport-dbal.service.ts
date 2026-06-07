import { inject, Injectable } from '@angular/core';
import {
  ItemTemplate,
  ITEM_TEMPLATE_TABLE,
  ITEM_TEMPLATE_ID,
  ITEM_TEMPLATE_CUSTOM_STARTING_ID,
  PlayerShapeshiftModel,
  PLAYER_SHAPESHIFT_MODEL_TABLE,
  PLAYER_SHAPESHIFT_MODEL_ID,
} from '@keira/shared/acore-world-model';

import { MysqlQueryService } from './query/mysql-query.service';
import { RealmEnvironment, REALM_WORLD_DB } from './realm-environment';

/** The payload produced by a successful retroport: a minted display id + model metadata. */
export interface RetroportPayload {
  displayId: number;
  // item_template fields
  itemEntry?: number;
  itemName?: string;
  itemClass?: number;
  itemSubclass?: number;
  inventoryType?: number;
  // player_shapeshift_model fields
  shapeshiftId?: number;
  raceId?: number;
  customizationId?: number;
  genderId?: number;
}

/**
 * Environment-aware DBAL. Generates (does NOT execute) realm-qualified SQL for the two tables a
 * retroport touches. The Live/PTR toggle swaps `acore_world`/`acoreptr_world` (world-DB) and
 * `acore_characters`/`acoreptr_characters` (characters-DB). The generated SQL is previewed in
 * the dashboard's query-output and executed through Keira3's existing connection.
 */
@Injectable({
  providedIn: 'root',
})
export class RetroportDbalService {
  private readonly queryService = inject(MysqlQueryService);

  buildItemTemplate(payload: RetroportPayload, realm: RealmEnvironment): string {
    const row = new ItemTemplate();
    row.entry = payload.itemEntry ?? ITEM_TEMPLATE_CUSTOM_STARTING_ID;
    row.name = payload.itemName ?? '';
    row.displayid = payload.displayId;
    row.class = payload.itemClass ?? 0;
    row.subclass = payload.itemSubclass ?? 0;
    row.InventoryType = payload.inventoryType ?? 0;

    const sql = this.queryService.getFullDeleteInsertQuery<ItemTemplate>(ITEM_TEMPLATE_TABLE, [row], ITEM_TEMPLATE_ID);
    return this.qualify(sql, ITEM_TEMPLATE_TABLE, REALM_WORLD_DB[realm]);
  }

  insertShapeshiftModel(payload: RetroportPayload, realm: RealmEnvironment): string {
    const row = new PlayerShapeshiftModel();
    row.ShapeshiftID = payload.shapeshiftId ?? 0;
    row.RaceID = payload.raceId ?? 0;
    row.CustomizationID = payload.customizationId ?? 0;
    row.GenderID = payload.genderId ?? 0;
    row.DisplayID = payload.displayId;

    const sql = this.queryService.getFullDeleteInsertQuery<PlayerShapeshiftModel>(
      PLAYER_SHAPESHIFT_MODEL_TABLE,
      [row],
      PLAYER_SHAPESHIFT_MODEL_ID,
    );
    // player_shapeshift_model is a WORLD-DB table (per the CoffingQuest audit), like item_template.
    return this.qualify(sql, PLAYER_SHAPESHIFT_MODEL_TABLE, REALM_WORLD_DB[realm]);
  }

  /**
   * Prefix the schema onto every (backtick-quoted) occurrence of the table token. We post-process
   * the squel output instead of passing a dotted name to `.into()` because `autoQuoteTableNames`
   * would otherwise emit a single mis-quoted identifier (`` `acore_world.item_template` ``).
   * `split().join()` (not `replace`) is deliberate so BOTH the DELETE and INSERT tokens are hit.
   */
  private qualify(sql: string, table: string, db: string): string {
    return sql.split('`' + table + '`').join('`' + db + '`.`' + table + '`');
  }
}
