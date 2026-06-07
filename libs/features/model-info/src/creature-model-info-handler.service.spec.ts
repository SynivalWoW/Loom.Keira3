import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { CreatureModelInfoHandlerService } from './creature-model-info-handler.service';

describe('CreatureModelInfoHandlerService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [provideZonelessChangeDetection(), provideNoopAnimations(), CreatureModelInfoHandlerService],
    }),
  );

  it('should be created', () => {
    const service: CreatureModelInfoHandlerService = TestBed.inject(CreatureModelInfoHandlerService);
    expect(service).toBeTruthy();
    expect(service.isCreatureModelInfoUnsaved()).toBe(false);
  });
});
