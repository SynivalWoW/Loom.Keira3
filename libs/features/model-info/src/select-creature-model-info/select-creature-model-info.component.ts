import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SelectComponent } from '@keira/shared/base-abstract-classes';
import {
  CREATURE_MODEL_INFO_CUSTOM_STARTING_ID,
  CREATURE_MODEL_INFO_ID,
  CREATURE_MODEL_INFO_TABLE,
  CreatureModelInfo,
} from '@keira/shared/acore-world-model';
import { NgxDatatableModule } from '@siemens/ngx-datatable';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CreateComponent, HighlightjsWrapperComponent, TopBarComponent } from '@keira/shared/base-editor-components';
import { CreatureModelInfoHandlerService } from '../creature-model-info-handler.service';
import { SelectCreatureModelInfoService } from './select-creature-model-info.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './select-creature-model-info.component.html',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgxDatatableModule,
    CreateComponent,
    HighlightjsWrapperComponent,
    TopBarComponent,
  ],
})
export class SelectCreatureModelInfoComponent extends SelectComponent<CreatureModelInfo> {
  protected override readonly entityTable = CREATURE_MODEL_INFO_TABLE;
  protected override readonly entityIdField = CREATURE_MODEL_INFO_ID;
  readonly customStartingId = CREATURE_MODEL_INFO_CUSTOM_STARTING_ID;
  protected readonly selectService = inject(SelectCreatureModelInfoService);
  readonly handlerService = inject(CreatureModelInfoHandlerService);
}
