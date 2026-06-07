import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlayerShapeshiftModel } from '@keira/shared/acore-world-model';
import { MultiRowEditorComponent } from '@keira/shared/base-abstract-classes';
import { EditorButtonsComponent, QueryOutputComponent, TopBarComponent } from '@keira/shared/base-editor-components';
import { TranslateModule } from '@ngx-translate/core';
import { NgxDatatableModule } from '@siemens/ngx-datatable';
import { ShapeshiftModelService } from './shapeshift-model.service';
import { ShapeshiftHandlerService } from '../shapeshift-handler.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'keira-shapeshift-model',
  templateUrl: './shapeshift-model.component.html',
  imports: [
    TopBarComponent,
    TranslateModule,
    QueryOutputComponent,
    FormsModule,
    ReactiveFormsModule,
    EditorButtonsComponent,
    NgxDatatableModule,
  ],
})
export class ShapeshiftModelComponent extends MultiRowEditorComponent<PlayerShapeshiftModel> {
  protected override readonly editorService = inject(ShapeshiftModelService);
  protected readonly handlerService = inject(ShapeshiftHandlerService);
}
