import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SelectComponent } from '@keira/shared/base-abstract-classes';
import {
  PLAYER_SHAPESHIFT_MODEL_CUSTOM_STARTING_ID,
  PLAYER_SHAPESHIFT_MODEL_ID,
  PLAYER_SHAPESHIFT_MODEL_TABLE,
  PlayerShapeshiftModel,
} from '@keira/shared/acore-world-model';
import { NgxDatatableModule } from '@siemens/ngx-datatable';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CreateComponent, HighlightjsWrapperComponent, TopBarComponent } from '@keira/shared/base-editor-components';
import { ShapeshiftHandlerService } from '../shapeshift-handler.service';
import { SelectShapeshiftService } from './select-shapeshift.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './select-shapeshift.component.html',
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
export class SelectShapeshiftComponent extends SelectComponent<PlayerShapeshiftModel> {
  protected override readonly entityTable = PLAYER_SHAPESHIFT_MODEL_TABLE;
  protected override readonly entityIdField = PLAYER_SHAPESHIFT_MODEL_ID;
  readonly customStartingId = PLAYER_SHAPESHIFT_MODEL_CUSTOM_STARTING_ID;
  protected readonly selectService = inject(SelectShapeshiftService);
  readonly handlerService = inject(ShapeshiftHandlerService);
}
