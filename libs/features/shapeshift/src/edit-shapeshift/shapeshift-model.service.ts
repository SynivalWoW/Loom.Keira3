import { Injectable, inject } from '@angular/core';
import { MultiRowEditorService } from '@keira/shared/base-abstract-classes';
import {
  PLAYER_SHAPESHIFT_MODEL_GENDER,
  PLAYER_SHAPESHIFT_MODEL_ID,
  PLAYER_SHAPESHIFT_MODEL_RACE,
  PLAYER_SHAPESHIFT_MODEL_TABLE,
  PlayerShapeshiftModel,
} from '@keira/shared/acore-world-model';
import { ShapeshiftHandlerService } from '../shapeshift-handler.service';

/**
 * Multi-row editor for player_shapeshift_model, keyed by ShapeshiftID (the druid form). The full
 * query replaces all rows for the form (DELETE WHERE ShapeshiftID = ?); the per-row identity is
 * RaceID + GenderID (CustomizationID is editable but, like AzerothCore's stock layout, usually 0).
 */
@Injectable({
  providedIn: 'root',
})
export class ShapeshiftModelService extends MultiRowEditorService<PlayerShapeshiftModel> {
  protected override readonly handlerService = inject(ShapeshiftHandlerService);
  protected override readonly _entityClass = PlayerShapeshiftModel;
  protected override readonly _entityTable = PLAYER_SHAPESHIFT_MODEL_TABLE;
  protected override readonly _entityIdField = PLAYER_SHAPESHIFT_MODEL_ID;
  protected override readonly _entitySecondIdField = PLAYER_SHAPESHIFT_MODEL_RACE;
  protected override readonly _entityExtraIdField = PLAYER_SHAPESHIFT_MODEL_GENDER;

  constructor() {
    super();
    this.init();
  }
}
