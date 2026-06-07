import { Injectable, inject } from '@angular/core';
import { SelectService } from '@keira/shared/base-abstract-classes';
import { MysqlQueryService } from '@keira/shared/db-layer';
import {
  CREATURE_MODEL_INFO_ID,
  CREATURE_MODEL_INFO_SEARCH_FIELDS,
  CREATURE_MODEL_INFO_TABLE,
  CreatureModelInfo,
} from '@keira/shared/acore-world-model';
import { CreatureModelInfoHandlerService } from '../creature-model-info-handler.service';

@Injectable({
  providedIn: 'root',
})
export class SelectCreatureModelInfoService extends SelectService<CreatureModelInfo> {
  override readonly queryService = inject(MysqlQueryService);
  override readonly handlerService = inject(CreatureModelInfoHandlerService);
  protected override readonly entityTable = CREATURE_MODEL_INFO_TABLE;
  protected override readonly entityIdField = CREATURE_MODEL_INFO_ID;
  protected override readonly fieldList = CREATURE_MODEL_INFO_SEARCH_FIELDS;

  constructor() {
    super();
    this.init();
  }
}
