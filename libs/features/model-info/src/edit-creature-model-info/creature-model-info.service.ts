import { Injectable, inject } from '@angular/core';
import { SingleRowEditorService } from '@keira/shared/base-abstract-classes';
import { CREATURE_MODEL_INFO_ID, CREATURE_MODEL_INFO_TABLE, CreatureModelInfo } from '@keira/shared/acore-world-model';
import { CreatureModelInfoHandlerService } from '../creature-model-info-handler.service';

@Injectable({
  providedIn: 'root',
})
export class CreatureModelInfoService extends SingleRowEditorService<CreatureModelInfo> {
  protected override readonly handlerService = inject(CreatureModelInfoHandlerService);
  protected override _entityClass = CreatureModelInfo;
  protected override _entityTable = CREATURE_MODEL_INFO_TABLE;
  protected override _entityIdField = CREATURE_MODEL_INFO_ID;
  protected override isMainEntity = true;

  constructor() {
    super();
    this.init();
  }
}
