import { Injectable, inject } from '@angular/core';
import { SelectService } from '@keira/shared/base-abstract-classes';
import { MysqlQueryService } from '@keira/shared/db-layer';
import {
  PLAYER_SHAPESHIFT_MODEL_ID,
  PLAYER_SHAPESHIFT_MODEL_SEARCH_FIELDS,
  PLAYER_SHAPESHIFT_MODEL_TABLE,
  PlayerShapeshiftModel,
} from '@keira/shared/acore-world-model';
import { ShapeshiftHandlerService } from '../shapeshift-handler.service';

@Injectable({
  providedIn: 'root',
})
export class SelectShapeshiftService extends SelectService<PlayerShapeshiftModel> {
  override readonly queryService = inject(MysqlQueryService);
  override readonly handlerService = inject(ShapeshiftHandlerService);
  protected override readonly entityTable = PLAYER_SHAPESHIFT_MODEL_TABLE;
  protected override readonly entityIdField = PLAYER_SHAPESHIFT_MODEL_ID;
  protected override readonly fieldList = PLAYER_SHAPESHIFT_MODEL_SEARCH_FIELDS;

  constructor() {
    super();
    this.init();
  }
}
