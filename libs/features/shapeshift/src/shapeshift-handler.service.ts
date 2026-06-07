import { Injectable, signal, Signal } from '@angular/core';
import { HandlerService } from '@keira/shared/base-abstract-classes';
import { PLAYER_SHAPESHIFT_MODEL_TABLE, PlayerShapeshiftModel } from '@keira/shared/acore-world-model';

@Injectable({
  providedIn: 'root',
})
export class ShapeshiftHandlerService extends HandlerService<PlayerShapeshiftModel> {
  protected readonly mainEditorRoutePath = 'shapeshift/form';

  get isShapeshiftModelUnsaved(): Signal<boolean> {
    return this.statusMap[PLAYER_SHAPESHIFT_MODEL_TABLE].asReadonly();
  }

  protected _statusMap = {
    [PLAYER_SHAPESHIFT_MODEL_TABLE]: signal(false),
  };
}
