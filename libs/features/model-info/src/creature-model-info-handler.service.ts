import { Injectable, signal, Signal } from '@angular/core';
import { HandlerService } from '@keira/shared/base-abstract-classes';
import { CREATURE_MODEL_INFO_TABLE, CreatureModelInfo } from '@keira/shared/acore-world-model';

@Injectable({
  providedIn: 'root',
})
export class CreatureModelInfoHandlerService extends HandlerService<CreatureModelInfo> {
  protected readonly mainEditorRoutePath = 'model-info/model';

  get isCreatureModelInfoUnsaved(): Signal<boolean> {
    return this.statusMap[CREATURE_MODEL_INFO_TABLE].asReadonly();
  }

  protected _statusMap = {
    [CREATURE_MODEL_INFO_TABLE]: signal(false),
  };
}
