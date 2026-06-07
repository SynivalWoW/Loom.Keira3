import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CreatureModelInfo } from '@keira/shared/acore-world-model';
import { SingleRowEditorComponent } from '@keira/shared/base-abstract-classes';
import { QueryOutputComponent } from '@keira/shared/base-editor-components';
import { TranslateModule } from '@ngx-translate/core';
import { CreatureModelInfoService } from './creature-model-info.service';
import { CreatureModelInfoHandlerService } from '../creature-model-info-handler.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'keira-creature-model-info',
  templateUrl: './creature-model-info.component.html',
  imports: [TranslateModule, FormsModule, ReactiveFormsModule, QueryOutputComponent],
})
export class CreatureModelInfoComponent extends SingleRowEditorComponent<CreatureModelInfo> {
  protected override readonly editorService = inject(CreatureModelInfoService);
  protected readonly handlerService = inject(CreatureModelInfoHandlerService);
}
