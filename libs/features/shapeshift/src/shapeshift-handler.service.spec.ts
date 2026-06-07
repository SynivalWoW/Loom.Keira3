import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { ShapeshiftHandlerService } from './shapeshift-handler.service';

describe('ShapeshiftHandlerService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [provideZonelessChangeDetection(), provideNoopAnimations(), ShapeshiftHandlerService],
    }),
  );

  it('should be created', () => {
    const service = TestBed.inject(ShapeshiftHandlerService);
    expect(service).toBeTruthy();
    expect(service.isShapeshiftModelUnsaved()).toBe(false);
  });
});
